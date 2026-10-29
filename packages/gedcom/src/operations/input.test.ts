import { describe, expect, it } from "vitest";
import { TreeOperationError } from "./errors";
import { parsePersonInput } from "./input";

describe("parsePersonInput", () => {
  it("前後の空白を除去し、性別未入力は U", () => {
    expect(parsePersonInput({ givenName: " 太郎 ", surname: "" })).toEqual({ givenName: "太郎", surname: "", sex: "U" });
  });

  it("姓のみでもよい", () => {
    expect(parsePersonInput({ givenName: "", surname: "山田", sex: "F" })).toEqual({
      givenName: "",
      surname: "山田",
      sex: "F",
    });
  });

  it("姓・名の未指定は空文字", () => {
    expect(parsePersonInput({ surname: "山田" })).toEqual({ givenName: "", surname: "山田", sex: "U" });
  });

  it("姓名とも空ならエラー", () => {
    expect(() => parsePersonInput({ givenName: " ", surname: "" })).toThrow(
      new TreeOperationError("姓または名を入力してください"),
    );
  });
});
