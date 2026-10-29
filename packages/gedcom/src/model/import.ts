import { parseGedcom, type GedcomNode } from "../syntax";
import { readName } from "./name";
import {
  GedcomImportError,
  type Family,
  type FamilyTree,
  type Header,
  type Individual,
  type Link,
  type Sex,
  type Submitter,
} from "./types";

export type ImportResult = { tree: FamilyTree; warnings: string[] };

const SEXES: readonly string[] = ["M", "F", "X", "U"] satisfies Sex[];
const VOID = "VOID";

/** ポインタを Link に変換する。@VOID@ はリンク無しとして undefined */
const readLink = (node: GedcomNode, owner: string): Link | undefined => {
  if (node.pointer === undefined) {
    throw new GedcomImportError(`${owner} の ${node.tag} にポインタがありません`);
  }
  return node.pointer === VOID ? undefined : { id: node.pointer, extras: node.children };
};

const pushLink = (links: Link[], node: GedcomNode, owner: string): void => {
  const link = readLink(node, owner);
  if (link) links.push(link);
};

const requireXref = (record: GedcomNode): string => {
  if (record.xref === undefined) {
    throw new GedcomImportError(`${record.tag} レコードに xref がありません`);
  }
  return record.xref;
};

const readHeader = (record: GedcomNode): Header => {
  const header: Header = { extras: [] };
  let version: string | undefined;
  for (const child of record.children) {
    if (child.tag === "GEDC") {
      version = child.children.find((c) => c.tag === "VERS")?.value;
    } else if (child.tag === "SUBM" && header.submitter === undefined) {
      header.submitter = readLink(child, "HEAD");
    } else {
      header.extras.push(child);
    }
  }
  if (!version?.startsWith("7.")) {
    throw new GedcomImportError(`GEDCOM 7.x のみ対応しています(VERS: ${version ?? "なし"})`);
  }
  return header;
};

const readSubmitter = (record: GedcomNode): Submitter => {
  const submitter: Submitter = { id: requireXref(record), name: "", extras: [] };
  let named = false;
  for (const child of record.children) {
    if (child.tag === "NAME" && !named) {
      submitter.name = child.value ?? "";
      named = true;
    } else {
      submitter.extras.push(child);
    }
  }
  return submitter;
};

const readIndividual = (record: GedcomNode): Individual => {
  const id = requireXref(record);
  const individual: Individual = {
    id,
    givenName: "",
    surname: "",
    nameExtras: [],
    familiesAsSpouse: [],
    familiesAsChild: [],
    extras: [],
  };
  let named = false;
  for (const child of record.children) {
    if (child.tag === "NAME" && !named) {
      Object.assign(individual, readName(child));
      named = true;
    } else if (child.tag === "SEX" && individual.sex === undefined) {
      if (!SEXES.includes(child.value ?? "")) {
        throw new GedcomImportError(`${id} の SEX が不正です: ${child.value ?? "(なし)"}`);
      }
      individual.sex = child.value as Sex;
    } else if (child.tag === "FAMS") {
      pushLink(individual.familiesAsSpouse, child, id);
    } else if (child.tag === "FAMC") {
      pushLink(individual.familiesAsChild, child, id);
    } else {
      individual.extras.push(child);
    }
  }
  return individual;
};

const readFamily = (record: GedcomNode): Family => {
  const id = requireXref(record);
  const family: Family = { id, children: [], extras: [] };
  for (const child of record.children) {
    if (child.tag === "HUSB" || child.tag === "WIFE") {
      const key = child.tag === "HUSB" ? "husband" : "wife";
      if (key in family) {
        throw new GedcomImportError(`${id} に ${child.tag} が複数あります`);
      }
      family[key] = readLink(child, id);
    } else if (child.tag === "CHIL") {
      pushLink(family.children, child, id);
    } else {
      family.extras.push(child);
    }
  }
  return family;
};

/** 全リンクの参照先が存在し、期待するレコード種別であることを検証する */
const validateReferences = (tree: FamilyTree, records: GedcomNode[]): void => {
  const kinds = new Map<string, string>();
  for (const record of records) {
    if (record.xref === undefined) continue;
    if (kinds.has(record.xref)) {
      throw new GedcomImportError(`xref @${record.xref}@ が重複しています`);
    }
    kinds.set(record.xref, record.tag);
  }

  const check = (link: Link | undefined, expected: string, owner: string): void => {
    if (link === undefined) return;
    const actual = kinds.get(link.id);
    if (actual === undefined) {
      throw new GedcomImportError(`${owner} が存在しない @${link.id}@ を参照しています`);
    }
    if (actual !== expected) {
      throw new GedcomImportError(`${owner} の参照先 @${link.id}@ は ${expected} ではありません`);
    }
  };

  check(tree.header.submitter, "SUBM", "HEAD");
  for (const individual of tree.individuals) {
    for (const link of [...individual.familiesAsSpouse, ...individual.familiesAsChild]) {
      check(link, "FAM", individual.id);
    }
  }
  for (const family of tree.families) {
    for (const link of [family.husband, family.wife, ...family.children]) {
      check(link, "INDI", family.id);
    }
  }
};

/** 片方向のみのリンクを双方向に補完し、警告を返す */
const completeLinks = (tree: FamilyTree): string[] => {
  const warnings: string[] = [];
  const individuals = new Map(tree.individuals.map((i) => [i.id, i]));
  const families = new Map(tree.families.map((f) => [f.id, f]));

  for (const individual of tree.individuals) {
    for (const { id } of individual.familiesAsSpouse) {
      const family = families.get(id)!;
      if (family.husband?.id === individual.id || family.wife?.id === individual.id) continue;
      const slot =
        individual.sex === "F" ? "wife" : individual.sex === "M" ? "husband" : family.husband ? "wife" : "husband";
      if (family[slot]) {
        throw new GedcomImportError(`${individual.id} を ${id} の配偶者として補完できません(枠が埋まっています)`);
      }
      family[slot] = { id: individual.id, extras: [] };
      warnings.push(`${id} に配偶者 ${individual.id} を補完しました`);
    }
    for (const { id } of individual.familiesAsChild) {
      const family = families.get(id)!;
      if (family.children.some((c) => c.id === individual.id)) continue;
      family.children.push({ id: individual.id, extras: [] });
      warnings.push(`${id} に子 ${individual.id} を補完しました`);
    }
  }

  for (const family of tree.families) {
    for (const spouse of [family.husband, family.wife]) {
      if (spouse === undefined) continue;
      const individual = individuals.get(spouse.id)!;
      if (individual.familiesAsSpouse.some((l) => l.id === family.id)) continue;
      individual.familiesAsSpouse.push({ id: family.id, extras: [] });
      warnings.push(`${spouse.id} に FAMS ${family.id} を補完しました`);
    }
    for (const child of family.children) {
      const individual = individuals.get(child.id)!;
      if (individual.familiesAsChild.some((l) => l.id === family.id)) continue;
      individual.familiesAsChild.push({ id: family.id, extras: [] });
      warnings.push(`${child.id} に FAMC ${family.id} を補完しました`);
    }
  }
  return warnings;
};

/** GEDCOM 文字列を家系図モデルに変換する */
export const importGedcom = (source: string): ImportResult => {
  const records = parseGedcom(source);
  const head = records[0];
  const trlr = records.at(-1);
  if (head?.tag !== "HEAD") throw new GedcomImportError("先頭に HEAD がありません");
  if (records.length < 2 || trlr?.tag !== "TRLR") throw new GedcomImportError("末尾に TRLR がありません");

  const tree: FamilyTree = {
    header: readHeader(head),
    submitters: [],
    individuals: [],
    families: [],
    extraRecords: [],
  };
  const body = records.slice(1, -1);
  for (const record of body) {
    if (record.tag === "HEAD" || record.tag === "TRLR") {
      throw new GedcomImportError(`${record.tag} が先頭・末尾以外にあります`);
    } else if (record.tag === "SUBM") {
      tree.submitters.push(readSubmitter(record));
    } else if (record.tag === "INDI") {
      tree.individuals.push(readIndividual(record));
    } else if (record.tag === "FAM") {
      tree.families.push(readFamily(record));
    } else {
      tree.extraRecords.push(record);
    }
  }

  validateReferences(tree, body);
  return { tree, warnings: completeLinks(tree) };
};
