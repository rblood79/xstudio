// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  requestEditingSemanticsDetachConfirmation,
  requestEditingSemanticsImpactConfirmation,
  resolveEditingSemanticsImpactConfirmation,
} from "../../utils/editingSemanticsImpactConfirmation";
import { EditingSemanticsImpactDialogHost } from "./EditingSemanticsImpactDialog";

function requestImpact() {
  return requestEditingSemanticsImpactConfirmation({
    countDurationMs: 2.4,
    impactedInstanceIds: ["instance-a", "instance-b"],
    instanceCount: 2,
    originId: "origin",
    originLabel: "Button",
  });
}

describe("EditingSemanticsImpactDialogHost", () => {
  afterEach(() => {
    resolveEditingSemanticsImpactConfirmation(false);
    cleanup();
  });

  it("resolves false when cancelled", async () => {
    render(<EditingSemanticsImpactDialogHost />);

    const result = requestImpact();
    expect(await screen.findByText("Component impact")).toBeTruthy();
    expect(screen.getByText("2 instances")).toBeTruthy();
    expect(screen.getByLabelText("Affected instances")).toBeTruthy();
    expect(screen.getByText("instance-a")).toBeTruthy();
    expect(screen.getByText("instance-b")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await expect(result).resolves.toBe(false);
  });

  it("resolves true when continued", async () => {
    render(<EditingSemanticsImpactDialogHost />);

    const result = requestImpact();
    expect(await screen.findByText("Component impact")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await expect(result).resolves.toBe(true);
  });

  it("caps the affected instance preview list", async () => {
    render(<EditingSemanticsImpactDialogHost />);

    const result = requestEditingSemanticsImpactConfirmation({
      countDurationMs: 3.1,
      impactedInstanceIds: Array.from(
        { length: 8 },
        (_, index) => `instance-${index}`,
      ),
      instanceCount: 8,
      originId: "origin",
      originLabel: "Button",
    });

    expect(await screen.findByText("instance-0")).toBeTruthy();
    expect(screen.getByText("instance-4")).toBeTruthy();
    expect(screen.queryByText("instance-5")).toBeNull();
    expect(screen.getByText("+3 more")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await expect(result).resolves.toBe(true);
  });

  it("renders detach warning copy", async () => {
    render(<EditingSemanticsImpactDialogHost />);

    const result = requestEditingSemanticsDetachConfirmation({
      instanceId: "instance-a",
      instanceLabel: "Primary button instance",
      originLabel: "Primary button",
    });

    expect(await screen.findByText("Detach instance")).toBeTruthy();
    expect(screen.getByText("Primary button instance")).toBeTruthy();
    expect(
      screen.getByText(/will turn it into a standalone element/i),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await expect(result).resolves.toBe(true);
  });
});
