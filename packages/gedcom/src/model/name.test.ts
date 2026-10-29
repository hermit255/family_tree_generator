import { describe, expect, it } from "vitest";
import { readName, writeName } from "./name";

describe("readName", () => {
  it("GIVN/SURN を優先する", () => {
    expect(
      readName({
        tag: "NAME",
        value: "x /y/",
        children: [
          { tag: "GIVN", value: "太郎", children: [] },
          { tag: "SURN", value: "山田", children: [] },
        ],
      }),
    ).toEqual({ givenName: "太郎", surname: "山田", nameExtras: [] });
  });

  it("GIVN/SURN が無ければ NAME の /姓/ から分解する", () => {
    expect(readName({ tag: "NAME", value: "太郎 /山田/", children: [] })).toMatchObject({
      givenName: "太郎",
      surname: "山田",
    });
  });

  it("姓の後ろの語も名に含める", () => {
    expect(readName({ tag: "NAME", value: "John /Smith/ Jr.", children: [] })).toMatchObject({
      givenName: "John Jr.",
      surname: "Smith",
    });
  });

  it("/ が無ければ全体を名とする", () => {
    expect(readName({ tag: "NAME", value: " 太郎 ", children: [] })).toMatchObject({ givenName: "太郎", surname: "" });
  });

  it("値が無ければ空文字", () => {
    expect(readName({ tag: "NAME", children: [] })).toMatchObject({ givenName: "", surname: "" });
  });

  it("GIVN/SURN 以外の下位構造は nameExtras に保持する", () => {
    const type = { tag: "TYPE", value: "BIRTH", children: [] };
    expect(readName({ tag: "NAME", value: "a", children: [type] }).nameExtras).toEqual([type]);
  });
});

describe("writeName", () => {
  it("NAME と GIVN/SURN の両方を出力する", () => {
    expect(writeName({ givenName: "太郎", surname: "山田", nameExtras: [] })).toEqual({
      tag: "NAME",
      value: "太郎 /山田/",
      children: [
        { tag: "GIVN", value: "太郎", children: [] },
        { tag: "SURN", value: "山田", children: [] },
      ],
    });
  });

  it("名のみ", () => {
    expect(writeName({ givenName: "太郎", surname: "", nameExtras: [] })).toEqual({
      tag: "NAME",
      value: "太郎",
      children: [{ tag: "GIVN", value: "太郎", children: [] }],
    });
  });

  it("姓のみ", () => {
    expect(writeName({ givenName: "", surname: "山田", nameExtras: [] })).toEqual({
      tag: "NAME",
      value: "/山田/",
      children: [{ tag: "SURN", value: "山田", children: [] }],
    });
  });

  it("姓名が無く nameExtras のみなら値なしの NAME", () => {
    const type = { tag: "TYPE", value: "AKA", children: [] };
    expect(writeName({ givenName: "", surname: "", nameExtras: [type] })).toEqual({ tag: "NAME", children: [type] });
  });

  it("何も無ければ undefined", () => {
    expect(writeName({ givenName: "", surname: "", nameExtras: [] })).toBeUndefined();
  });
});
