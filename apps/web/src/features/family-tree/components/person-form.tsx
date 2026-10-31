"use client";

import { personInputSchema, type PersonInput, type Sex } from "@kakeizu/gedcom";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const SEX_LABELS: Record<Sex, string> = { M: "男性", F: "女性", X: "その他", U: "不明" };

type Values = { givenName: string; surname: string; sex: Sex };
type Errors = Partial<Record<keyof Values, string>>;

type Props = {
  /** 初期値。表示中に性別の初期値が変わった場合(親の追加で続柄を切り替えた場合など)は性別の入力を追従させる */
  defaultValues?: PersonInput;
  submitLabel: string;
  /** 入力が妥当な場合に呼ばれる */
  onSubmit: (input: PersonInput) => void;
  onCancel?: () => void;
  /** 姓名の前に置く追加の入力欄 */
  children?: ReactNode;
};

export function PersonForm({ defaultValues, submitLabel, onSubmit, onCancel, children }: Props) {
  const id = useId();
  const defaultSex = defaultValues?.sex ?? "U";
  const [values, setValues] = useState<Values>({
    givenName: defaultValues?.givenName ?? "",
    surname: defaultValues?.surname ?? "",
    sex: defaultSex,
  });
  const [prevDefaultSex, setPrevDefaultSex] = useState(defaultSex);
  if (defaultSex !== prevDefaultSex) {
    setPrevDefaultSex(defaultSex);
    setValues((v) => ({ ...v, sex: defaultSex }));
  }
  const [errors, setErrors] = useState<Errors>({});

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = personInputSchema.safeParse(values);
    if (!result.success) {
      setErrors(
        Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message])) as Errors,
      );
      return;
    }
    setErrors({});
    onSubmit(result.data);
  };

  const set = (key: keyof Values) => (value: string) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        {children}
        <div className="grid grid-cols-2 gap-3">
          <Field data-invalid={!!errors.surname}>
            <FieldLabel htmlFor={`${id}-surname`}>姓</FieldLabel>
            <Input
              id={`${id}-surname`}
              value={values.surname}
              onChange={(e) => set("surname")(e.target.value)}
              aria-invalid={!!errors.surname}
            />
          </Field>
          <Field data-invalid={!!errors.givenName}>
            <FieldLabel htmlFor={`${id}-given`}>名</FieldLabel>
            <Input
              id={`${id}-given`}
              value={values.givenName}
              onChange={(e) => set("givenName")(e.target.value)}
              aria-invalid={!!errors.givenName}
            />
          </Field>
        </div>
        <FieldError>{errors.givenName ?? errors.surname}</FieldError>
        <FieldSet>
          <FieldLegend variant="label">性別</FieldLegend>
          <RadioGroup value={values.sex} onValueChange={(value) => set("sex")(value as Sex)} className="flex flex-wrap gap-4">
            {(Object.keys(SEX_LABELS) as Sex[]).map((sex) => (
              <Field key={sex} orientation="horizontal" className="w-auto">
                <RadioGroupItem value={sex} id={`${id}-sex-${sex}`} />
                <FieldLabel htmlFor={`${id}-sex-${sex}`} className="font-normal">
                  {SEX_LABELS[sex]}
                </FieldLabel>
              </Field>
            ))}
          </RadioGroup>
        </FieldSet>
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              キャンセル
            </Button>
          )}
          <Button type="submit">{submitLabel}</Button>
        </div>
      </FieldGroup>
    </form>
  );
}
