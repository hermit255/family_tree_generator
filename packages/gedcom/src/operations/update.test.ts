import { describe, expect, it } from "vitest";
import { treeOf, shapeOf } from "./test-helpers";
import { getIndividual } from "./tree";
import { updateIndividual } from "./update";

describe("updateIndividual", () => {
  it("姓・名・性別を更新し、その他の項目と家族内の枠は維持する", () => {
    const base = treeOf("0 @I1@ INDI", "1 SEX M", "1 FAMS @F1@", "1 BIRT", "0 @F1@ FAM", "1 HUSB @I1@");
    const tree = updateIndividual(base, "I1", { givenName: "花子", surname: "山田", sex: "F" });
    expect(getIndividual(tree, "I1")).toMatchObject({
      givenName: "花子",
      surname: "山田",
      sex: "F",
      familiesAsSpouse: [{ id: "F1" }],
      extras: [{ tag: "BIRT" }],
    });
    expect(shapeOf(tree)).toEqual({ F1: "I1/-/" });
  });

  it("入力が不正ならエラー", () => {
    expect(() => updateIndividual(treeOf("0 @I1@ INDI"), "I1", { givenName: "", surname: "" })).toThrow(/姓または名/);
  });
});
