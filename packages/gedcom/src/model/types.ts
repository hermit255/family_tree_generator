import type { GedcomNode } from "../syntax";

export type Sex = "M" | "F" | "X" | "U";

/**
 * 他レコードへのリンク。
 * extras にはリンク下位の未対応構造(PEDI, PHRASE 等)を保持する。
 */
export type Link = { id: string; extras: GedcomNode[] };

export type Individual = {
  id: string;
  givenName: string;
  surname: string;
  /** NAME 下位の GIVN/SURN 以外の構造 */
  nameExtras: GedcomNode[];
  sex?: Sex;
  familiesAsSpouse: Link[];
  familiesAsChild: Link[];
  /** 未対応の下位構造(エクスポート時にそのまま出力する) */
  extras: GedcomNode[];
};

export type Family = {
  id: string;
  husband?: Link;
  wife?: Link;
  children: Link[];
  extras: GedcomNode[];
};

export type Submitter = {
  id: string;
  name: string;
  extras: GedcomNode[];
};

export type Header = {
  submitter?: Link;
  extras: GedcomNode[];
};

export type FamilyTree = {
  header: Header;
  submitters: Submitter[];
  individuals: Individual[];
  families: Family[];
  /** 未対応のレコード(エクスポート時にそのまま出力する) */
  extraRecords: GedcomNode[];
};

export class GedcomImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GedcomImportError";
  }
}
