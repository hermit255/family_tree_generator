import { importGedcom } from "@kakeizu/gedcom";
import { describe, expect, it } from "vitest";
import { canExport, exportFileName } from "./target";

const tree = importGedcom(["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI", "1 NAME 太郎 /山田/", "0 TRLR"].join("\n")).tree;
const empty = { ...tree, individuals: [] };

describe("canExport", () => {
  it(".ged は人物が0件でも出力できる", () => {
    expect(canExport("ged", { tree: empty })).toBe(true);
  });

  it.each(["png", "pdf"] as const)("%s は人物が1人以上いる場合のみ出力できる", (format) => {
    expect(canExport(format, { tree })).toBe(true);
    expect(canExport(format, { tree: empty })).toBe(false);
  });
});

describe("exportFileName", () => {
  it("kakeizu-年月日.拡張子 (月日は2桁)", () => {
    expect(exportFileName("ged", new Date(2026, 0, 5))).toBe("kakeizu-20260105.ged");
    expect(exportFileName("pdf", new Date(2026, 9, 29, 23, 59))).toBe("kakeizu-20261029.pdf");
  });
});
