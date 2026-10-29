import { useEffect, useState, type RefObject } from "react";

export type Size = { width: number; height: number };

/** 要素のサイズを ResizeObserver で追跡する。計測前は null */
export const useElementSize = (ref: RefObject<HTMLElement | null>): Size | null => {
  const [size, setSize] = useState<Size | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
};
