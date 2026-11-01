import { expect, test, type Page } from "@playwright/test";
import {
  detailPanel,
  exportAs,
  fillAddDialog,
  nodeMenu,
  openApp,
  personButton,
  personList,
  selectPerson,
} from "./helpers";

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

test.describe("養子縁組", () => {
  const legend = (page: Page) => page.getByTestId("tree-legend");

  test("既存の夫婦の養子にすると破線の凡例を表示し、実親・養親を詳細に表示する(婿養子)", async ({ page }) => {
    await openApp(page);
    await expect(legend(page)).toHaveCount(0);
    await selectPerson(page, "山田 茂");
    await nodeMenu(page).getByRole("button", { name: "養子縁組" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: "佐藤 清・佐藤 ハル の養子にする" }).click();
    await dialog.getByRole("button", { name: "縁組する" }).click();
    await expect(page.getByText("佐藤 清・佐藤 ハル の養子にしました")).toBeVisible();

    await expect(legend(page)).toContainText("破線: 養子(養親子)");
    await expect(detailPanel(page)).toContainText("山田 正一・山田 トメ");
    await expect(detailPanel(page)).toContainText("佐藤 清・佐藤 ハル(養子)");
    await expect(personList(page).getByRole("button")).toHaveCount(14);

    await page.reload();
    await expect(legend(page)).toBeVisible();
    const { body } = await exportAs(page, "GEDCOM (.ged)");
    expect(body.toString()).toContain("1 FAMC @F5@\n2 PEDI ADOPTED\n");
  });

  test("新しい人物を特別養子の養親として追加する(実線のため凡例は出さない)。養親を削除すると原状に戻る", async ({
    page,
  }) => {
    await openApp(page);
    await selectPerson(page, "山田 恵子");
    await nodeMenu(page).getByRole("button", { name: "養子縁組" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: "特別養子" }).click();
    await fillAddDialog(page, { surname: "中村", givenName: "洋子", choice: "女性" });
    await expect(personButton(page, "中村 洋子")).toBeVisible();
    await expect(detailPanel(page)).toContainText("中村 洋子(特別養子)");
    await expect(legend(page)).toHaveCount(0);

    await selectPerson(page, "中村 洋子");
    await detailPanel(page).getByRole("button", { name: "編集" }).click();
    await detailPanel(page).getByRole("button", { name: "削除" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "削除する" }).click();
    await expect(page.getByText("中村 洋子 を削除しました")).toBeVisible();

    await selectPerson(page, "山田 恵子");
    await expect(detailPanel(page)).toContainText("実親");
    await expect(detailPanel(page)).not.toContainText("養親");
    const { body } = await exportAs(page, "GEDCOM (.ged)");
    expect(body.toString()).not.toContain("PEDI");
  });
});
