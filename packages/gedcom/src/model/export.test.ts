import { describe, expect, it } from "vitest";
import { exportGedcom } from "./export";
import { importGedcom } from "./import";
import type { FamilyTree } from "./types";

const emptyTree = (): FamilyTree => ({
  header: { extras: [] },
  submitters: [],
  individuals: [],
  families: [],
  extraRecords: [],
});

describe("exportGedcom", () => {
  it("空の家系図は HEAD と TRLR のみ", () => {
    expect(exportGedcom(emptyTree())).toBe("0 HEAD\n1 GEDC\n2 VERS 7.0\n0 TRLR\n");
  });

  it("各レコードを許可要素 → extras の順に出力する", () => {
    const tree: FamilyTree = {
      header: { submitter: { id: "U1", extras: [] }, extras: [{ tag: "SOUR", value: "app", children: [] }] },
      submitters: [{ id: "U1", name: "提出者", extras: [] }],
      individuals: [
        {
          id: "I1",
          givenName: "太郎",
          surname: "山田",
          nameExtras: [],
          sex: "M",
          familiesAsSpouse: [{ id: "F1", extras: [] }],
          familiesAsChild: [],
          extras: [{ tag: "BIRT", children: [] }],
        },
        {
          id: "I2",
          givenName: "",
          surname: "",
          nameExtras: [],
          familiesAsSpouse: [],
          familiesAsChild: [{ id: "F1", extras: [{ tag: "PEDI", value: "BIRTH", children: [] }] }],
          extras: [],
        },
      ],
      families: [
        {
          id: "F1",
          husband: { id: "I1", extras: [] },
          children: [{ id: "I2", extras: [] }],
          extras: [],
        },
        { id: "F2", wife: { id: "I1", extras: [] }, children: [], extras: [] },
      ],
      extraRecords: [{ tag: "SNOTE", xref: "N1", value: "メモ", children: [] }],
    };
    expect(exportGedcom(tree)).toBe(
      [
        "0 HEAD",
        "1 GEDC",
        "2 VERS 7.0",
        "1 SUBM @U1@",
        "1 SOUR app",
        "0 @U1@ SUBM",
        "1 NAME 提出者",
        "0 @I1@ INDI",
        "1 NAME 太郎 /山田/",
        "2 GIVN 太郎",
        "2 SURN 山田",
        "1 SEX M",
        "1 FAMS @F1@",
        "1 BIRT",
        "0 @I2@ INDI",
        "1 FAMC @F1@",
        "2 PEDI BIRTH",
        "0 @F1@ FAM",
        "1 HUSB @I1@",
        "1 CHIL @I2@",
        "0 @F2@ FAM",
        "1 WIFE @I1@",
        "0 @N1@ SNOTE メモ",
        "0 TRLR",
        "",
      ].join("\n"),
    );
  });

  it("import → export → import でモデルが一致する", () => {
    const source = [
      "0 HEAD",
      "1 GEDC",
      "2 VERS 7.0.18",
      "1 SOUR other-app",
      "0 @I1@ INDI",
      "1 BIRT",
      "2 DATE 1 JAN 1950",
      "1 NAME 太郎 /山田/",
      "2 TYPE BIRTH",
      "1 FAMS @F1@",
      "0 @I2@ INDI",
      "1 FAMC @F1@",
      "0 @F1@ FAM",
      "1 HUSB @I1@",
      "1 CHIL @I2@",
      "1 MARR",
      "0 TRLR",
    ].join("\n");
    const first = importGedcom(source).tree;
    expect(importGedcom(exportGedcom(first)).tree).toEqual(first);
  });
});
