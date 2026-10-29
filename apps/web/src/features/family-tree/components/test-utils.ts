import { importGedcom } from "@kakeizu/gedcom";
import { initialState, useFamilyTreeStore } from "../store";

const originalActions = useFamilyTreeStore.getState();

/** レコード行からストアの状態を作る(テスト用)。差し替えた操作関数も元に戻す */
export const setupStore = (...body: string[]) => {
  localStorage.clear();
  useFamilyTreeStore.setState(originalActions, true);
  const { tree } = importGedcom(["0 HEAD", "1 GEDC", "2 VERS 7.0", ...body, "0 TRLR"].join("\n"));
  useFamilyTreeStore.setState({ ...initialState, hydrated: true, tree, centerId: tree.individuals[0]?.id });
};

export const store = () => useFamilyTreeStore.getState();
export const person = (id: string) => store().tree!.individuals.find((i) => i.id === id);
export const family = (id: string) => store().tree!.families.find((f) => f.id === id);
