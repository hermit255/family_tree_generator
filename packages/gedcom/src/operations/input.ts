import { z } from "zod";
import { TreeOperationError } from "./errors";

/** 人物の入力。フォーム(apps/web)と操作関数で共有する */
export const personInputSchema = z
  .object({
    givenName: z.string().trim().default(""),
    surname: z.string().trim().default(""),
    sex: z.enum(["M", "F", "X", "U"]).default("U"),
  })
  .refine((v) => v.givenName !== "" || v.surname !== "", {
    message: "姓または名を入力してください",
    path: ["givenName"],
  });

export type PersonInput = z.input<typeof personInputSchema>;
export type ValidPersonInput = z.output<typeof personInputSchema>;

export const parsePersonInput = (input: PersonInput): ValidPersonInput => {
  const result = personInputSchema.safeParse(input);
  if (!result.success) {
    throw new TreeOperationError(result.error.issues[0]!.message);
  }
  return result.data;
};
