import type { GedcomNode } from "../syntax";
import type { Individual, Link } from "./types";

/**
 * 親の家族との関係(FAMC.PEDI)。
 * - birth: 実子(PEDI なし・ADOPTED 以外)
 * - adopted: 普通養子(PEDI ADOPTED)
 * - special: 特別養子(PEDI ADOPTED + PHRASE 特別養子)
 */
export type Pedigree = "birth" | "adopted" | "special";

export const SPECIAL_ADOPTION_PHRASE = "特別養子";

/** FAMC リンクの PEDI から関係を読む。BIRTH 以外の FOSTER・SEALING・OTHER も実子と同じ扱い */
export const linkPedigree = (link: Link): Pedigree => {
  const pedi = link.extras.find((node) => node.tag === "PEDI");
  if (pedi?.value !== "ADOPTED") return "birth";
  return pedi.children.some((node) => node.tag === "PHRASE" && node.value === SPECIAL_ADOPTION_PHRASE)
    ? "special"
    : "adopted";
};

/** 人物と親の家族 familyId との関係。子として属していなければ undefined */
export const pedigreeOf = (individual: Individual, familyId: string): Pedigree | undefined => {
  const link = individual.familiesAsChild.find((l) => l.id === familyId);
  return link && linkPedigree(link);
};

const pediNode = (pedigree: Exclude<Pedigree, "birth">): GedcomNode => ({
  tag: "PEDI",
  value: "ADOPTED",
  children: pedigree === "special" ? [{ tag: "PHRASE", value: SPECIAL_ADOPTION_PHRASE, children: [] }] : [],
});

/** 養子縁組の FAMC リンク */
export const adoptionLink = (familyId: string, pedigree: Exclude<Pedigree, "birth">): Link => ({
  id: familyId,
  extras: [pediNode(pedigree)],
});
