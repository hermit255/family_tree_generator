import type { TreeImage } from "./image";

/** A4 (mm) */
const A4 = { short: 210, long: 297 };
const MARGIN = 10;
/** 画面の 1px を 96dpi とみなした長さ(mm) */
const MM_PER_PX = 25.4 / 96;

export type PdfPlacement = {
  orientation: "portrait" | "landscape";
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * 画像(画面座標系での大きさ)を A4 1ページに配置する。
 * 横長なら横向き、縦長なら縦向き。余白内に収まらなければ縮小し、拡大はしない。ページ中央に置く
 */
export const placeOnA4 = (imageWidth: number, imageHeight: number): PdfPlacement => {
  const orientation = imageWidth > imageHeight ? "landscape" : "portrait";
  const page =
    orientation === "landscape" ? { width: A4.long, height: A4.short } : { width: A4.short, height: A4.long };
  const naturalWidth = imageWidth * MM_PER_PX;
  const naturalHeight = imageHeight * MM_PER_PX;
  const scale = Math.min(1, (page.width - MARGIN * 2) / naturalWidth, (page.height - MARGIN * 2) / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return { orientation, x: (page.width - width) / 2, y: (page.height - height) / 2, width, height };
};

/** canvas の画像を埋め込んだ A4 1ページの PDF を作る。jsPDF は大きいため使用時に読み込む */
export const imageToPdfBlob = async ({ canvas, width, height }: TreeImage): Promise<Blob> => {
  const { jsPDF } = await import("jspdf");
  const placement = placeOnA4(width, height);
  const doc = new jsPDF({ orientation: placement.orientation, unit: "mm", format: "a4" });
  // 圧縮を指定しないと画像が無圧縮で埋め込まれ、数MBになる
  doc.addImage(canvas, "PNG", placement.x, placement.y, placement.width, placement.height, undefined, "FAST");
  return doc.output("blob");
};
