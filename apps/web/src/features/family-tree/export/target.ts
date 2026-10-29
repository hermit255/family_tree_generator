import type { FamilyTree } from "@kakeizu/gedcom";

/**
 * エクスポート対象。呼び出し側が現在のデータ・フィルタ後のデータ等を選んで渡し、
 * エクスポート処理はデータの出どころに依存しない
 */
export type ExportTarget = {
  tree: FamilyTree;
  /** 画像出力で中心とする人物。INDI が0件の場合は undefined */
  centerId: string | undefined;
};

export type ExportFormat = "ged" | "png" | "pdf";

/** 画像系(PNG/PDF)は描く人物がいる場合のみ出力できる */
export const canExport = (format: ExportFormat, target: ExportTarget): boolean =>
  format === "ged" || (!!target.centerId && target.tree.individuals.some((i) => i.id === target.centerId));

const pad = (value: number) => String(value).padStart(2, "0");

/** 例: kakeizu-20261029.png (日付はローカル時刻) */
export const exportFileName = (format: ExportFormat, date: Date): string =>
  `kakeizu-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}.${format}`;
