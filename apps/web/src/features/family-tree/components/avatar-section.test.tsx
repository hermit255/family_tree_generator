import { avatarOf } from "@kakeizu/gedcom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFamilyTreeStore } from "../store";
import { AvatarSection } from "./avatar-section";
import { person, setupStore, store } from "./test-utils";

const PNG = "data:image/png;base64,AA==";
const WEBP = "data:image/webp;base64,UklGRg==";

const resize = vi.hoisted(() => vi.fn());
vi.mock("../avatar-image", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../avatar-image")>()),
  resizeAvatar: resize,
}));

const showSection = () => render(<AvatarSection person={person("I1")!} />);
const chooseFile = () =>
  fireEvent.change(screen.getByTestId("avatar-input"), {
    target: { files: [new File(["a"], "a.png", { type: "image/png" })] },
  });
const avatar = () => avatarOf(store().tree!, "I1");

beforeEach(() => {
  vi.restoreAllMocks();
  resize.mockReset();
  setupStore("0 @I1@ INDI", "1 NAME 太郎 /山田/");
});

describe("AvatarSection", () => {
  it("写真が無ければ代わりのアイコンと「写真を設定」を表示する", () => {
    showSection();
    expect(screen.getByRole("img", { name: "写真なし" })).toBeVisible();
    expect(screen.getByRole("button", { name: "写真を設定" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "写真を削除" })).toBeNull();
  });

  it("選んだ画像を縮小して設定し、写真を表示する", async () => {
    const success = vi.spyOn(toast, "success");
    resize.mockResolvedValue(WEBP);
    showSection();
    chooseFile();
    expect(await screen.findByRole("img", { name: "山田 太郎 の写真" })).toHaveAttribute("src", WEBP);
    expect(avatar()?.dataUri).toBe(WEBP);
    expect(success).toHaveBeenCalledWith("写真を設定しました");
    expect(screen.getByRole("button", { name: "写真を変更" })).toBeEnabled();
  });

  it("ファイルを選ばなければ何もしない", () => {
    showSection();
    fireEvent.change(screen.getByTestId("avatar-input"), { target: { files: [] } });
    expect(resize).not.toHaveBeenCalled();
  });

  it("画像を読み込めない場合はトーストで表示する", async () => {
    const error = vi.spyOn(toast, "error");
    const { AvatarImageError } = await import("../avatar-image");
    resize.mockRejectedValue(new AvatarImageError("画像ファイルを選択してください"));
    showSection();
    chooseFile();
    await waitFor(() => expect(error).toHaveBeenCalledWith("画像ファイルを選択してください"));
    expect(screen.getByRole("button", { name: "写真を設定" })).toBeEnabled();
    expect(avatar()).toBeUndefined();
  });

  it("設定時の操作エラーはトーストで表示する", async () => {
    const error = vi.spyOn(toast, "error");
    resize.mockResolvedValue(WEBP);
    useFamilyTreeStore.setState({ setAvatar: () => ({ ok: false, error: "設定できません" }) });
    showSection();
    chooseFile();
    await waitFor(() => expect(error).toHaveBeenCalledWith("設定できません"));
  });

  it("確認ダイアログを経て写真を削除する", () => {
    const success = vi.spyOn(toast, "success");
    store().setAvatar("I1", PNG);
    showSection();
    fireEvent.click(screen.getByRole("button", { name: "写真を削除" }));
    expect(screen.getByRole("alertdialog", { name: "山田 太郎 の写真を削除しますか？" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    expect(avatar()).toBeUndefined();
    expect(success).toHaveBeenCalledWith("写真を削除しました");
    expect(screen.getByRole("img", { name: "写真なし" })).toBeVisible();
  });

  it("削除時の操作エラーはトーストで表示する", () => {
    const error = vi.spyOn(toast, "error");
    store().setAvatar("I1", PNG);
    useFamilyTreeStore.setState({ removeAvatar: () => ({ ok: false, error: "削除できません" }) });
    showSection();
    fireEvent.click(screen.getByRole("button", { name: "写真を削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    expect(error).toHaveBeenCalledWith("削除できません");
  });
});
