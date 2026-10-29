import { describe, expect, it } from "vitest";
import { formatLine, parseLine } from "./line";
import { GedcomSyntaxError } from "./types";

describe("parseLine", () => {
  it("level と tag のみ", () => {
    expect(parseLine("0 TRLR", 1)).toEqual({ level: 0, tag: "TRLR" });
  });

  it("xref 付きレコード", () => {
    expect(parseLine("0 @I1@ INDI", 1)).toEqual({ level: 0, xref: "I1", tag: "INDI" });
  });

  it("文字列値", () => {
    expect(parseLine("1 NAME 太郎 /山田/", 1)).toEqual({ level: 1, tag: "NAME", value: "太郎 /山田/" });
  });

  it("ポインタ値", () => {
    expect(parseLine("1 FAMS @F1@", 1)).toEqual({ level: 1, tag: "FAMS", pointer: "F1" });
  });

  it("@VOID@ ポインタ", () => {
    expect(parseLine("1 HUSB @VOID@", 1)).toEqual({ level: 1, tag: "HUSB", pointer: "VOID" });
  });

  it("@@ でエスケープされた値は先頭の @ を1つ外す", () => {
    expect(parseLine("1 NOTE @@me", 1)).toEqual({ level: 1, tag: "NOTE", value: "@me" });
  });

  it("区切りの後が空の値は値なしとして扱う", () => {
    expect(parseLine("1 NAME ", 1)).toEqual({ level: 1, tag: "NAME" });
  });

  it("拡張タグ", () => {
    expect(parseLine("1 _PHOTO a.png", 1)).toEqual({ level: 1, tag: "_PHOTO", value: "a.png" });
  });

  it.each([
    ["空行", ""],
    ["先頭の空白", " 0 HEAD"],
    ["level の先頭ゼロ", "01 NAME"],
    ["小文字タグ", "0 head"],
    ["区切りが2つ", "1  NAME"],
  ])("不正な行は GedcomSyntaxError (%s)", (_, text) => {
    expect(() => parseLine(text, 3)).toThrow(GedcomSyntaxError);
  });

  it("エラーに行番号が含まれる", () => {
    expect(() => parseLine("x", 7)).toThrow(/^7行目/);
  });

  it("@VOID@ は xref に使えない", () => {
    expect(() => parseLine("0 @VOID@ INDI", 1)).toThrow(/VOID/);
  });

  it("エスケープされていない @ 始まりの値はエラー", () => {
    expect(() => parseLine("1 NOTE @me", 1)).toThrow(/@@/);
  });
});

describe("formatLine", () => {
  it("level と tag のみ", () => {
    expect(formatLine({ level: 0, tag: "TRLR" })).toBe("0 TRLR");
  });

  it("xref とポインタ", () => {
    expect(formatLine({ level: 0, xref: "F1", tag: "FAM" })).toBe("0 @F1@ FAM");
    expect(formatLine({ level: 1, tag: "CHIL", pointer: "I2" })).toBe("1 CHIL @I2@");
  });

  it("文字列値", () => {
    expect(formatLine({ level: 1, tag: "SEX", value: "M" })).toBe("1 SEX M");
  });

  it("@ 始まりの値はエスケープする", () => {
    expect(formatLine({ level: 1, tag: "NOTE", value: "@me" })).toBe("1 NOTE @@me");
  });

  it("空文字の値は出力しない", () => {
    expect(formatLine({ level: 1, tag: "NOTE", value: "" })).toBe("1 NOTE");
  });
});
