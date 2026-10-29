import { findRootId, type Family, type FamilyTree } from "../model";
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

/** 人物を取り除き、メンバーが0人になった家族を削除する(可否は判定しない) */
const removeIndividual = (tree: FamilyTree, id: string): FamilyTree => {
  const isOther = (l: { id: string } | undefined) => l?.id !== id;
  const families = tree.families
    .map((f) => ({
      ...f,
      husband: isOther(f.husband) ? f.husband : undefined,
      wife: isOther(f.wife) ? f.wife : undefined,
      children: f.children.filter(isOther),
    }))
    .filter((f) => membersOf(f).length > 0);
  return { ...tree, individuals: tree.individuals.filter(isOther), families };
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
  return removeIndividual(tree, id);
};
