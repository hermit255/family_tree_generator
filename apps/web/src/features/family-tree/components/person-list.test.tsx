import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LayoutNode } from "../layout";
import { PersonList } from "./person-list";

const node = (id: string, x: number, y: number, isCenter = false): LayoutNode => ({
  id,
  x,
  y,
  label: `人物${id}`,
  generation: 0,
  isCenter,
});

describe("PersonList", () => {
  it("同じ人物は1つにまとめ、上の世代から左→右の順に並べる", () => {
    render(
      <PersonList
        nodes={[node("I3", 0, 100), node("I2", 200, 0), node("I1", 0, 0), node("I3", 300, 100)]}
        onSelect={() => {}}
      />,
    );
    const list = screen.getByRole("navigation", { name: "表示中の人物" });
    expect(within(list).getAllByRole("button").map((b) => b.textContent)).toEqual(["人物I1", "人物I2", "人物I3"]);
  });

  it("中心人物を示し、選んだ人物の ID を通知する", () => {
    const onSelect = vi.fn();
    render(<PersonList nodes={[node("I1", 0, 0, true), node("I2", 200, 0)]} onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: "人物I1" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "人物I2" })).not.toHaveAttribute("aria-current");

    fireEvent.click(screen.getByRole("button", { name: "人物I2" }));
    expect(onSelect).toHaveBeenCalledWith("I2");
  });
});
