import { GedcomSyntaxError } from "./types";

export type GedcomLine = {
  level: number;
  tag: string;
  xref?: string;
  value?: string;
  pointer?: string;
};

// Line = Level D [Xref D] Tag [D LineVal]
const LINE_PATTERN =
  /^(0|[1-9][0-9]*) (?:@([A-Z0-9_]+)@ )?([A-Z_][A-Z0-9_]*)(?: (.*))?$/;
const POINTER_PATTERN = /^@([A-Z0-9_]+)@$/;

export const parseLine = (text: string, lineNumber: number): GedcomLine => {
  const match = LINE_PATTERN.exec(text);
  if (!match) {
    throw new GedcomSyntaxError(`不正な行です: "${text}"`, lineNumber);
  }
  const [, level, xref, tag, lineVal] = match;
  if (xref === "VOID") {
    throw new GedcomSyntaxError("@VOID@ はレコードの xref に使用できません", lineNumber);
  }

  const line: GedcomLine = { level: Number(level), tag: tag! };
  if (xref !== undefined) line.xref = xref;
  if (lineVal === undefined || lineVal === "") return line;

  const pointer = POINTER_PATTERN.exec(lineVal);
  if (pointer) {
    line.pointer = pointer[1];
  } else if (lineVal.startsWith("@")) {
    if (!lineVal.startsWith("@@")) {
      throw new GedcomSyntaxError(`"@" で始まる値は "@@" でエスケープが必要です: "${lineVal}"`, lineNumber);
    }
    line.value = lineVal.slice(1);
  } else {
    line.value = lineVal;
  }
  return line;
};

export const formatLine = (line: GedcomLine): string => {
  const parts = [String(line.level)];
  if (line.xref !== undefined) parts.push(`@${line.xref}@`);
  parts.push(line.tag);
  if (line.pointer !== undefined) {
    parts.push(`@${line.pointer}@`);
  } else if (line.value !== undefined && line.value !== "") {
    parts.push(line.value.startsWith("@") ? `@${line.value}` : line.value);
  }
  return parts.join(" ");
};
