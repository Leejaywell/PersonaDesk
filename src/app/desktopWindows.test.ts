import { describe, expect, it } from "vitest";
import { fallbackDesktopWindowPlan } from "./desktopWindows";

describe("desktop window plan", () => {
  it("describes the control console and floating companion surfaces", () => {
    const plan = fallbackDesktopWindowPlan();

    expect(plan.windows.map((windowPlan) => windowPlan.label)).toEqual(["main", "companion"]);
    expect(plan.windows.find((windowPlan) => windowPlan.label === "companion")).toMatchObject({
      surface: "floating-companion",
      title: "PersonaDesk Companion",
      alwaysOnTop: true,
      decorations: false,
      skipTaskbar: true,
      focus: false
    });
  });
});
