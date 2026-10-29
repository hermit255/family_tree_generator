import { describe, expect, it } from "vitest";
import { parseGedcom } from "./parse";
import { serializeGedcom } from "./serialize";

describe("serializeGedcom", () => {
  it("木を level 付きの行に戻す", () => {
    expect(
      serializeGedcom([
        { tag: "HEAD", children: [{ tag: "GEDC", children: [{ tag: "VERS", value: "7.0", children: [] }] }] },
        { tag: "FAM", xref: "F1", children: [{ tag: "CHIL", pointer: "I1", children: [] }] },
        { tag: "TRLR", children: [] },
      ]),
    ).toBe("0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @F1@ FAM\n1 CHIL @I1@\n0 TRLR\n");
  });

  it("改行を含む値は CONT に分割する", () => {
    expect(serializeGedcom([{ tag: "SNOTE", xref: "N1", value: "a\n\n@b", children: [] }])).toBe(
      "0 @N1@ SNOTE a\n1 CONT\n1 CONT @@b\n",
    );
  });

  it("CONT は子構造より前に出力する", () => {
    expect(
      serializeGedcom([
        { tag: "NOTE", value: "a\nb", children: [{ tag: "LANG", value: "ja", children: [] }] },
      ]),
    ).toBe("0 NOTE a\n1 CONT b\n1 LANG ja\n");
  });

  it("parse → serialize で元の文字列に戻る", () => {
    const source = [
      "0 HEAD",
      "1 GEDC",
      "2 VERS 7.0",
      "0 @I1@ INDI",
      "1 NAME 太郎 /山田/",
      "2 GIVN 太郎",
      "1 NOTE 1行目",
      "2 CONT @@2行目",
      "1 FAMS @F1@",
      "0 TRLR",
      "",
    ].join("\n");
    expect(serializeGedcom(parseGedcom(source))).toBe(source);
  });
});
