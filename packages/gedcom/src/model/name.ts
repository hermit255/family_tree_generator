import type { GedcomNode } from "../syntax";

type PersonalName = { givenName: string; surname: string; nameExtras: GedcomNode[] };

// "名 /姓/ 接尾" 形式。姓の前後を名として扱う
const NAME_PATTERN = /^(.*?)\s*\/(.*?)\/\s*(.*)$/;

const splitNameValue = (value: string): { givenName: string; surname: string } => {
  const match = NAME_PATTERN.exec(value);
  if (!match) return { givenName: value.trim(), surname: "" };
  const [, before, surname, after] = match;
  return {
    givenName: [before, after].filter(Boolean).join(" "),
    surname: surname!.trim(),
  };
};

/** GIVN/SURN を優先し、無ければ NAME の値から分解する */
export const readName = (node: GedcomNode): PersonalName => {
  const parsed = splitNameValue(node.value ?? "");
  const givn = node.children.find((c) => c.tag === "GIVN")?.value;
  const surn = node.children.find((c) => c.tag === "SURN")?.value;
  return {
    givenName: givn ?? parsed.givenName,
    surname: surn ?? parsed.surname,
    nameExtras: node.children.filter((c) => c.tag !== "GIVN" && c.tag !== "SURN"),
  };
};

/** NAME "名 /姓/" と GIVN/SURN の両方を出力する。何も無ければ undefined */
export const writeName = ({ givenName, surname, nameExtras }: PersonalName): GedcomNode | undefined => {
  if (!givenName && !surname && nameExtras.length === 0) return undefined;
  const children: GedcomNode[] = [];
  if (givenName) children.push({ tag: "GIVN", value: givenName, children: [] });
  if (surname) children.push({ tag: "SURN", value: surname, children: [] });
  const node: GedcomNode = { tag: "NAME", children: [...children, ...nameExtras] };
  const value = [givenName, surname && `/${surname}/`].filter(Boolean).join(" ");
  if (value) node.value = value;
  return node;
};
