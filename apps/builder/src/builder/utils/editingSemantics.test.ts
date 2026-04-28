import { describe, expect, it } from "vitest";
import {
  canDetachInstance,
  canDetachLegacyInstance,
  getEditingSemanticsLabel,
  getEditingSemanticsInstanceIds,
  getEditingSemanticsImpactInstanceIds,
  getEditingSemanticsOriginId,
  getEditingSemanticsOverrideFields,
  getEditingSemanticsOverrideItems,
  getEditingSemanticsRole,
} from "./editingSemantics";

describe("editingSemantics", () => {
  it("canonical reusable node is an origin", () => {
    expect(getEditingSemanticsRole({ type: "frame", reusable: true })).toBe(
      "origin",
    );
  });

  it("canonical ref node is an instance", () => {
    expect(getEditingSemanticsRole({ type: "ref", ref: "frame-1" })).toBe(
      "instance",
    );
  });

  it("legacy component roles stay visible during migration", () => {
    expect(getEditingSemanticsRole({ componentRole: "master" })).toBe(
      "origin",
    );
    expect(
      getEditingSemanticsRole({
        componentRole: "instance",
        masterId: "master-1",
      }),
    ).toBe("instance");
  });

  it("plain elements do not show a semantics marker", () => {
    expect(getEditingSemanticsRole({ type: "Button", props: {} })).toBeNull();
    expect(getEditingSemanticsLabel(null)).toBeNull();
  });

  it("resolves canonical and legacy instance origin ids", () => {
    expect(getEditingSemanticsOriginId({ type: "ref", ref: "origin" })).toBe(
      "origin",
    );
    expect(getEditingSemanticsOriginId({ masterId: "legacy-origin" })).toBe(
      "legacy-origin",
    );
    expect(getEditingSemanticsOriginId({ reusable: true })).toBeNull();
  });

  it("collects instance ids for an origin", () => {
    expect(
      getEditingSemanticsInstanceIds("origin", [
        { id: "i1", type: "ref", ref: "origin" },
        { id: "i2", componentRole: "instance", masterId: "origin" },
        { id: "i3", type: "ref", ref: "other-origin" },
        { id: "plain", type: "Button" },
      ]),
    ).toEqual(["i1", "i2"]);
  });

  it("collects impacted instances by id, customId, and componentName", () => {
    expect(
      getEditingSemanticsImpactInstanceIds(
        {
          id: "origin-id",
          customId: "origin-custom",
          componentName: "OriginName",
          reusable: true,
        },
        [
          { id: "i1", type: "ref", ref: "origin-id" },
          { id: "i2", type: "ref", ref: "origin-custom" },
          { id: "i3", type: "ref", ref: "OriginName" },
          { id: "i4", type: "ref", ref: "other" },
        ],
      ),
    ).toEqual(["i1", "i2", "i3"]);
  });

  it("allows detach only for legacy instances", () => {
    expect(
      canDetachLegacyInstance({
        componentRole: "instance",
        masterId: "origin",
      }),
    ).toBe(true);
    expect(canDetachLegacyInstance({ type: "ref", ref: "origin" })).toBe(
      false,
    );
    expect(canDetachLegacyInstance({ componentRole: "master" })).toBe(false);
  });

  it("allows detach for canonical refs with an origin ref", () => {
    expect(canDetachInstance({ type: "ref", ref: "origin" })).toBe(true);
    expect(canDetachInstance({ componentRole: "instance" })).toBe(true);
    expect(canDetachInstance({ type: "ref" })).toBe(false);
    expect(canDetachInstance({ reusable: true })).toBe(false);
  });

  it("collects legacy instance override fields", () => {
    expect(
      getEditingSemanticsOverrideFields({
        componentRole: "instance",
        overrides: { label: "Override", style: { color: "blue" } },
      }),
    ).toEqual(["label", "style"]);
  });

  it("collects canonical ref root override fields", () => {
    expect(
      getEditingSemanticsOverrideFields({
        type: "ref",
        props: { label: "Override" },
      }),
    ).toEqual(["label"]);
  });

  it("prefers canonical metadata legacyProps for override fields", () => {
    expect(
      getEditingSemanticsOverrideFields({
        type: "ref",
        props: { ignored: true },
        metadata: {
          type: "legacy-element-props",
          legacyProps: { label: "Override" },
        },
      }),
    ).toEqual(["label"]);
  });

  it("collects canonical descendant override items", () => {
    expect(
      getEditingSemanticsOverrideItems({
        type: "ref",
        props: { label: "Root override" },
        descendants: {
          "slot/label": { text: "Descendant override" },
          icon: {
            metadata: {
              type: "legacy-element-props",
              legacyProps: { name: "check" },
            },
          },
          structure: { children: [{ type: "Text", text: "Ignored" }] },
        },
      }),
    ).toEqual([
      {
        fieldKey: "label",
        id: "root:label",
        label: "label",
      },
      {
        descendantPath: "slot/label",
        fieldKey: "text",
        id: "descendant:slot/label:text",
        label: "slot/label.text",
      },
      {
        descendantPath: "icon",
        fieldKey: "name",
        id: "descendant:icon:name",
        label: "icon.name",
      },
    ]);
  });
});
