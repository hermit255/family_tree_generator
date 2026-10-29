import { describe, expect, it } from "vitest";
import { canDeleteIndividual, deleteIndividual } from "./remove";
import { shapeOf, treeOf } from "./test-helpers";

// I1(起点) ═ I2
//      │
//   I3 ═ I4
//      │
//      I5
const family = treeOf(
  "0 @I1@ INDI",
  "1 FAMS @F1@",
  "0 @I2@ INDI",
  "1 FAMS @F1@",
  "0 @I3@ INDI",
  "1 FAMC @F1@",
  "1 FAMS @F2@",
  "0 @I4@ INDI",
  "1 FAMS @F2@",
  "0 @I5@ INDI",
  "1 FAMC @F2@",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "1 WIFE @I2@",
  "1 CHIL @I3@",
  "0 @F2@ FAM",
  "1 HUSB @I3@",
  "1 WIFE @I4@",
  "1 CHIL @I5@",
);

describe("canDeleteIndividual / deleteIndividual", () => {
  it("末端の人物は削除でき、家族からも外れる", () => {
    expect(canDeleteIndividual(family, "I5")).toEqual({ ok: true });
    const tree = deleteIndividual(family, "I5");
    expect(tree.individuals.map((i) => i.id)).toEqual(["I1", "I2", "I3", "I4"]);
    expect(shapeOf(tree)).toEqual({ F1: "I1/I2/I3", F2: "I3/I4/" });
  });

  it("配偶者を削除しても子が残る家族は維持する", () => {
    expect(shapeOf(deleteIndividual(family, "I2"))).toEqual({ F1: "I1/-/I3", F2: "I3/I4/I5" });
  });

  it("メンバーが0人になった家族は削除する", () => {
    const pair = treeOf("0 @I1@ INDI", "0 @I2@ INDI", "1 FAMC @F1@", "0 @F1@ FAM", "1 CHIL @I2@");
    expect(deleteIndividual(pair, "I2").families).toEqual([]);
  });

  it("メンバーが1人残る家族は削除しない", () => {
    expect(shapeOf(deleteIndividual(deleteIndividual(family, "I5"), "I4"))).toEqual({
      F1: "I1/I2/I3",
      F2: "I3/-/",
    });
  });

  it("起点ノードは削除できない", () => {
    expect(canDeleteIndividual(family, "I1")).toEqual({ ok: false, reason: "起点ノードは削除できません" });
    expect(() => deleteIndividual(family, "I1")).toThrow(/起点ノード/);
  });

  it("家系図が分断される削除は禁止", () => {
    expect(canDeleteIndividual(family, "I3")).toEqual({
      ok: false,
      reason: "削除すると家系図が分断されるため削除できません",
    });
    expect(() => deleteIndividual(family, "I3")).toThrow(/分断/);
  });

  it("元から分断しているデータの孤立した人物は削除できる", () => {
    const split = treeOf("0 @I1@ INDI", "0 @I2@ INDI");
    expect(deleteIndividual(split, "I2").individuals.map((i) => i.id)).toEqual(["I1"]);
  });

  it("存在しない人物はエラー", () => {
    expect(() => canDeleteIndividual(family, "I9")).toThrow(/人物 I9 が存在しません/);
  });
});
