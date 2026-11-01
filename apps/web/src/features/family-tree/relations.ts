import type { Family, FamilyTree, Individual } from "@kakeizu/gedcom";
import { displayName } from "./layout";

export type SpouseFamily = { familyId: string; partner?: Individual };

/** 配偶者として属する家族と、その家族での相手 */
export const spouseFamiliesOf = (tree: FamilyTree, id: string): SpouseFamily[] => {
  const person = tree.individuals.find((i) => i.id === id);
  return (person?.familiesAsSpouse ?? []).flatMap(({ id: familyId }) => {
    const family = tree.families.find((f) => f.id === familyId);
    if (!family) return [];
    const partnerId = family.husband?.id === id ? family.wife?.id : family.husband?.id;
    return [{ familyId, partner: tree.individuals.find((i) => i.id === partnerId) }];
  });
};

/** 家族の親の名前("夫・妻"。片親ならその人のみ) */
export const parentNamesOf = (tree: FamilyTree, family: Family): string =>
  [family.husband, family.wife]
    .flatMap((link) => tree.individuals.find((i) => i.id === link?.id) ?? [])
    .map(displayName)
    .join("・");
