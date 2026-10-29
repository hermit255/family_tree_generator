import { describe, expect, it } from "vitest";
import { parseGedcom } from "./parse";

describe("parseGedcom", () => {
  it("レコードと下位構造を木にする", () => {
    const source = ["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI", "1 SEX M", "0 TRLR"].join("\n");
    expect(parseGedcom(source)).toEqual([
      {
        tag: "HEAD",
        children: [{ tag: "GEDC", children: [{ tag: "VERS", value: "7.0", children: [] }] }],
      },
      { tag: "INDI", xref: "I1", children: [{ tag: "SEX", value: "M", children: [] }] },
      { tag: "TRLR", children: [] },
    ]);
  });

  it("下位構造を抜けて上位 level に戻る", () => {
    const source = ["0 @F1@ FAM", "1 HUSB @I1@", "2 PHRASE 夫", "1 WIFE @I2@"].join("\n");
    expect(parseGedcom(source)[0]!.children.map((c) => c.tag)).toEqual(["HUSB", "WIFE"]);
  });

  it.each([
    ["LF", "\n"],
    ["CRLF", "\r\n"],
    ["CR", "\r"],
  ])("改行コード %s を受け付ける", (_, eol) => {
    expect(parseGedcom(["0 HEAD", "0 TRLR"].join(eol))).toHaveLength(2);
  });

  it("BOM と末尾の改行を無視する", () => {
    expect(parseGedcom("﻿0 HEAD\n0 TRLR\n")).toHaveLength(2);
  });

  it("CONT を改行として結合する", () => {
    const source = ["0 @N1@ SNOTE 1行目", "1 CONT 2行目", "1 CONT", "1 CONT @@4行目"].join("\n");
    expect(parseGedcom(source)[0]!.value).toBe("1行目\n2行目\n\n@4行目");
  });

  it("値のない行への CONT は空文字から結合する", () => {
    const source = ["0 @N1@ SNOTE", "1 CONT 2行目"].join("\n");
    expect(parseGedcom(source)[0]!.value).toBe("\n2行目");
  });

  it("CONT の後に親と同じ level の構造が続く", () => {
    const source = ["0 @I1@ INDI", "1 NOTE a", "2 CONT b", "1 SEX F"].join("\n");
    const [indi] = parseGedcom(source);
    expect(indi!.children).toEqual([
      { tag: "NOTE", value: "a\nb", children: [] },
      { tag: "SEX", value: "F", children: [] },
    ]);
  });

  it("level が飛んでいるとエラー", () => {
    expect(() => parseGedcom("0 HEAD\n2 VERS 7.0")).toThrow(/2行目: level が飛んでいます/);
  });

  it("level 0 の CONT はエラー", () => {
    expect(() => parseGedcom("0 CONT a")).toThrow(/不正な CONT/);
  });

  it("xref 付きの CONT はエラー", () => {
    expect(() => parseGedcom("0 HEAD\n1 @X1@ CONT a")).toThrow(/不正な CONT/);
  });

  it("ポインタ値の CONT はエラー", () => {
    expect(() => parseGedcom("0 HEAD\n1 CONT @I1@")).toThrow(/不正な CONT/);
  });

  it("ポインタ値の行に CONT が続くとエラー", () => {
    expect(() => parseGedcom("0 @F1@ FAM\n1 HUSB @I1@\n2 CONT a")).toThrow(/ポインタ値に CONT/);
  });

  it("空文字は空のレコード列", () => {
    expect(parseGedcom("")).toEqual([]);
  });
});
