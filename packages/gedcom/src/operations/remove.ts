import { findRootId, linkPedigree, type Family, type FamilyTree } from "../model";
import { pruneAvatarObjects } from "./avatar";
import { TreeOperationError } from "./errors";
import { getIndividual } from "./tree";

export type DeleteCheck = { ok: true } | { ok: false; reason: string };

const membersOf = (family: Family): string[] =>
  [family.husband, family.wife, ...family.children].flatMap((l) => (l ? [l.id] : []));

/** 同じ家族のメンバー同士をつながりとみなした連結成分数 */
const countComponents = (tree: FamilyTree): number => {
  const parents = new Map(tree.individuals.map((i) => [i.id, i.id]));
  const find = (id: string): string => {
    let current = id;
    while (parents.get(current) !== current) current = parents.get(current)!;
    return current;
  };
  for (const family of tree.families) {
    const [first, ...rest] = membersOf(family);
    for (const member of rest) parents.set(find(member), find(first!));
  }
  return tree.individuals.filter((i) => find(i.id) === i.id).length;
};

/** 家族 familyIds への養子縁組(子の FAMC が実子以外)を解消する。縁組の家族から子を外し、子の FAMC を除く */
const dissolveAdoptions = (tree: FamilyTree, familyIds: Set<string>): FamilyTree => {
  const isAdoption = (familyId: string, childId: string): boolean => {
    if (!familyIds.has(familyId)) return false;
    const link = tree.individuals.find((i) => i.id === childId)?.familiesAsChild.find((l) => l.id === familyId);
    return link !== undefined && linkPedigree(link) !== "birth";
  };
  return {
    ...tree,
    individuals: tree.individuals.map((i) => ({
      ...i,
      familiesAsChild: i.familiesAsChild.filter((l) => !isAdoption(l.id, i.id)),
    })),
    families: tree.families.map((f) => ({ ...f, children: f.children.filter((c) => !isAdoption(f.id, c.id)) })),
  };
};

/**
 * 人物を取り除き、メンバーが0人になった家族を削除する(可否は判定しない)。
 * 取り除いた人物が最後の養親だった養子縁組は解消し、原状に戻す(特別養子で線を引かなくなった実親と再びつながる)
 */
const removeIndividual = (tree: FamilyTree, id: string): FamilyTree => {
  const isOther = (l: { id: string } | undefined) => l?.id !== id;
  const families = tree.families.map((f) => ({
    ...f,
    husband: isOther(f.husband) ? f.husband : undefined,
    wife: isOther(f.wife) ? f.wife : undefined,
    children: f.children.filter(isOther),
  }));
  // 取り除く人物だけが親だった家族
  const vacated = new Set(
    tree.families
      .filter((f) => {
        const parents = [f.husband, f.wife].flatMap((l) => (l ? [l.id] : []));
        return parents.length > 0 && parents.every((p) => p === id);
      })
      .map((f) => f.id),
  );
  const removed = dissolveAdoptions({ ...tree, individuals: tree.individuals.filter(isOther), families }, vacated);
  return { ...removed, families: removed.families.filter((f) => membersOf(f).length > 0) };
};

export const canDeleteIndividual = (tree: FamilyTree, id: string): DeleteCheck => {
  getIndividual(tree, id);
  if (id === findRootId(tree)) {
    return { ok: false, reason: "起点ノードは削除できません" };
  }
  if (countComponents(removeIndividual(tree, id)) > countComponents(tree)) {
    return { ok: false, reason: "削除すると家系図が分断されるため削除できません" };
  }
  return { ok: true };
};

export const deleteIndividual = (tree: FamilyTree, id: string): FamilyTree => {
  const check = canDeleteIndividual(tree, id);
  if (!check.ok) throw new TreeOperationError(check.reason);
  // 削除した人物だけが参照していた写真の OBJE レコードも削除する
  const objects = getIndividual(tree, id).extras.flatMap((n) => (n.tag === "OBJE" && n.pointer ? [n.pointer] : []));
  return pruneAvatarObjects(removeIndividual(tree, id), objects);
};
