"use client";

import { useId } from "react";
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string };

/** 選択肢から1つを選ぶ欄。vertical なら選択肢を縦に並べる */
export function ChoiceField({
  legend,
  description,
  options,
  value,
  onChange,
  vertical,
}: {
  legend: string;
  description?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  vertical?: boolean;
}) {
  const id = useId();
  return (
    <FieldSet>
      <FieldLegend variant="label">{legend}</FieldLegend>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as string)}
        className={cn("flex gap-4", vertical ? "flex-col gap-3" : "flex-wrap")}
      >
        {options.map((option) => (
          <Field key={option.value} orientation="horizontal" className="w-auto">
            <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
            <FieldLabel htmlFor={`${id}-${option.value}`} className="font-normal">
              {option.label}
            </FieldLabel>
          </Field>
        ))}
      </RadioGroup>
      {description && <FieldDescription>{description}</FieldDescription>}
    </FieldSet>
  );
}
