import { gedBlob } from "./ged";
import { canExport, exportFileName, type ExportFormat, type ExportTarget } from "./target";

export { canExport, exportFileName, type ExportFormat, type ExportTarget };

/** 対象データを指定形式のファイルにする。Konva・jsPDF はブラウザ専用かつ大きいため画像系の出力時に読み込む */
export const createExportBlob = async (format: ExportFormat, target: ExportTarget): Promise<Blob> => {
  if (format === "ged") return gedBlob(target);
  if (!canExport(format, target)) throw new Error("画像に出力する人物がいません");
  const { renderTreeImage, imageToPngBlob } = await import("./image");
  const image = await renderTreeImage(target);
  if (format === "png") return imageToPngBlob(image);
  const { imageToPdfBlob } = await import("./pdf");
  return imageToPdfBlob(image);
};

/** Blob をファイルとして保存させる */
export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  // クリック直後に解放するとダウンロードが始まらないブラウザがあるため遅らせる
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
