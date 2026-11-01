import { adoptionLink, linkPedigree, type Family, type FamilyTree, type Pedigree } from "../model";
import { addParentTo, type AddResult, type ParentRole } from "./add";
import { TreeOperationError } from "./errors";
import type { PersonInput } from "./input";
import { getFamily, getIndividual, link, replaceFamily, replaceIndividual } from "./tree";

/** 養子縁組の種類 */
export type AdoptionKind = Exclude<Pedigree, "birth">;

const isMember = (family: Family, id: string): boolean =>
  [family.husband, family.wife, ...family.children].some((l) => l?.id === id);

/** 既存の人物の養子にできる家族。親が1人以上いて、本人が配偶者・子として属していない家族 */
export const adoptableFamilies = (tree: FamilyTree, childId: string): Family[] => {
  getIndividual(tree, childId);
  return tree.families.filter((f) => (f.husband || f.wife) && !isMember(f, childId));
};

/** 既存の家族の養子にする(婿養子・連れ子の縁組・孫養子など) */
export const adoptInto = (tree: FamilyTree, childId: string, familyId: string, kind: AdoptionKind): FamilyTree => {
  const family = getFamily(tree, familyId);
  if (!adoptableFamilies(tree, childId).includes(family)) {
    throw new TreeOperationError(`${childId} は家族 ${familyId} の養子にできません`);
  }
  const child = getIndividual(tree, childId);
  const next = replaceFamily(tree, { ...family, children: [...family.children, link(childId)] });
  return replaceIndividual(next, {
    ...child,
    familiesAsChild: [...child.familiesAsChild, adoptionLink(familyId, kind)],
  });
};

/** 養親の枠が空いている養子縁組の家族と、空いている続柄 */
export const vacantAdoptiveFamilies = (
  tree: FamilyTree,
  childId: string,
): { family: Family; role: ParentRole; kind: AdoptionKind }[] =>
  getIndividual(tree, childId).familiesAsChild.flatMap((l) => {
    const kind = linkPedigree(l);
    if (kind === "birth") return [];
    const family = getFamily(tree, l.id);
    if (family.husband && family.wife) return [];
    return [{ family, role: family.husband ? "mother" : "father", kind }];
  });

/**
 * 養親を新しい人物として追加する。
 * familyId 指定時は養親の枠が空いた養子縁組の家族に、未指定時は kind の縁組で新しい家族を作る
 */
export const addAdoptiveParent = (
  tree: FamilyTree,
  childId: string,
  target: { familyId: string } | { kind: AdoptionKind },
  role: ParentRole,
  input: PersonInput,
): AddResult => {
  if ("kind" in target) {
    return addParentTo(tree, childId, undefined, role, input, (id) => adoptionLink(id, target.kind));
  }
  const vacant = vacantAdoptiveFamilies(tree, childId).find((v) => v.family.id === target.familyId);
  if (!vacant) {
    throw new TreeOperationError(`家族 ${target.familyId} は ${childId} の養親の枠が空いた家族ではありません`);
  }
  return addParentTo(tree, childId, vacant.family, role, input, link);
};
