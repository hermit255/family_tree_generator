import type { ParentRole, Sex } from "@kakeizu/gedcom";

/** 親の性別は男女から必須で選ぶ。続柄が決まっていない場合は性別で続柄を決める */
export const PARENT_SEX_OPTIONS: Sex[] = ["M", "F"];
export const ROLE_BY_SEX: Partial<Record<Sex, ParentRole>> = { M: "father", F: "mother" };
