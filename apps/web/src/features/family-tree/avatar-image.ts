import { useEffect, useState } from "react";

/** 保存する写真の一辺(px)。ノード上は 36px で表示し、画像出力(2倍)や詳細パネルでも粗くならない大きさ */
export const AVATAR_PIXELS = 192;
const QUALITY = 0.8;
/** 読み込む元画像の上限。縮小して保存するが、極端に大きいファイルの読み込みは避ける */
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

export class AvatarImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvatarImageError";
  }
}

/**
 * 画像ファイルを中央で正方形に切り抜き、AVATAR_PIXELS 四方に縮小した data URI にする。
 * localStorage の容量に収めるため WebP(非対応のブラウザでは JPEG)で圧縮する
 */
export const resizeAvatar = async (file: File): Promise<string> => {
  if (!file.type.startsWith("image/")) throw new AvatarImageError("画像ファイルを選択してください");
  if (file.size > MAX_SOURCE_BYTES) throw new AvatarImageError("画像ファイルが大きすぎます(20MB まで)");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new AvatarImageError("画像を読み込めませんでした");
  }
  try {
    const size = Math.min(bitmap.width, bitmap.height);
    const output = Math.min(AVATAR_PIXELS, size);
    const canvas = document.createElement("canvas");
    canvas.width = output;
    canvas.height = output;
    const context = canvas.getContext("2d")!;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, output, output);
    const webp = canvas.toDataURL("image/webp", QUALITY);
    // WebP に対応しないブラウザは PNG を返すため、JPEG で作り直す
    return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", QUALITY);
  } finally {
    bitmap.close();
  }
};

const cache = new Map<string, Promise<HTMLImageElement>>();

/** data URI の画像を読み込む(同じ画像は読み込み結果を共有する)。読み込めない画像は reject */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  const cached = cache.get(src);
  if (cached) return cached;
  const loading = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("画像を読み込めませんでした"));
    image.src = src;
  });
  loading.catch(() => cache.delete(src));
  cache.set(src, loading);
  return loading;
};

/** 画像を読み込み、完了したら返す。読み込み中・読み込めない場合は undefined */
export const useLoadedImage = (src: string | undefined): HTMLImageElement | undefined => {
  const [loaded, setLoaded] = useState<{ src: string; image: HTMLImageElement }>();
  useEffect(() => {
    if (!src) return;
    let active = true;
    loadImage(src).then(
      (image) => active && setLoaded({ src, image }),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [src]);
  return loaded && loaded.src === src ? loaded.image : undefined;
};
