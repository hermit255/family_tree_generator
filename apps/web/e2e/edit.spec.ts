import { expect, test } from "@playwright/test";
import { detailPanel, fillAddDialog, nodeMenu, openApp, personButton, selectPerson } from "./helpers";

test.describe("人物の追加・編集・削除", () => {
  test("親を追加する(最初の親は性別で父母を決め、父母が揃うと親の追加は表示しない)", async ({ page }) => {
    await openApp(page);
    await selectPerson(page, "山田 美穂");
    await nodeMenu(page).getByRole("button", { name: "親を追加" }).click();
    await fillAddDialog(page, { surname: "田中", givenName: "花子", choice: "女性" });
    await expect(personButton(page, "田中 花子")).toBeVisible();

    await nodeMenu(page).getByRole("button", { name: "親を追加" }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "父を追加" })).toBeVisible();
    await fillAddDialog(page, { surname: "田中", givenName: "一夫" });
    await expect(nodeMenu(page).getByRole("button", { name: "親を追加" })).toHaveCount(0);
  });

  test("配偶者を追加する", async ({ page }) => {
    await openApp(page);
    await selectPerson(page, "山田 恵子");
    await nodeMenu(page).getByRole("button", { name: "配偶者を追加" }).click();
    await fillAddDialog(page, { surname: "高橋", givenName: "誠" });
    await expect(personButton(page, "高橋 誠")).toBeVisible();
  });

  test("配偶者が複数いる人物の子を、配偶者を選んで追加する", async ({ page }) => {
    await openApp(page);
    await selectPerson(page, "山田 健一");
    await nodeMenu(page).getByRole("button", { name: "子を追加" }).click();
    await fillAddDialog(page, { surname: "山田", givenName: "大輔", choice: "山田 直子" });
    await expect(personButton(page, "山田 大輔")).toBeVisible();
  });

  test("編集した内容は表示に反映され、再読み込み後も残る", async ({ page }) => {
    await openApp(page);
    await selectPerson(page, "山田 恵子");
    await detailPanel(page).getByRole("button", { name: "編集" }).click();
    await detailPanel(page).getByLabel("姓").fill("鈴木");
    await detailPanel(page).getByRole("button", { name: "保存" }).click();
    await expect(page.getByText("保存しました")).toBeVisible();
    await expect(detailPanel(page).getByRole("heading", { name: "鈴木 恵子" })).toBeVisible();

    await page.reload();
    await expect(personButton(page, "鈴木 恵子")).toBeVisible();
  });

  test("確認の上で人物を削除する。起点ノードは削除できない", async ({ page }) => {
    await openApp(page);
    await selectPerson(page, "山田 健一");
    await detailPanel(page).getByRole("button", { name: "編集" }).click();
    await expect(detailPanel(page).getByRole("button", { name: "削除" })).toBeDisabled();
    await expect(detailPanel(page)).toContainText("起点");

    await selectPerson(page, "山田 陽向");
    await detailPanel(page).getByRole("button", { name: "編集" }).click();
    await detailPanel(page).getByRole("button", { name: "削除" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "削除する" }).click();

    await expect(page.getByText("山田 陽向 を削除しました")).toBeVisible();
    await expect(personButton(page, "山田 陽向")).toHaveCount(0);
    // 中心人物を削除すると起点ノードに戻り、詳細パネルを閉じる
    await expect(personButton(page, "山田 健一")).toHaveAttribute("aria-current", "true");
    await expect(detailPanel(page)).toBeHidden();
  });
});
