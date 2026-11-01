import { describe, expect, it } from "vitest";
import { exportGedcom } from "./export";
import { importGedcom } from "./import";
import { adoptionLink, linkPedigree, pedigreeOf } from "./pedigree";

const treeOf = (...body: string[]) =>
  importGedcom(["0 HEAD", "1 GEDC", "2 VERS 7.0", ...body, "0 TRLR"].join("\n")).tree;

describe("linkPedigree / pedigreeOf", () => {
  const tree = treeOf(
    "0 @I1@ INDI",
    "1 FAMC @F1@",
    "1 FAMC @F2@",
    "2 PEDI ADOPTED",
    "1 FAMC @F3@",
    "2 PEDI ADOPTED",
    "3 PHRASE 特別養子",
    "1 FAMC @F4@",
    "2 PEDI FOSTER",
    "1 FAMC @F5@",
    "2 PEDI ADOPTED",
    "3 PHRASE 養子",
    "0 @F1@ FAM",
    "0 @F2@ FAM",
    "0 @F3@ FAM",
    "0 @F4@ FAM",
    "0 @F5@ FAM",
  );
  const person = tree.individuals[0]!;

  it.each([
    ["F1", "birth", "PEDI なし"],
    ["F2", "adopted", "PEDI ADOPTED"],
    ["F3", "special", "PEDI ADOPTED + PHRASE 特別養子"],
    ["F4", "birth", "ADOPTED 以外の PEDI"],
    ["F5", "adopted", "特別養子以外の PHRASE"],
  ])("%s は %s(%s)", (familyId, expected) => {
    expect(pedigreeOf(person, familyId)).toBe(expected);
  });

  it("子として属していない家族は undefined", () => {
    expect(pedigreeOf(person, "F9")).toBeUndefined();
  });

  it("adoptionLink は linkPedigree で読み戻せ、GEDCOM の PEDI として出力される", () => {
    expect(linkPedigree(adoptionLink("F1", "adopted"))).toBe("adopted");
    expect(linkPedigree(adoptionLink("F1", "special"))).toBe("special");
    const exported = exportGedcom({ ...tree, individuals: [{ ...person, familiesAsChild: [adoptionLink("F1", "special")] }] });
    expect(exported).toContain("1 FAMC @F1@\n2 PEDI ADOPTED\n3 PHRASE 特別養子\n");
  });
});
