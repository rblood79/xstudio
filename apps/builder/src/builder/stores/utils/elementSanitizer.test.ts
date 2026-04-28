import { describe, expect, it } from "vitest";
import type { Element } from "../../../types/core/store.types";
import {
  sanitizeElement,
  sanitizeElementForSupabase,
} from "./elementSanitizer";

describe("elementSanitizer", () => {
  it("preserves canonical component fields for IndexedDB round trip", () => {
    const element = {
      id: "instance",
      type: "ref",
      ref: "origin",
      reusable: false,
      componentName: "TextField",
      slot: ["TextField"],
      descendants: {
        label: { text: "Email" },
      },
      metadata: {
        type: "legacy-element-props",
        legacyProps: { label: "Email" },
      },
      parent_id: "body",
      page_id: "page-1",
      order_num: 1,
      props: { style: { left: "10px" } },
    } as Element;

    const sanitized = sanitizeElement(element) as Element & {
      descendants?: unknown;
      metadata?: unknown;
      ref?: string;
      reusable?: boolean;
    };

    expect(sanitized).toMatchObject({
      id: "instance",
      type: "ref",
      ref: "origin",
      reusable: false,
      componentName: "TextField",
      slot: ["TextField"],
      descendants: {
        label: { text: "Email" },
      },
      metadata: {
        type: "legacy-element-props",
        legacyProps: { label: "Email" },
      },
      props: { style: { left: "10px" } },
    });
    expect(sanitized.props).not.toBe(element.props);
  });

  it("maps canonical component fields to Supabase payload keys", () => {
    const element = {
      id: "origin",
      type: "TextField",
      reusable: true,
      componentName: "TextField",
      parent_id: null,
      page_id: "page-1",
      order_num: 0,
      props: { label: "Name" },
    } as Element;

    expect(sanitizeElementForSupabase(element)).toMatchObject({
      id: "origin",
      type: "TextField",
      reusable: true,
      component_name: "TextField",
      props: { label: "Name" },
    });
  });
});
