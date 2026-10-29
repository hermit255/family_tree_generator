"use client";

import { canDeleteIndividual, type Individual, type PersonInput } from "@kakeizu/gedcom";
import { XIcon } from "lucide-react";
import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { displayName } from "../layout";
import { useFamilyTreeStore } from "../store";
import { PersonForm, SEX_LABELS } from "./person-form";

function DeleteSection({ person }: { person: Individual }) {
  const tree = useFamilyTreeStore((s) => s.tree)!;
  const remove = useFamilyTreeStore((s) => s.remove);
  const check = canDeleteIndividual(tree, person.id);
  const name = displayName(person);

  const confirm = () => {
    const result = remove(person.id);
    if (result.ok) {
      toast.success(`${name} を削除しました`);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" disabled={!check.ok} />}>削除</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{name} を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>この操作は取り消せません。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirm}>
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {!check.ok && <p className="text-sm text-muted-foreground">{check.reason}</p>}
    </div>
  );
}

function PersonView({ person, onEdit }: { person: Individual; onEdit: () => void }) {
  const rows: [string, string][] = [
    ["姓", person.surname || "-"],
    ["名", person.givenName || "-"],
    ["性別", person.sex ? SEX_LABELS[person.sex] : "-"],
    ["ID", person.id],
  ];
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[4rem_1fr] gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <Button onClick={onEdit} className="self-end">
        編集
      </Button>
    </div>
  );
}

function PersonEdit({ person, onDone }: { person: Individual; onDone: () => void }) {
  const update = useFamilyTreeStore((s) => s.update);
  const save = (input: PersonInput) => {
    const result = update(person.id, input);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("保存しました");
    onDone();
  };
  return (
    <div className="flex flex-col gap-6">
      <PersonForm defaultValues={person} submitLabel="保存" onSubmit={save} onCancel={onDone} />
      <Separator />
      <DeleteSection person={person} />
    </div>
  );
}

/** 中心人物の詳細。人物が変わるたびに閲覧モードへ戻すため、呼び出し側で key に人物 ID を渡す */
function PersonDetail({ person }: { person: Individual }) {
  const [editing, setEditing] = useState(false);
  return editing ? (
    <PersonEdit person={person} onDone={() => setEditing(false)} />
  ) : (
    <PersonView person={person} onEdit={() => setEditing(true)} />
  );
}

/** 詳細パネルの中身。showClose は独自の閉じるボタンを持たない入れ物(デスクトップ表示)で使う */
export function DetailPanel({ showClose }: { showClose?: boolean }) {
  const person = useFamilyTreeStore((s) => s.tree?.individuals.find((i) => i.id === s.centerId));
  const closeDetail = useFamilyTreeStore((s) => s.closeDetail);
  if (!person) return null;

  return (
    <section className="flex flex-col gap-4 p-4" aria-label="人物の詳細">
      <header className="flex items-center justify-between gap-2 pr-8 md:pr-0">
        <h2 className="truncate text-lg font-semibold">{displayName(person)}</h2>
        {showClose && (
          <Button variant="ghost" size="icon-sm" onClick={closeDetail} aria-label="詳細を閉じる">
            <XIcon />
          </Button>
        )}
      </header>
      <PersonDetail key={person.id} person={person} />
    </section>
  );
}
