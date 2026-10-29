"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { DESKTOP_QUERY, useMediaQuery } from "@/hooks/use-media-query";
import { useFamilyTreeStore } from "../store";
import { AddPersonDialog, type AddMode } from "./add-person-dialog";
import { AppHeader } from "./app-header";
import { DetailPanel } from "./detail-panel";
import { FamilyTreeView } from "./family-tree-view";

/** スマホの下部シートの高さ(画面に対する割合) */
const SHEET_RATIO = 0.5;

export function FamilyTreeApp() {
  const hydrate = useFamilyTreeStore((s) => s.hydrate);
  const detailOpen = useFamilyTreeStore((s) => s.detailOpen);
  const closeDetail = useFamilyTreeStore((s) => s.closeDetail);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [addMode, setAddMode] = useState<AddMode | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader />
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <FamilyTreeView focusRatio={!isDesktop && detailOpen ? 1 - SHEET_RATIO : 1} onAdd={setAddMode} />
        </div>
        {isDesktop && detailOpen && (
          <aside className="w-1/2 overflow-y-auto border-l">
            <DetailPanel showClose />
          </aside>
        )}
      </div>
      {/* スマホ: 背後の家系図を操作できるよう非モーダルの下部シートにする */}
      <Sheet
        open={!isDesktop && detailOpen}
        onOpenChange={(open) => !open && closeDetail()}
        modal={false}
        disablePointerDismissal
      >
        <SheetContent side="bottom" showOverlay={false} className="max-h-[50dvh] overflow-y-auto">
          <SheetTitle className="sr-only">人物の詳細</SheetTitle>
          <DetailPanel />
        </SheetContent>
      </Sheet>
      <AddPersonDialog mode={addMode} onClose={() => setAddMode(null)} />
      <Toaster position="top-center" richColors />
    </div>
  );
}
