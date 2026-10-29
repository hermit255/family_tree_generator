/**
 * GEDCOM 7.0 の構文木。タグの意味には関与しない。
 * - value: 文字列ペイロード(CONT は改行として結合済み、先頭 "@@" のエスケープは解除済み)
 * - pointer: ポインタペイロード(前後の "@" を除いた xref。"@VOID@" は "VOID")
 */
export type GedcomNode = {
  tag: string;
  xref?: string;
  value?: string;
  pointer?: string;
  children: GedcomNode[];
};

export class GedcomSyntaxError extends Error {
  constructor(
    message: string,
    readonly lineNumber: number,
  ) {
    super(`${lineNumber}行目: ${message}`);
    this.name = "GedcomSyntaxError";
  }
}
