"use client";

import { avatarOf, type Individual } from "@kakeizu/gedcom";
import { UserIcon } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AvatarImageError, resizeAvatar } from "../avatar-image";
import { displayName } from "../layout";
import { useFamilyTreeStore } from "../store";

/** 詳細パネルの写真。画像ファイルを縮小して設定・差し替え、確認のうえ削除する */
export function AvatarSection({ person }: { person: Individual }) {
  // avatarOf は毎回新しいオブジェクトを返すため、比較できる文字列を選ぶ
  const avatar = useFamilyTreeStore((s) => (s.tree ? avatarOf(s.tree, person.id)?.dataUri : undefined));
  const setAvatar = useFamilyTreeStore((s) => s.setAvatar);
  const removeAvatar = useFamilyTreeStore((s) => s.removeAvatar);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const name = displayName(person);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // 同じファイルを続けて選べるようにする
    if (!file) return;
    setBusy(true);
    try {
      const result = setAvatar(person.id, await resizeAvatar(file));
      if (result.ok) {
        toast.success("写真を設定しました");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      if (!(error instanceof AvatarImageError)) throw error;
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = () => {
    const result = removeAvatar(person.id);
    if (result.ok) {
      toast.success("写真を削除しました");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {avatar ? (
        // data URI を表示するため next/image の最適化は使わない
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt={`${name} の写真`} className="size-20 shrink-0 rounded-full border object-cover" />
      ) : (
        <div
          className="flex size-20 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground"
          aria-label="写真なし"
          role="img"
        >
          <UserIcon className="size-8" />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {avatar ? "写真を変更" : "写真を設定"}
        </Button>
        {avatar && (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="ghost" size="sm" />}>写真を削除</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{name} の写真を削除しますか？</AlertDialogTitle>
                <AlertDialogDescription>この操作は取り消せません。</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={confirmRemove}>
                  削除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        data-testid="avatar-input"
      />
    </div>
  );
}
