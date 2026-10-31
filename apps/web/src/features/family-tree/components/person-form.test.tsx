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

  it("sexOptions で性別の選択肢を絞り、選択肢に無い値は未選択として送信時にエラーにする", () => {
    const onSubmit = vi.fn();
    render(<PersonForm sexOptions={["M", "F"]} submitLabel="追加" onSubmit={onSubmit} />);
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "男性" })).not.toBeChecked();
    fireEvent.change(screen.getByLabelText("姓"), { target: { value: "山田" } });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(screen.getByText("性別を選択してください")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: "女性" }));
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(screen.queryByText("性別を選択してください")).toBeNull();
    expect(onSubmit).toHaveBeenCalledWith({ givenName: "", surname: "山田", sex: "F" });
  });
});
