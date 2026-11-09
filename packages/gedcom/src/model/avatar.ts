import type { GedcomNode } from "../syntax";
import type { FamilyTree, Individual } from "./types";

/** 人物の写真(アバター)。GEDCOM の OBJE レコードに data URI で埋め込んだ画像 */
export type Avatar = {
  /** OBJE レコードの xref */
  objectId: string;
  /** `data:image/...` 形式の画像 */
  dataUri: string;
};

const DATA_IMAGE = /^data:image\/[\w.+-]+;base64,/;

/** OBJE レコードの最初の FILE が data URI の画像なら、その値 */
export const embeddedImageOf = (record: GedcomNode): string | undefined => {
  if (record.tag !== "OBJE") return undefined;
  const file = record.children.find((c) => c.tag === "FILE")?.value;
  return file !== undefined && DATA_IMAGE.test(file) ? file : undefined;
};

/** 人物が参照する OBJE のうち、最初の data URI 画像をアバターとする */
const avatarFrom = (individual: Individual, records: Map<string, GedcomNode>): Avatar | undefined => {
  for (const node of individual.extras) {
    if (node.tag !== "OBJE" || node.pointer === undefined) continue;
    const record = records.get(node.pointer);
    const dataUri = record && embeddedImageOf(record);
    if (dataUri) return { objectId: node.pointer, dataUri };
  }
  return undefined;
};

const objectRecords = (tree: FamilyTree): Map<string, GedcomNode> =>
  new Map(tree.extraRecords.flatMap((r) => (r.tag === "OBJE" && r.xref ? [[r.xref, r] as const] : [])));

/** 人物ごとのアバター(アバターのある人物のみ) */
export const avatarsOf = (tree: FamilyTree): Map<string, Avatar> => {
  const records = objectRecords(tree);
  const avatars = new Map<string, Avatar>();
  for (const individual of tree.individuals) {
    const avatar = avatarFrom(individual, records);
    if (avatar) avatars.set(individual.id, avatar);
  }
  return avatars;
};

export const avatarOf = (tree: FamilyTree, individualId: string): Avatar | undefined => {
  const individual = tree.individuals.find((i) => i.id === individualId);
  return individual && avatarFrom(individual, objectRecords(tree));
};
