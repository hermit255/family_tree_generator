import { useSyncExternalStore } from "react";

/** メディアクエリの一致状態。サーバー描画時は false(モバイル優先) */
export const useMediaQuery = (query: string): boolean =>
  useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );

export const DESKTOP_QUERY = "(min-width: 768px)";
