import { serializeGedcom, type GedcomNode } from "../syntax";
import { writeName } from "./name";
import type { Family, FamilyTree, Header, Individual, Link, Submitter } from "./types";

export const GEDCOM_VERSION = "7.0";

const linkNode = (tag: string, link: Link): GedcomNode => ({ tag, pointer: link.id, children: link.extras });

const headerNode = (header: Header): GedcomNode => ({
  tag: "HEAD",
  children: [
    { tag: "GEDC", children: [{ tag: "VERS", value: GEDCOM_VERSION, children: [] }] },
    ...(header.submitter ? [linkNode("SUBM", header.submitter)] : []),
    ...header.extras,
  ],
});

const submitterNode = (submitter: Submitter): GedcomNode => ({
  tag: "SUBM",
  xref: submitter.id,
  children: [{ tag: "NAME", value: submitter.name, children: [] }, ...submitter.extras],
});

const individualNode = (individual: Individual): GedcomNode => {
  const name = writeName(individual);
  return {
    tag: "INDI",
    xref: individual.id,
    children: [
      ...(name ? [name] : []),
      ...(individual.sex ? [{ tag: "SEX", value: individual.sex, children: [] }] : []),
      ...individual.familiesAsSpouse.map((l) => linkNode("FAMS", l)),
      ...individual.familiesAsChild.map((l) => linkNode("FAMC", l)),
      ...individual.extras,
    ],
  };
};

const familyNode = (family: Family): GedcomNode => ({
  tag: "FAM",
  xref: family.id,
  children: [
    ...(family.husband ? [linkNode("HUSB", family.husband)] : []),
    ...(family.wife ? [linkNode("WIFE", family.wife)] : []),
    ...family.children.map((l) => linkNode("CHIL", l)),
    ...family.extras,
  ],
});

/** 家系図モデルを GEDCOM 7.0 文字列に変換する */
export const exportGedcom = (tree: FamilyTree): string =>
  serializeGedcom([
    headerNode(tree.header),
    ...tree.submitters.map(submitterNode),
    ...tree.individuals.map(individualNode),
    ...tree.families.map(familyNode),
    ...tree.extraRecords,
    { tag: "TRLR", children: [] },
  ]);
