import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonForm } from "./person-form";

describe("PersonForm", () => {
  it("姓名とも空なら送信せずエラーを表示する", () => {
    const onSubmit = vi.fn();
    render(<PersonForm submitLabel="追加" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("姓または名を入力してください");
  });

  it("入力値(前後の空白除去・性別)を送信する", () => {
    const onSubmit = vi.fn();
    render(<PersonForm submitLabel="追加" onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("姓"), { target: { value: " 山田 " } });
    fireEvent.click(screen.getByRole("radio", { name: "女性" }));
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(onSubmit).toHaveBeenCalledWith({ givenName: "", surname: "山田", sex: "F" });
  });

  it("初期値を表示し、キャンセルできる", () => {
    const onCancel = vi.fn();
    render(
      <PersonForm
        defaultValues={{ givenName: "太郎", surname: "山田", sex: "M" }}
        submitLabel="保存"
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByLabelText("名")).toHaveValue("太郎");
    expect(screen.getByRole("radio", { name: "男性" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("onCancel が無ければキャンセルを表示しない", () => {
    render(<PersonForm submitLabel="追加" onSubmit={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "キャンセル" })).toBeNull();
  });

  it("性別の初期値が変わると、入力中の姓名を保ったまま性別を追従させる", () => {
    const { rerender } = render(<PersonForm defaultValues={{ sex: "M" }} submitLabel="追加" onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("姓"), { target: { value: "山田" } });
    rerender(<PersonForm defaultValues={{ sex: "F" }} submitLabel="追加" onSubmit={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "女性" })).toBeChecked();
    expect(screen.getByLabelText("姓")).toHaveValue("山田");
  });
});
