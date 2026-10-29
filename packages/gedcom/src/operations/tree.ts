import type { Family, FamilyTree, Individual, Link, Sex } from "../model";
import { TreeOperationError } from "./errors";
import type { ValidPersonInput } from "./input";

export type SpouseSlot = "husband" | "wife";

export const link = (id: string): Link => ({ id, extras: [] });

export const getIndividual = (tree: FamilyTree, id: string): Individual => {
  const individual = tree.individuals.find((i) => i.id === id);
  if (!individual) throw new TreeOperationError(`人物 ${id} が存在しません`);
  return individual;
};

export const getFamily = (tree: FamilyTree, id: string): Family => {
  const family = tree.families.find((f) => f.id === id);
  if (!family) throw new TreeOperationError(`家族 ${id} が存在しません`);
  return family;
};

export const replaceIndividual = (tree: FamilyTree, individual: Individual): FamilyTree => ({
  ...tree,
  individuals: tree.individuals.map((i) => (i.id === individual.id ? individual : i)),
});

export const replaceFamily = (tree: FamilyTree, family: Family): FamilyTree => ({
  ...tree,
  families: tree.families.map((f) => (f.id === family.id ? family : f)),
});

/** 新しい家族での枠: SEX が F なら WIFE、それ以外は HUSB */
export const slotFor = (sex: Sex | undefined): SpouseSlot => (sex === "F" ? "wife" : "husband");

export const otherSlot = (slot: SpouseSlot): SpouseSlot => (slot === "husband" ? "wife" : "husband");

export const newIndividual = (id: string, input: ValidPersonInput, links: Partial<Individual> = {}): Individual => ({
  id,
  givenName: input.givenName,
  surname: input.surname,
  nameExtras: [],
  sex: input.sex,
  familiesAsSpouse: [],
  familiesAsChild: [],
  extras: [],
  ...links,
});

/** `{prefix}{n}` 形式の既存 xref の最大番号 + 1 */
export const nextId = (tree: FamilyTree, prefix: "I" | "F"): string => {
  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  const ids = [
    ...tree.submitters,
    ...tree.individuals,
    ...tree.families,
    ...tree.extraRecords.map((r) => ({ id: r.xref ?? "" })),
  ].map((r) => r.id);
  const max = Math.max(0, ...ids.map((id) => Number(pattern.exec(id)?.[1] ?? 0)));
  return `${prefix}${max + 1}`;
};
