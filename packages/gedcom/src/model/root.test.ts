import { describe, expect, it } from "vitest";
import { importGedcom } from "./import";
import { findRootId } from "./root";

const treeOf = (...body: string[]) =>
  importGedcom(["0 HEAD", "1 GEDC", "2 VERS 7.0", ...body, "0 TRLR"].join("\n")).tree;

describe("findRootId", () => {
  it("@I1@ があれば I1", () => {
    expect(findRootId(treeOf("0 @I5@ INDI", "0 @I1@ INDI"))).toBe("I1");
  });

  it("@I1@ が無ければ最初の INDI", () => {
    expect(findRootId(treeOf("0 @X9@ INDI", "0 @X2@ INDI"))).toBe("X9");
  });

  it("INDI が無ければ undefined", () => {
    expect(findRootId(treeOf())).toBeUndefined();
  });
});
