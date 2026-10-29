import { describe, expect, it } from "vitest";
import { exportGedcom, importGedcom } from "../model";
import { addChild, addFirstIndividual, addParent, addSpouse, availableParentRoles } from "./add";
import { shapeOf, treeOf } from "./test-helpers";
import { getIndividual } from "./tree";

const taro = { givenName: "太郎", surname: "山田" };

/** 操作結果が再インポートしても警告なし(双方向リンクが揃っている)ことを確認 */
const expectConsistent = (tree: Parameters<typeof exportGedcom>[0]) => {
  expect(importGedcom(exportGedcom(tree)).warnings).toEqual([]);
};

describe("addFirstIndividual", () => {
  it("空の家系図に I1 を追加する", () => {
    const { tree, individualId } = addFirstIndividual(treeOf(), taro);
    expect(individualId).toBe("I1");
    expect(tree.individuals).toEqual([
      {
        id: "I1",
        givenName: "太郎",
        surname: "山田",
        nameExtras: [],
        sex: "U",
        familiesAsSpouse: [],
        familiesAsChild: [],
        extras: [],
      },
    ]);
  });

  it("既に人物がいればエラー", () => {
    expect(() => addFirstIndividual(treeOf("0 @I1@ INDI"), taro)).toThrow(/既に人物が存在します/);
  });
});

describe("addSpouse", () => {
  it("新しい家族を作り、男性は HUSB・相手は WIFE", () => {
    const { tree, individualId } = addSpouse(treeOf("0 @I1@ INDI", "1 SEX M"), "I1", { ...taro, sex: "F" });
    expect(individualId).toBe("I2");
    expect(shapeOf(tree)).toEqual({ F1: "I1/I2/" });
    expect(getIndividual(tree, "I1").familiesAsSpouse.map((l) => l.id)).toEqual(["F1"]);
    expect(getIndividual(tree, "I2")).toMatchObject({ sex: "F", familiesAsSpouse: [{ id: "F1" }] });
    expectConsistent(tree);
  });

  it("女性は WIFE・相手は HUSB", () => {
    const { tree } = addSpouse(treeOf("0 @I1@ INDI", "1 SEX F"), "I1", taro);
    expect(shapeOf(tree)).toEqual({ F1: "I2/I1/" });
  });

  it("配偶者枠が空いた家族があっても新しい家族を作る(再婚扱い)", () => {
    const base = treeOf("0 @I1@ INDI", "1 SEX M", "1 FAMS @F1@", "0 @I2@ INDI", "1 FAMC @F1@", "0 @F1@ FAM", "1 HUSB @I1@", "1 CHIL @I2@");
    const { tree } = addSpouse(base, "I1", taro);
    expect(shapeOf(tree)).toEqual({ F1: "I1/-/I2", F2: "I1/I3/" });
    expectConsistent(tree);
  });

  it("入力が不正ならエラー", () => {
    expect(() => addSpouse(treeOf("0 @I1@ INDI"), "I1", { givenName: "", surname: "" })).toThrow(/姓または名/);
  });
});

describe("addChild", () => {
  const remarried = treeOf(
    "0 @I1@ INDI",
    "1 SEX M",
    "1 FAMS @F1@",
    "1 FAMS @F2@",
    "0 @I2@ INDI",
    "1 FAMS @F1@",
    "0 @I3@ INDI",
    "1 FAMS @F2@",
    "0 @F1@ FAM",
    "1 HUSB @I1@",
    "1 WIFE @I2@",
    "0 @F2@ FAM",
    "1 HUSB @I1@",
    "1 WIFE @I3@",
  );

  it("指定した家族に子を追加する", () => {
    const { tree, individualId } = addChild(remarried, "I1", "F2", taro);
    expect(individualId).toBe("I4");
    expect(shapeOf(tree)).toEqual({ F1: "I1/I2/", F2: "I1/I3/I4" });
    expect(getIndividual(tree, "I4").familiesAsChild.map((l) => l.id)).toEqual(["F2"]);
    expectConsistent(tree);
  });

  it("配偶者でない家族を指定するとエラー", () => {
    expect(() => addChild(remarried, "I2", "F2", taro)).toThrow(/I2 は家族 F2 の配偶者ではありません/);
  });

  it("配偶者なし: 配偶者枠が空いた家族に追加する", () => {
    const base = treeOf("0 @I1@ INDI", "1 SEX F", "1 FAMS @F1@", "0 @I2@ INDI", "1 FAMC @F1@", "0 @F1@ FAM", "1 WIFE @I1@", "1 CHIL @I2@");
    const { tree } = addChild(base, "I1", undefined, taro);
    expect(shapeOf(tree)).toEqual({ F1: "-/I1/I2,I3" });
  });

  it("配偶者なし: 枠が空いた家族が無ければ新しい家族を作る", () => {
    const { tree } = addChild(remarried, "I1", undefined, taro);
    expect(shapeOf(tree)).toEqual({ F1: "I1/I2/", F2: "I1/I3/", F3: "I1/-/I4" });
    expect(getIndividual(tree, "I1").familiesAsSpouse.map((l) => l.id)).toEqual(["F1", "F2", "F3"]);
    expectConsistent(tree);
  });

  it("配偶者なし: 女性の親は WIFE として新しい家族を作る", () => {
    const { tree } = addChild(treeOf("0 @I1@ INDI", "1 SEX F"), "I1", undefined, taro);
    expect(shapeOf(tree)).toEqual({ F1: "-/I1/I2" });
  });

  it("入力が不正ならエラー", () => {
    expect(() => addChild(remarried, "I1", "F1", { givenName: "", surname: " " })).toThrow(/姓または名/);
  });
});

describe("availableParentRoles / addParent", () => {
  it("親の家族が無ければ父母どちらも追加でき、新しい家族を作る", () => {
    const base = treeOf("0 @I1@ INDI");
    expect(availableParentRoles(base, "I1")).toEqual(["father", "mother"]);
    const { tree, individualId } = addParent(base, "I1", "mother", { ...taro, sex: "M" });
    expect(individualId).toBe("I2");
    expect(shapeOf(tree)).toEqual({ F1: "-/I2/I1" });
    expect(getIndividual(tree, "I2")).toMatchObject({ sex: "F", familiesAsSpouse: [{ id: "F1" }] });
    expect(getIndividual(tree, "I1").familiesAsChild.map((l) => l.id)).toEqual(["F1"]);
    expectConsistent(tree);
  });

  it("片親の家族があれば空いている側のみ追加でき、その家族に入る", () => {
    const base = treeOf("0 @I1@ INDI", "1 FAMC @F1@", "0 @I2@ INDI", "1 FAMS @F1@", "0 @F1@ FAM", "1 WIFE @I2@", "1 CHIL @I1@");
    expect(availableParentRoles(base, "I1")).toEqual(["father"]);
    const { tree } = addParent(base, "I1", "father", taro);
    expect(shapeOf(tree)).toEqual({ F1: "I3/I2/I1" });
    expect(getIndividual(tree, "I3").sex).toBe("M");
    expectConsistent(tree);
  });

  it("父母が揃っていれば追加できない", () => {
    const base = treeOf(
      "0 @I1@ INDI",
      "1 FAMC @F1@",
      "0 @I2@ INDI",
      "0 @I3@ INDI",
      "0 @F1@ FAM",
      "1 HUSB @I2@",
      "1 WIFE @I3@",
      "1 CHIL @I1@",
    );
    expect(availableParentRoles(base, "I1")).toEqual([]);
    expect(() => addParent(base, "I1", "father", taro)).toThrow(/I1 には既に父がいます/);
    expect(() => addParent(base, "I1", "mother", taro)).toThrow(/I1 には既に母がいます/);
  });
});
