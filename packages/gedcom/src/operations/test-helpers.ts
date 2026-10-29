import { importGedcom, type FamilyTree } from "../model";

/** レコード行から家系図を作る(テスト用) */
export const treeOf = (...body: string[]): FamilyTree =>
  importGedcom(["0 HEAD", "1 GEDC", "2 VERS 7.0", ...body, "0 TRLR"].join("\n")).tree;

/** 家族の構成を "HUSB/WIFE/CHIL,..." の簡易表記にする */
export const shapeOf = (tree: FamilyTree): Record<string, string> =>
  Object.fromEntries(
    tree.families.map((f) => [
      f.id,
      `${f.husband?.id ?? "-"}/${f.wife?.id ?? "-"}/${f.children.map((c) => c.id).join(",")}`,
    ]),
  );
