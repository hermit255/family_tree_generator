import type { FamilyTree } from "../model";
import { parsePersonInput, type PersonInput } from "./input";
import { getIndividual, replaceIndividual } from "./tree";

/** 人物の姓・名・性別を更新する。家族内の枠(HUSB/WIFE)は変更しない */
export const updateIndividual = (tree: FamilyTree, id: string, input: PersonInput): FamilyTree => {
  const { givenName, surname, sex } = parsePersonInput(input);
  return replaceIndividual(tree, { ...getIndividual(tree, id), givenName, surname, sex });
};
