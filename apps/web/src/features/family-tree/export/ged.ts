import { exportGedcom } from "@kakeizu/gedcom";
import type { ExportTarget } from "./target";

/** GEDCOM 7 の media type */
const GEDCOM_TYPE = "text/vnd.familysearch.gedcom";

export const gedBlob = (target: ExportTarget): Blob => new Blob([exportGedcom(target.tree)], { type: GEDCOM_TYPE });
