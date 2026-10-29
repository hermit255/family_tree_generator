import { parseLine } from "./line";
import { GedcomSyntaxError, type GedcomNode } from "./types";

const BOM = "﻿";

/** GEDCOM 文字列を level 0 のレコード列に変換する */
export const parseGedcom = (source: string): GedcomNode[] => {
  const text = source.startsWith(BOM) ? source.slice(BOM.length) : source;
  const lines = text.split(/\r\n|\r|\n/);
  // 末尾の改行による空行は許容する
  if (lines.at(-1) === "") lines.pop();

  const records: GedcomNode[] = [];
  // stack[i] は level i のノード
  const stack: GedcomNode[] = [];

  lines.forEach((raw, index) => {
    const lineNumber = index + 1;
    const line = parseLine(raw, lineNumber);

    if (line.level > stack.length) {
      throw new GedcomSyntaxError(`level が飛んでいます(${line.level})`, lineNumber);
    }

    if (line.tag === "CONT") {
      const parent = stack[line.level - 1];
      if (!parent || line.xref !== undefined || line.pointer !== undefined) {
        throw new GedcomSyntaxError("不正な CONT です", lineNumber);
      }
      if (parent.pointer !== undefined) {
        throw new GedcomSyntaxError("ポインタ値に CONT は続けられません", lineNumber);
      }
      parent.value = `${parent.value ?? ""}\n${line.value ?? ""}`;
      stack.length = line.level;
      return;
    }

    const node: GedcomNode = { tag: line.tag, children: [] };
    if (line.xref !== undefined) node.xref = line.xref;
    if (line.value !== undefined) node.value = line.value;
    if (line.pointer !== undefined) node.pointer = line.pointer;

    if (line.level === 0) {
      records.push(node);
    } else {
      stack[line.level - 1]!.children.push(node);
    }
    stack.length = line.level;
    stack.push(node);
  });

  return records;
};
