import { formatLine } from "./line";
import type { GedcomNode } from "./types";

const writeNode = (node: GedcomNode, level: number, out: string[]): void => {
  const [first, ...rest] = node.value?.split("\n") ?? [];
  out.push(
    formatLine({
      level,
      tag: node.tag,
      xref: node.xref,
      pointer: node.pointer,
      value: first,
    }),
  );
  for (const cont of rest) {
    out.push(formatLine({ level: level + 1, tag: "CONT", value: cont }));
  }
  for (const child of node.children) {
    writeNode(child, level + 1, out);
  }
};

/** level 0 のレコード列を GEDCOM 文字列に変換する(改行は LF、末尾改行あり) */
export const serializeGedcom = (records: GedcomNode[]): string => {
  const out: string[] = [];
  for (const record of records) {
    writeNode(record, 0, out);
  }
  return `${out.join("\n")}\n`;
};
