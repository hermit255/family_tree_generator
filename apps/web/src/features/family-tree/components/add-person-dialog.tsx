"use client";

import {
  availableParentRoles,
  PARENT_DEFAULT_SEX,
  type FamilyTree,
  type ParentRole,
  type PersonInput,
  type Sex,
} from "@kakeizu/gedcom";
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

/** 親・子の追加では選択中の人物の姓を初期値にする */
const inheritedSurname = (mode: AddMode, tree: FamilyTree): string | undefined => {
  const id = mode.kind === "parent" ? mode.childId : mode.kind === "child" ? mode.parentId : undefined;
  return tree.individuals.find((i) => i.id === id)?.surname;
};

/** 配偶者の追加では選択中の人物と異なる性を初期値にする(男女以外は不明) */
const OPPOSITE_SEX: Partial<Record<Sex, Sex>> = { M: "F", F: "M" };

/** 親の性別は男女から必須で選ぶ。父母とも追加できる場合は性別で続柄を決める */
const PARENT_SEX_OPTIONS: Sex[] = ["M", "F"];
const ROLE_BY_SEX: Partial<Record<Sex, ParentRole>> = { M: "father", F: "mother" };

/** 性別の初期値。続柄が決まっている親はその既定値、配偶者は選択中の人物と異なる性 */
const defaultSex = (mode: AddMode, tree: FamilyTree, role: ParentRole | undefined): Sex | undefined => {
  if (role) return PARENT_DEFAULT_SEX[role];
  if (mode.kind !== "spouse") return undefined;
  const sex = tree.individuals.find((i) => i.id === mode.personId)?.sex;
  return sex && OPPOSITE_SEX[sex];
};

function AddPersonForm({ mode, tree, onDone }: { mode: AddMode; tree: FamilyTree; onDone: () => void }) {
  const actions = useFamilyTreeStore.getState();
  const roles = mode.kind === "parent" ? availableParentRoles(tree, mode.childId) : [];
  // 追加できる続柄が1つならそれに決まる。2つなら入力された性別で決める
  const role = roles.length === 1 ? roles[0] : undefined;

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
        result = actions.addParent(mode.childId, role ?? ROLE_BY_SEX[input.sex!]!, input);
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
    <PersonForm
      defaultValues={{ surname: inheritedSurname(mode, tree), sex: defaultSex(mode, tree, role) }}
      sexOptions={mode.kind === "parent" ? PARENT_SEX_OPTIONS : undefined}
      submitLabel="追加"
      onSubmit={submit}
      onCancel={onDone}
    >
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
      const note = roles.length === 1 ? "" : "(性別で父・母を決めます)";
      return { title, description: `${nameOf(tree, mode.childId)} の親${note}` };
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
