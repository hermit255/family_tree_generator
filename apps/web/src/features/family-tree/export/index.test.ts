import { importGedcom } from "@kakeizu/gedcom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_GEDCOM } from "../sample";
import { createExportBlob, downloadBlob } from ".";

const image = vi.hoisted(() => ({
  renderTreeImage: vi.fn(() => ({ canvas: "canvas", width: 10, height: 20 })),
  imageToPngBlob: vi.fn(async () => new Blob(["png"])),
}));
const pdf = vi.hoisted(() => ({ imageToPdfBlob: vi.fn(async () => new Blob(["pdf"])) }));
vi.mock("./image", () => image);
vi.mock("./pdf", () => pdf);

const { tree } = importGedcom(SAMPLE_GEDCOM);

describe("createExportBlob", () => {
  it(".ged は GEDCOM 文字列", async () => {
    const blob = await createExportBlob("ged", { tree });
    expect(await blob.text()).toMatch(/^0 HEAD/);
  });

  it("PNG は家系図の画像を描いて PNG にする", async () => {
    const blob = await createExportBlob("png", { tree });
    expect(image.renderTreeImage).toHaveBeenCalledWith({ tree });
    expect(await blob.text()).toBe("png");
  });

  it("PDF は描いた画像を PDF に埋め込む", async () => {
    const blob = await createExportBlob("pdf", { tree });
    expect(pdf.imageToPdfBlob).toHaveBeenCalledWith({ canvas: "canvas", width: 10, height: 20 });
    expect(await blob.text()).toBe("pdf");
  });

  it("人物がいなければ画像は出力できない", async () => {
    await expect(createExportBlob("png", { tree: { ...tree, individuals: [] } })).rejects.toThrow("画像に出力する人物がいません");
  });
});

describe("downloadBlob", () => {
  // jsdom は createObjectURL を持たないため差し替え、テスト後に戻す
  const { createObjectURL, revokeObjectURL } = URL;
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
  });

  it("ファイル名を付けたリンクをクリックし、後で URL を解放する", () => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.href).toBe("blob:test");
      expect(this.download).toBe("kakeizu.ged");
    });

    downloadBlob(new Blob(["x"]), "kakeizu.ged");
    expect(click).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});
