import type { FamilyTree } from "./types";

export const DEFAULT_ROOT_ID = "I1";

/** 起点ノード: @I1@ が無ければ最初の INDI、INDI が無ければ undefined */
export const findRootId = (tree: FamilyTree): string | undefined =>
  tree.individuals.some((i) => i.id === DEFAULT_ROOT_ID) ? DEFAULT_ROOT_ID : tree.individuals[0]?.id;
