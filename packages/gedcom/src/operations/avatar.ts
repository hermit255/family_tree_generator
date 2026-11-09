import { avatarOf, embeddedImageOf, type FamilyTree } from "../model";
import type { GedcomNode } from "../syntax";
import { TreeOperationError } from "./errors";
import { getIndividual, nextId, replaceIndividual } from "./tree";

const DATA_IMAGE = /^data:(image\/[\w.+-]+);base64,[A-Za-z0-9+/]+=*$/;

const collectPointers = (nodes: GedcomNode[], out: Set<string>): void => {
  for (const node of nodes) {
    if (node.pointer !== undefined) out.add(node.pointer);
    collectPointers(node.children, out);
  }
};

/** 家系図のどこかから参照されている xref */
const referencedIds = (tree: FamilyTree): Set<string> => {
  const out = new Set<string>();
  const links = (ls: ({ extras: GedcomNode[] } | undefined)[]) => ls.flatMap((l) => l?.extras ?? []);
  collectPointers(tree.header.extras, out);
  for (const s of tree.submitters) collectPointers(s.extras, out);
  for (const i of tree.individuals) {
    collectPointers([...i.nameExtras, ...i.extras, ...links([...i.familiesAsSpouse, ...i.familiesAsChild])], out);
  }
  for (const f of tree.families) {
    collectPointers([...f.extras, ...links([f.husband, f.wife, ...f.children])], out);
  }
  collectPointers(tree.extraRecords, out);
  return out;
};

/** 候補のうち、どこからも参照されなくなったアバター用(data URI 画像)の OBJE レコードを削除する */
export const pruneAvatarObjects = (tree: FamilyTree, candidates: string[]): FamilyTree => {
  const referenced = referencedIds(tree);
  const unused = new Set(candidates.filter((id) => !referenced.has(id)));
  if (unused.size === 0) return tree;
  return {
    ...tree,
    extraRecords: tree.extraRecords.filter((r) => !(r.xref && unused.has(r.xref) && embeddedImageOf(r))),
  };
};

/**
 * 人物の写真を設定する。data URI 画像を新しい OBJE レコードとして追加し、人物から参照する。
 * 既存の写真は差し替える(参照の位置は維持し、使われなくなった OBJE レコードは削除する)
 */
export const setAvatar = (tree: FamilyTree, individualId: string, dataUri: string): FamilyTree => {
  const individual = getIndividual(tree, individualId);
  const mediaType = DATA_IMAGE.exec(dataUri)?.[1];
  if (mediaType === undefined) throw new TreeOperationError("写真の形式が不正です");

  const objectId = nextId(tree, "O");
  const record: GedcomNode = {
    tag: "OBJE",
    xref: objectId,
    children: [{ tag: "FILE", value: dataUri, children: [{ tag: "FORM", value: mediaType, children: [] }] }],
  };
  const pointer: GedcomNode = { tag: "OBJE", pointer: objectId, children: [] };
  const current = avatarOf(tree, individualId);
  const extras = current
    ? individual.extras.map((n) => (n.tag === "OBJE" && n.pointer === current.objectId ? pointer : n))
    : [pointer, ...individual.extras];

  const updated = replaceIndividual({ ...tree, extraRecords: [...tree.extraRecords, record] }, { ...individual, extras });
  return current ? pruneAvatarObjects(updated, [current.objectId]) : updated;
};

/** 人物の写真を外す(写真が無ければ何もしない)。使われなくなった OBJE レコードは削除する */
export const removeAvatar = (tree: FamilyTree, individualId: string): FamilyTree => {
  const individual = getIndividual(tree, individualId);
  const current = avatarOf(tree, individualId);
  if (!current) return tree;
  const extras = individual.extras.filter((n) => !(n.tag === "OBJE" && n.pointer === current.objectId));
  return pruneAvatarObjects(replaceIndividual(tree, { ...individual, extras }), [current.objectId]);
};
