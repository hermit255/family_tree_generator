"use client";

import {
  adoptableFamilies,
  PARENT_DEFAULT_SEX,
  vacantAdoptiveFamilies,
  type AdoptionKind,
  type FamilyTree,
  type ParentRole,
  type PersonInput,
} from "@kakeizu/gedcom";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { displayName } from "../layout";
import { parentNamesOf } from "../relations";
import { useFamilyTreeStore, type ActionResult } from "../store";
import { ChoiceField } from "./choice-field";
import { PARENT_SEX_OPTIONS, ROLE_BY_SEX } from "./parent-roles";
import { PersonForm } from "./person-form";

const NEW_PARENT = "new";
const KIND_OPTIONS: { value: AdoptionKind; label: string }[] = [
  { value: "adopted", label: "普通養子" },
  { value: "special", label: "特別養子" },
];
const ADOPTIVE_LABELS: Record<ParentRole, string> = { father: "養父", mother: "養母" };

/**
 * 養子縁組の入力。養親は「新しい人物」「養親の枠が空いた縁組の家族への追加」「既存の家族」から選ぶ。
 * 既存の家族を選んだ場合は人物の入力欄を出さない
 */
export function AdoptionForm({ childId, tree, onDone }: { childId: string; tree: FamilyTree; onDone: () => void }) {
  const actions = useFamilyTreeStore.getState();
  const vacant = vacantAdoptiveFamilies(tree, childId);
  const families = adoptableFamilies(tree, childId);
  const [target, setTarget] = useState(NEW_PARENT);
  const [kind, setKind] = useState<AdoptionKind>("adopted");
  const vacancy = vacant.find((v) => `vacant:${v.family.id}` === target);
  const family = families.find((f) => `family:${f.id}` === target);

  const finish = <T,>(result: ActionResult<T>, message: (value: T) => string) => {
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(message(result.value));
    onDone();
  };

  const addParent = (input: PersonInput) => {
    const result = vacancy
      ? actions.addAdoptiveParent(childId, { familyId: vacancy.family.id }, vacancy.role, input)
      : actions.addAdoptiveParent(childId, { kind }, ROLE_BY_SEX[input.sex!]!, input);
    finish(result, (id) => {
      const added = useFamilyTreeStore.getState().tree!.individuals.find((i) => i.id === id)!;
      return `${displayName(added)} を追加しました`;
    });
  };

  const adopt = (event: FormEvent) => {
    event.preventDefault();
    finish(actions.adoptInto(childId, family!.id, kind), () => `${parentNamesOf(tree, family!)} の養子にしました`);
  };

  const fields = (
    <>
      <div className="max-h-56 overflow-y-auto">
        <ChoiceField
          legend="養親"
          vertical
          options={[
            { value: NEW_PARENT, label: "新しい人物を養親として追加" },
            ...vacant.map((v) => ({
              value: `vacant:${v.family.id}`,
              label: `${parentNamesOf(tree, v.family)} の${ADOPTIVE_LABELS[v.role]}を追加`,
            })),
            ...families.map((f) => ({ value: `family:${f.id}`, label: `${parentNamesOf(tree, f)} の養子にする` })),
          ]}
          value={target}
          onChange={setTarget}
        />
      </div>
      {!vacancy && (
        <ChoiceField
          legend="縁組の種類"
          description="特別養子は養親と実線で結び、実親とは線を引きません"
          options={KIND_OPTIONS}
          value={kind}
          onChange={(value) => setKind(value as AdoptionKind)}
        />
      )}
    </>
  );

  if (family) {
    return (
      <form onSubmit={adopt}>
        <FieldGroup>
          {fields}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onDone}>
              キャンセル
            </Button>
            <Button type="submit">縁組する</Button>
          </div>
        </FieldGroup>
      </form>
    );
  }
  return (
    // 養親の枠を切り替えたら性別の初期値を変えるため、入力欄を作り直す
    <PersonForm
      key={target}
      defaultValues={{ sex: vacancy && PARENT_DEFAULT_SEX[vacancy.role] }}
      sexOptions={PARENT_SEX_OPTIONS}
      submitLabel="追加"
      onSubmit={addParent}
      onCancel={onDone}
    >
      {fields}
    </PersonForm>
  );
}
