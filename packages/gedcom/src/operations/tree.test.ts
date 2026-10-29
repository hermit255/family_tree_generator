import { describe, expect, it } from "vitest";
import { TreeOperationError } from "./errors";
import { treeOf } from "./test-helpers";
import { getFamily, getIndividual, nextId, slotFor } from "./tree";

describe("nextId", () => {
  it("同形式の最大番号 + 1(SUBM・未対応レコードの xref も考慮)", () => {
    const tree = treeOf("0 @U1@ SUBM", "0 @I2@ INDI", "0 @X9@ INDI", "0 @I10@ SNOTE a", "0 @F3@ FAM", "0 _EXT");
    expect(nextId(tree, "I")).toBe("I11");
    expect(nextId(tree, "F")).toBe("F4");
  });

  it("該当が無ければ 1", () => {
    expect(nextId(treeOf(), "I")).toBe("I1");
  });
});

describe("slotFor", () => {
  it.each([
    ["F", "wife"],
    ["M", "husband"],
    ["X", "husband"],
    [undefined, "husband"],
  ] as const)("%s → %s", (sex, slot) => {
    expect(slotFor(sex)).toBe(slot);
  });
});

describe("get", () => {
  it("存在しない ID はエラー", () => {
    expect(() => getIndividual(treeOf(), "I1")).toThrow(TreeOperationError);
    expect(() => getFamily(treeOf(), "F1")).toThrow(/家族 F1 が存在しません/);
  });
});
