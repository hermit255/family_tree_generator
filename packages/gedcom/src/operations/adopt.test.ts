import { describe, expect, it } from "vitest";
import { exportGedcom, importGedcom, pedigreeOf, type FamilyTree } from "../model";
import { addParent, availableParentRoles } from "./add";
import { addAdoptiveParent, adoptableFamilies, adoptInto, vacantAdoptiveFamilies } from "./adopt";
import { shapeOf, treeOf } from "./test-helpers";
import { getIndividual } from "./tree";

const taro = { givenName: "太郎", surname: "山田" };

const expectConsistent = (tree: FamilyTree) => {
  expect(importGedcom(exportGedcom(tree)).warnings).toEqual([]);
};

// I1(夫)・I2(妻) の家族 F1 に子 I3。I3 と I4 の家族 F2。I5 は F1 とつながらない I6 の子
const base = treeOf(
  "0 @I1@ INDI",
  "1 SEX M",
  "1 FAMS @F1@",
  "0 @I2@ INDI",
  "1 SEX F",
  "1 FAMS @F1@",
  "0 @I3@ INDI",
  "1 SEX F",
  "1 FAMC @F1@",
  "1 FAMS @F2@",
  "0 @I4@ INDI",
  "1 SEX M",
  "1 FAMS @F2@",
  "1 FAMC @F3@",
  "0 @I6@ INDI",
  "1 FAMS @F3@",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "1 WIFE @I2@",
  "1 CHIL @I3@",
  "0 @F2@ FAM",
  "1 HUSB @I4@",
  "1 WIFE @I3@",
  "0 @F3@ FAM",
  "1 HUSB @I6@",
  "1 CHIL @I4@",
  "0 @F4@ FAM",
);

describe("adoptableFamilies", () => {
  it("親のいる家族のうち、本人が配偶者・子として属していない家族", () => {
    expect(adoptableFamilies(base, "I4").map((f) => f.id)).toEqual(["F1"]);
    expect(adoptableFamilies(base, "I3").map((f) => f.id)).toEqual(["F3"]);
  });

  it("存在しない人物はエラー", () => {
    expect(() => adoptableFamilies(base, "I9")).toThrow(/人物 I9 が存在しません/);
  });
});

describe("adoptInto", () => {
  it("婿養子: 妻の親の家族に CHIL と PEDI ADOPTED の FAMC を追加する(実親の家族は残す)", () => {
    const tree = adoptInto(base, "I4", "F1", "adopted");
    expect(shapeOf(tree)).toMatchObject({ F1: "I1/I2/I3,I4", F3: "I6/-/I4" });
    const husband = getIndividual(tree, "I4");
    expect(husband.familiesAsChild.map((l) => l.id)).toEqual(["F3", "F1"]);
    expect(pedigreeOf(husband, "F3")).toBe("birth");
    expect(pedigreeOf(husband, "F1")).toBe("adopted");
    expectConsistent(tree);
  });

  it("特別養子は PHRASE 付きで記録する", () => {
    const tree = adoptInto(base, "I4", "F1", "special");
    expect(pedigreeOf(getIndividual(tree, "I4"), "F1")).toBe("special");
  });

  it.each([
    ["F2", "配偶者として属する家族"],
    ["F3", "子として属する家族"],
    ["F4", "親のいない家族"],
  ])("%s(%s)の養子にはできない", (familyId) => {
    expect(() => adoptInto(base, "I4", familyId, "adopted")).toThrow(`I4 は家族 ${familyId} の養子にできません`);
  });
});

describe("addAdoptiveParent / vacantAdoptiveFamilies", () => {
  it("新しい養親: 縁組の種類を記録した家族を作り、実親の家族は残す", () => {
    const { tree, individualId } = addAdoptiveParent(base, "I3", { kind: "special" }, "mother", taro);
    expect(individualId).toBe("I7");
    expect(shapeOf(tree)).toMatchObject({ F1: "I1/I2/I3", F5: "-/I7/I3" });
    const child = getIndividual(tree, "I3");
    expect(child.familiesAsChild.map((l) => l.id)).toEqual(["F1", "F5"]);
    expect(pedigreeOf(child, "F5")).toBe("special");
    expect(getIndividual(tree, "I7")).toMatchObject({ sex: "F", familiesAsSpouse: [{ id: "F5" }] });
    expectConsistent(tree);
  });

  it("養親の枠が空いた家族に、もう1人の養親を追加する", () => {
    const first = addAdoptiveParent(base, "I3", { kind: "adopted" }, "father", taro).tree;
    expect(vacantAdoptiveFamilies(first, "I3")).toEqual([
      { family: expect.objectContaining({ id: "F5" }), role: "mother", kind: "adopted" },
    ]);
    const { tree } = addAdoptiveParent(first, "I3", { familyId: "F5" }, "mother", taro);
    expect(shapeOf(tree)).toMatchObject({ F5: "I7/I8/I3" });
    expect(getIndividual(tree, "I3").familiesAsChild.map((l) => l.id)).toEqual(["F1", "F5"]);
    expect(vacantAdoptiveFamilies(tree, "I3")).toEqual([]);
    expectConsistent(tree);
  });

  it("妻だけの養子縁組の家族は父の枠が空いている", () => {
    const tree = addAdoptiveParent(base, "I3", { kind: "adopted" }, "mother", taro).tree;
    expect(vacantAdoptiveFamilies(tree, "I3").map((v) => v.role)).toEqual(["father"]);
  });

  it("実親の家族は養親の枠の対象にならない", () => {
    expect(vacantAdoptiveFamilies(base, "I4")).toEqual([]);
    expect(() => addAdoptiveParent(base, "I4", { familyId: "F3" }, "mother", taro)).toThrow(
      /家族 F3 は I4 の養親の枠が空いた家族ではありません/,
    );
  });

  it("養子縁組の家族があっても、実親の追加は実親の家族を対象にする", () => {
    const adopted = addAdoptiveParent(treeOf("0 @I1@ INDI"), "I1", { kind: "adopted" }, "father", taro).tree;
    expect(availableParentRoles(adopted, "I1")).toEqual(["father", "mother"]);
    const { tree } = addParent(adopted, "I1", "mother", taro);
    expect(shapeOf(tree)).toEqual({ F1: "I2/-/I1", F2: "-/I3/I1" });
    const child = getIndividual(tree, "I1");
    expect(child.familiesAsChild.map((l) => [l.id, pedigreeOf(child, l.id)])).toEqual([
      ["F1", "adopted"],
      ["F2", "birth"],
    ]);
    expectConsistent(tree);
  });
});
