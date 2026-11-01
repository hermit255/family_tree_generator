import { ADOPTION_DASH, ADOPTION_LEGEND, COLORS } from "../tree-shapes";

/** 家系図の左上に重ねる凡例(養親子の破線)。canvas の操作を妨げないようクリックを透過する */
export function TreeLegend() {
  return (
    <div
      className="pointer-events-none absolute top-2 left-2 flex items-center gap-2 rounded-md border bg-background/90 px-2 py-1 text-xs"
      data-testid="tree-legend"
    >
      <svg width="32" height="8" aria-hidden>
        <line x1="0" y1="4" x2="32" y2="4" stroke={COLORS.line} strokeWidth="1.5" strokeDasharray={ADOPTION_DASH.join(" ")} />
      </svg>
      <span>{ADOPTION_LEGEND}</span>
    </div>
  );
}
