import type { Family, FamilyTree } from "../model";
import { TreeOperationError } from "./errors";
import { parsePersonInput, type PersonInput } from "./input";
import {
  getFamily,
  getIndividual,
  link,
  newIndividual,
  nextId,
  otherSlot,
  replaceFamily,
  replaceIndividual,
  slotFor,
  type SpouseSlot,
} from "./tree";

export type AddResult = { tree: FamilyTree; individualId: string };
export type ParentRole = "father" | "mother";

const PARENT_SLOT: Record<ParentRole, SpouseSlot> = { father: "husband", mother: "wife" };
const PARENT_LABEL: Record<ParentRole, string> = { father: "父", mother: "母" };

/** データが空の状態から最初の人物を追加する */
export const addFirstIndividual = (tree: FamilyTree, input: PersonInput): AddResult => {
  if (tree.individuals.length > 0) {
    throw new TreeOperationError("既に人物が存在します");
  }
  const id = nextId(tree, "I");
  return { tree: { ...tree, individuals: [newIndividual(id, parsePersonInput(input))] }, individualId: id };
};

/** 配偶者を追加する。常に新しい家族を作成する */
export const addSpouse = (tree: FamilyTree, personId: string, input: PersonInput): AddResult => {
  const valid = parsePersonInput(input);
  const person = getIndividual(tree, personId);
  const familyId = nextId(tree, "F");
  const spouseId = nextId(tree, "I");
  const slot = slotFor(person.sex);
  const family: Family = {
    id: familyId,
    [slot]: link(personId),
    [otherSlot(slot)]: link(spouseId),
    children: [],
    extras: [],
  };
  const spouse = newIndividual(spouseId, valid, { familiesAsSpouse: [link(familyId)] });
  const updated = replaceIndividual(tree, {
    ...person,
    familiesAsSpouse: [...person.familiesAsSpouse, link(familyId)],
  });
  return {
    tree: { ...updated, individuals: [...updated.individuals, spouse], families: [...updated.families, family] },
    individualId: spouseId,
  };
};

/**
 * 子を追加する。
 * familyId 指定時はその家族に、未指定(配偶者なし)時は配偶者枠が空いた家族に追加し、無ければ新しい家族を作成する
 */
export const addChild = (
  tree: FamilyTree,
  parentId: string,
  familyId: string | undefined,
  input: PersonInput,
): AddResult => {
  const valid = parsePersonInput(input);
  const parent = getIndividual(tree, parentId);
  const childId = nextId(tree, "I");

  let family: Family | undefined;
  if (familyId !== undefined) {
    if (!parent.familiesAsSpouse.some((l) => l.id === familyId)) {
      throw new TreeOperationError(`${parentId} は家族 ${familyId} の配偶者ではありません`);
    }
    family = getFamily(tree, familyId);
  } else {
    family = parent.familiesAsSpouse
      .map((l) => getFamily(tree, l.id))
      .find((f) => f.husband === undefined || f.wife === undefined);
  }

  let next = tree;
  if (family) {
    next = replaceFamily(next, { ...family, children: [...family.children, link(childId)] });
  } else {
    family = { id: nextId(tree, "F"), [slotFor(parent.sex)]: link(parentId), children: [link(childId)], extras: [] };
    next = replaceIndividual(next, { ...parent, familiesAsSpouse: [...parent.familiesAsSpouse, link(family.id)] });
    next = { ...next, families: [...next.families, family] };
  }
  const child = newIndividual(childId, valid, { familiesAsChild: [link(family.id)] });
  return { tree: { ...next, individuals: [...next.individuals, child] }, individualId: childId };
};

/** 追加可能な親の役割。親の家族が複数ある場合は最初の家族を対象とする */
export const availableParentRoles = (tree: FamilyTree, childId: string): ParentRole[] => {
  const famc = getIndividual(tree, childId).familiesAsChild[0];
  if (!famc) return ["father", "mother"];
  const family = getFamily(tree, famc.id);
  return (["father", "mother"] as const).filter((role) => family[PARENT_SLOT[role]] === undefined);
};

/** 親を追加する。父は SEX M・HUSB、母は SEX F・WIFE */
export const addParent = (tree: FamilyTree, childId: string, role: ParentRole, input: PersonInput): AddResult => {
  const valid = { ...parsePersonInput(input), sex: role === "father" ? ("M" as const) : ("F" as const) };
  const child = getIndividual(tree, childId);
  const slot = PARENT_SLOT[role];
  const parentId = nextId(tree, "I");
  const famc = child.familiesAsChild[0];

  let next: FamilyTree;
  let familyId: string;
  if (famc) {
    const family = getFamily(tree, famc.id);
    if (family[slot]) {
      throw new TreeOperationError(`${childId} には既に${PARENT_LABEL[role]}がいます`);
    }
    familyId = family.id;
    next = replaceFamily(tree, { ...family, [slot]: link(parentId) });
  } else {
    familyId = nextId(tree, "F");
    const family: Family = { id: familyId, [slot]: link(parentId), children: [link(childId)], extras: [] };
    next = replaceIndividual(tree, { ...child, familiesAsChild: [link(familyId)] });
    next = { ...next, families: [...next.families, family] };
  }
  const parent = newIndividual(parentId, valid, { familiesAsSpouse: [link(familyId)] });
  return { tree: { ...next, individuals: [...next.individuals, parent] }, individualId: parentId };
};
