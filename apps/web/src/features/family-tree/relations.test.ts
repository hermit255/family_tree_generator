import { importGedcom } from "@kakeizu/gedcom";
import { describe, expect, it } from "vitest";
import { spouseFamiliesOf } from "./relations";

const tree = importGedcom(
  [
    "0 HEAD",
    "1 GEDC",
    "2 VERS 7.0",
    "0 @I1@ INDI",
    "1 FAMS @F1@",
    "1 FAMS @F2@",
    "0 @I2@ INDI",
    "1 FAMS @F1@",
    "0 @F1@ FAM",
    "1 HUSB @I1@",
    "1 WIFE @I2@",
    "0 @F2@ FAM",
    "1 WIFE @I1@",
    "0 TRLR",
  ].join("\n"),
).tree;

describe("spouseFamiliesOf", () => {
  it("家族ごとの相手を返す(相手不在は undefined)", () => {
    expect(spouseFamiliesOf(tree, "I1").map((s) => [s.familyId, s.partner?.id])).toEqual([
      ["F1", "I2"],
      ["F2", undefined],
    ]);
    expect(spouseFamiliesOf(tree, "I2").map((s) => s.partner?.id)).toEqual(["I1"]);
  });

  it("存在しない人物・家族は空", () => {
    expect(spouseFamiliesOf(tree, "I9")).toEqual([]);
    const broken = { ...tree, families: [] };
    expect(spouseFamiliesOf(broken, "I1")).toEqual([]);
  });
});
