"use client";

import { MenuIcon } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFamilyTreeStore } from "../store";

/** .ged の選択 → 置き換えの確認 → 読み込み → 補完警告の表示 */
function useImportFlow() {
  const inputRef = useRef<HTMLInputElement>(null);
  const importText = useFamilyTreeStore((s) => s.importText);
  const [pending, setPending] = useState<{ name: string; text: string } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const choose = () => inputRef.current?.click();

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 同じファイルを再選択しても change が発火するようにする
    event.target.value = "";
    if (file) setPending({ name: file.name, text: await file.text() });
  };

  const confirm = () => {
    if (!pending) return;
    const result = importText(pending.text);
    setPending(null);
    if (!result.ok) {
      toast.error(`読み込みに失敗しました: ${result.error}`);
      return;
    }
    const { warnings } = useFamilyTreeStore.getState();
    if (warnings.length > 0) {
      setWarnings(warnings);
    } else {
      toast.success(`${pending.name} を読み込みました`);
    }
  };

  const dialogs = (
    <>
      <input ref={inputRef} type="file" accept=".ged" className="hidden" onChange={handleFile} data-testid="import-input" />
      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.name} を読み込みますか？</AlertDialogTitle>
            <AlertDialogDescription>現在のデータは破棄され、読み込んだデータに置き換わります。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirm}>読み込む</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={warnings.length > 0} onOpenChange={(open) => !open && setWarnings([])}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>読み込みました</DialogTitle>
            <DialogDescription>片方向のみのリンクを補完しました({warnings.length}件)。</DialogDescription>
          </DialogHeader>
          <ul className="max-h-60 list-disc overflow-y-auto pl-5 text-sm">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  );

  return { choose, dialogs };
}

export function AppHeader() {
  const importFlow = useImportFlow();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
      <h1 className="font-semibold">家系図</h1>
      <div className="hidden gap-2 md:flex">
        <Button variant="outline" size="sm" onClick={importFlow.choose}>
          インポート
        </Button>
      </div>
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="メニュー" />}>
            <MenuIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={importFlow.choose}>インポート</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {importFlow.dialogs}
    </header>
  );
}
