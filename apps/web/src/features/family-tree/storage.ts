import { exportGedcom, importGedcom, type FamilyTree } from "@kakeizu/gedcom";

/** localStorage には GEDCOM 文字列として保存する(データ実体を GEDCOM に統一) */
export const STORAGE_KEY = "kakeizu:v1:gedcom";

/** 保存データを読み込む。未保存・読込不可・不正データの場合は null */
export const loadStoredTree = (): FamilyTree | null => {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return text === null ? null : importGedcom(text).tree;
  } catch {
    return null;
  }
};

/** 保存し、成否を返す。容量超過・ストレージ無効時は保存しない(画面上の操作は継続できる) */
export const saveTree = (tree: FamilyTree): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, exportGedcom(tree));
    return true;
  } catch {
    return false;
  }
};
