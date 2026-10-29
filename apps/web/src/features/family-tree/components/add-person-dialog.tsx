"use client";

import { availableParentRoles, type FamilyTree, type ParentRole, type PersonInput } from "@kakeizu/gedcom";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { displayName } from "../layout";
import { spouseFamiliesOf } from "../relations";
import { useFamilyTreeStore, type ActionResult } from "../store";
import { PersonForm } from "./person-form";

export type AddMode =
  | { kind: "first" }
  | { kind: "parent"; childId: string }
  | { kind: "spouse"; personId: string }
  | { kind: "child"; parentId: string };

const PARENT_LABELS: Record<ParentRole, string> = { father: "父", mother: "母" };
const NO_SPOUSE = "none";

type Option = { value: string; label: string };

function ChoiceField({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <FieldSet>
      <FieldLegend variant="label">{legend}</FieldLegend>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as string)} className="flex flex-wrap gap-4">
        {options.map((option) => (
          <Field key={option.value} orientation="horizontal" className="w-auto">
            <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
            <FieldLabel htmlFor={`${id}-${option.value}`} className="font-normal">
              {option.label}
            </FieldLabel>
          </Field>
        ))}
      </RadioGroup>
    </FieldSet>
  );
}

const nameOf = (tree: FamilyTree, id: string) => {
  const person = tree.individuals.find((i) => i.id === id);
  return person ? displayName(person) : id;
};

function AddPersonForm({ mode, tree, onDone }: { mode: AddMode; tree: FamilyTree; onDone: () => void }) {
  const actions = useFamilyTreeStore.getState();
  const roles = mode.kind === "parent" ? availableParentRoles(tree, mode.childId) : [];
  const [role, setRole] = useState<ParentRole | undefined>(roles[0]);

  // 配偶者が2人以上いる場合のみ、どの配偶者との子かを選ばせる
  const partners = mode.kind === "child" ? spouseFamiliesOf(tree, mode.parentId).filter((s) => s.partner) : [];
  const [familyChoice, setFamilyChoice] = useState(partners[0]?.familyId ?? NO_SPOUSE);

  const submit = (input: PersonInput) => {
    let result: ActionResult<string>;
    switch (mode.kind) {
      case "first":
        result = actions.addFirst(input);
        break;
      case "parent":
        result = actions.addParent(mode.childId, role!, input);
        break;
      case "spouse":
        result = actions.addSpouse(mode.personId, input);
        break;
      case "child":
        result = actions.addChild(mode.parentId, familyChoice === NO_SPOUSE ? undefined : familyChoice, input);
        break;
    }
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${nameOf(useFamilyTreeStore.getState().tree!, result.value)} を追加しました`);
    onDone();
  };

  return (
    <PersonForm submitLabel="追加" hideSex={mode.kind === "parent"} onSubmit={submit} onCancel={onDone}>
      {roles.length > 1 && (
        <ChoiceField
          legend="続柄"
          options={roles.map((r) => ({ value: r, label: PARENT_LABELS[r] }))}
          value={role!}
          onChange={(v) => setRole(v as ParentRole)}
        />
      )}
      {partners.length > 1 && (
        <ChoiceField
          legend="どの配偶者との子か"
          options={[
            ...partners.map((p) => ({ value: p.familyId, label: displayName(p.partner!) })),
            { value: NO_SPOUSE, label: "配偶者なし" },
          ]}
          value={familyChoice}
          onChange={setFamilyChoice}
        />
      )}
    </PersonForm>
  );
}

const titleOf = (mode: AddMode, tree: FamilyTree): { title: string; description?: string } => {
  switch (mode.kind) {
    case "first":
      return { title: "最初の人物を追加" };
    case "parent": {
      const roles = availableParentRoles(tree, mode.childId);
      const title = roles.length === 1 ? `${PARENT_LABELS[roles[0]!]}を追加` : "親を追加";
      return { title, description: `${nameOf(tree, mode.childId)} の親` };
    }
    case "spouse":
      return { title: "配偶者を追加", description: `${nameOf(tree, mode.personId)} の配偶者(新しい家族として追加します)` };
    case "child":
      return { title: "子を追加", description: `${nameOf(tree, mode.parentId)} の子` };
  }
};

export function AddPersonDialog({ mode, onClose }: { mode: AddMode | null; onClose: () => void }) {
  const tree = useFamilyTreeStore((s) => s.tree);
  // 閉じるアニメーション中も内容を表示し続けるため、最後に開いた mode を保持する。
  // 開くたびに key を変えてフォームを初期化する
  const [current, setCurrent] = useState<{ mode: AddMode; key: number } | null>(null);
  if (mode && current?.mode !== mode) {
    setCurrent({ mode, key: (current?.key ?? 0) + 1 });
  }
  const heading = current && tree ? titleOf(current.mode, tree) : undefined;

  return (
    // トリガーを持たず mode で開くため、onOpenChange は閉じる方向の変化でのみ呼ばれる
    <Dialog open={!!mode} onOpenChange={onClose}>
      <DialogContent>
        {heading && (
          <DialogHeader>
            <DialogTitle>{heading.title}</DialogTitle>
            {heading.description && <DialogDescription>{heading.description}</DialogDescription>}
          </DialogHeader>
        )}
        {current && tree && <AddPersonForm key={current.key} mode={current.mode} tree={tree} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
