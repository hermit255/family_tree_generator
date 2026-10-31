import { importGedcom } from "@kakeizu/gedcom";
import { describe, expect, it } from "vitest";
import { SAMPLE_GEDCOM } from "../sample";
import { gedBlob } from "./ged";

describe("gedBlob", () => {
  it("GEDCOM 7 の media type で、読み込み直すと同じデータになる", async () => {
    const { tree } = importGedcom(SAMPLE_GEDCOM);
    const blob = gedBlob({ tree });
    expect(blob.type).toBe("text/vnd.familysearch.gedcom");
    expect(importGedcom(await blob.text()).tree).toEqual(tree);
  });
});
