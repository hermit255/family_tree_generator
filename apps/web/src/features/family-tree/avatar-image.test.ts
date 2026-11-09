import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AVATAR_PIXELS, AvatarImageError, loadImage, MAX_SOURCE_BYTES, resizeAvatar, useLoadedImage } from "./avatar-image";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const png = (size = 1) => {
  const file = new File(["a"], "a.png", { type: "image/png" });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

// jsdom は画像のデコード・canvas の描画をしないため差し替える。実際の縮小結果は E2E で確認する
const stubCanvas = (webpSupported: boolean) => {
  const bitmap = { width: 400, height: 300, close: vi.fn() };
  vi.stubGlobal("createImageBitmap", vi.fn(async () => bitmap));
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as never);
  const toDataURL = vi
    .spyOn(HTMLCanvasElement.prototype, "toDataURL")
    .mockImplementation((type) =>
      type === "image/webp" && !webpSupported ? "data:image/png;base64,AA==" : `data:${type};base64,AA==`,
    );
  return { bitmap, drawImage, toDataURL };
};

describe("resizeAvatar", () => {
  it("中央の正方形を切り抜いて縮小し、WebP の data URI にする", async () => {
    const { bitmap, drawImage } = stubCanvas(true);
    expect(await resizeAvatar(png())).toBe("data:image/webp;base64,AA==");
    expect(drawImage).toHaveBeenCalledWith(bitmap, 50, 0, 300, 300, 0, 0, AVATAR_PIXELS, AVATAR_PIXELS);
    expect(bitmap.close).toHaveBeenCalled();
  });

  it("WebP に対応しない場合は JPEG にする", async () => {
    stubCanvas(false);
    expect(await resizeAvatar(png())).toBe("data:image/jpeg;base64,AA==");
  });

  it("元画像が小さければ拡大しない", async () => {
    const { bitmap, drawImage } = stubCanvas(true);
    Object.assign(bitmap, { width: 100, height: 120 });
    await resizeAvatar(png());
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 10, 100, 100, 0, 0, 100, 100);
  });

  it("画像以外のファイルはエラー", async () => {
    await expect(resizeAvatar(new File(["a"], "a.txt", { type: "text/plain" }))).rejects.toThrow("画像ファイルを選択してください");
  });

  it("上限を超えるファイルはエラー", async () => {
    await expect(resizeAvatar(png(MAX_SOURCE_BYTES + 1))).rejects.toThrow("画像ファイルが大きすぎます(20MB まで)");
  });

  it("デコードできない画像はエラー", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => Promise.reject(new Error("decode"))));
    const result = resizeAvatar(png());
    await expect(result).rejects.toBeInstanceOf(AvatarImageError);
    await expect(result).rejects.toThrow("画像を読み込めませんでした");
  });
});

/** 読み込みの成否を後から決められる Image の代わり */
class FakeImage {
  static instances: FakeImage[] = [];
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";
  constructor() {
    FakeImage.instances.push(this);
  }
}

describe("loadImage / useLoadedImage", () => {
  const latest = () => FakeImage.instances.at(-1)!;

  it("同じ画像は読み込み結果を共有する", async () => {
    vi.stubGlobal("Image", FakeImage);
    const first = loadImage("data:image/png;base64,A1==");
    expect(loadImage("data:image/png;base64,A1==")).toBe(first);
    latest().onload!();
    expect(await first).toBe(latest());
  });

  it("読み込めない画像は reject し、次回は読み込み直す", async () => {
    vi.stubGlobal("Image", FakeImage);
    const failed = loadImage("data:image/png;base64,A2==");
    latest().onerror!();
    await expect(failed).rejects.toThrow("画像を読み込めませんでした");
    expect(loadImage("data:image/png;base64,A2==")).not.toBe(failed);
  });

  it("読み込みが終わった画像を返し、画像が変わると読み込み直す", async () => {
    vi.stubGlobal("Image", FakeImage);
    const { result, rerender } = renderHook(({ src }: { src: string | undefined }) => useLoadedImage(src), {
      initialProps: { src: "data:image/png;base64,A3==" as string | undefined },
    });
    expect(result.current).toBeUndefined();
    const image = latest();
    act(() => image.onload!());
    await waitFor(() => expect(result.current).toBe(image));
    rerender({ src: "data:image/png;base64,A4==" });
    expect(result.current).toBeUndefined();
    rerender({ src: undefined });
    expect(result.current).toBeUndefined();
  });

  it("読み込めない画像・読み込み中に外れた画像は返さない", async () => {
    vi.stubGlobal("Image", FakeImage);
    const { result, rerender } = renderHook(({ src }: { src: string }) => useLoadedImage(src), {
      initialProps: { src: "data:image/png;base64,A5==" },
    });
    const stale = latest();
    rerender({ src: "data:image/png;base64,A6==" });
    act(() => {
      stale.onload!();
      latest().onerror!();
    });
    await act(async () => {});
    expect(result.current).toBeUndefined();
  });
});
