/**
 * buildTextNodeData 테스트 (ADR-100 Phase 6)
 *
 * TextSprite skiaNodeData useMemo → 순수 함수 정밀 이식 검증.
 * TextSprite.tsx lines 300-507의 모든 속성을 커버.
 */

import { describe, test, expect, vi } from "vitest";
import type { Element } from "../../../../../types/core/store.types";

// Mock fontManager (싱글톤 — WASM 없이 테스트)
vi.mock("../fontManager", () => ({
  skiaFontManager: {
    resolveFamily: (f: string) => f,
  },
}));

// Mock @xstudio/specs (lightColors/darkColors)
vi.mock("@xstudio/specs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xstudio/specs")>();
  return {
    ...actual,
    hexStringToNumber: (hex: string) => {
      const h = hex.replace("#", "");
      return parseInt(h, 16);
    },
    lightColors: { neutral: "#1a1a1a" },
    darkColors: { neutral: "#e5e5e5" },
  };
});

import { buildTextNodeData } from "../buildTextNodeData";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTextElement(
  overrides: Partial<Element & { props: Record<string, unknown> }> = {},
): Element {
  return {
    id: "text-1",
    tag: "Heading",
    props: {
      children: "Hello World",
      style: {
        fontSize: "16px",
        fontWeight: "400",
        fontFamily: "Inter",
        color: "#000000",
        backgroundColor: "#ffffff",
        width: "200px",
        height: "40px",
      },
      ...(overrides.props ?? {}),
    },
    ...overrides,
  } as Element;
}

function makeLayout(
  x = 0,
  y = 0,
  width = 200,
  height = 40,
): { elementId: string; x: number; y: number; width: number; height: number } {
  return { elementId: "test-layout", x, y, width, height };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildTextNodeData", () => {
  test("basic text element → type:text with content", () => {
    const node = buildTextNodeData({
      element: makeTextElement(),
      layout: makeLayout(10, 20, 200, 40),
      theme: "light",
    });

    expect(node).not.toBeNull();
    expect(node!.type).toBe("text");
    expect(node!.x).toBe(10);
    expect(node!.y).toBe(20);
    expect(node!.width).toBe(200);
    expect(node!.height).toBe(40);
    expect(node!.visible).toBe(true);
    expect(node!.text?.content).toBe("Hello World");
    expect(node!.text?.fontSize).toBe(16);
    expect(node!.text?.fontWeight).toBe(400);
  });

  test("fontWeight: bold → 700", () => {
    const node = buildTextNodeData({
      element: makeTextElement({
        props: {
          children: "Bold",
          style: {
            fontWeight: "bold",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
            width: "100px",
            height: "30px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "light",
    });

    expect(node!.text?.fontWeight).toBe(700);
  });

  test("fontStyle: italic → 1, oblique → 2", () => {
    const italic = buildTextNodeData({
      element: makeTextElement({
        props: {
          children: "Italic",
          style: {
            fontStyle: "italic",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
            width: "100px",
            height: "30px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "light",
    });
    expect(italic!.text?.fontStyle).toBe(1);

    const oblique = buildTextNodeData({
      element: makeTextElement({
        props: {
          children: "Oblique",
          style: {
            fontStyle: "oblique",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
            width: "100px",
            height: "30px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "light",
    });
    expect(oblique!.text?.fontStyle).toBe(2);
  });

  test("theme-aware default color (no explicit color)", () => {
    const lightNode = buildTextNodeData({
      element: makeTextElement({
        props: {
          children: "No color",
          style: {
            fontSize: "16px",
            backgroundColor: "#fff",
            width: "100px",
            height: "30px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "light",
    });
    // lightColors.neutral = #1a1a1a → rgb(26, 26, 26)
    const c = lightNode!.text!.color;
    expect(c[0]).toBeCloseTo(26 / 255, 2);
    expect(c[1]).toBeCloseTo(26 / 255, 2);
    expect(c[2]).toBeCloseTo(26 / 255, 2);

    const darkNode = buildTextNodeData({
      element: makeTextElement({
        props: {
          children: "No color",
          style: {
            fontSize: "16px",
            backgroundColor: "#000",
            width: "100px",
            height: "30px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "dark",
    });
    // darkColors.neutral = #e5e5e5 → rgb(229, 229, 229)
    const dc = darkNode!.text!.color;
    expect(dc[0]).toBeCloseTo(229 / 255, 2);
    expect(dc[1]).toBeCloseTo(229 / 255, 2);
  });

  test("textDecoration → bitmask", () => {
    const node = buildTextNodeData({
      element: makeTextElement({
        props: {
          children: "Decorated",
          style: {
            textDecoration: "underline line-through",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
            width: "100px",
            height: "30px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "light",
    });

    // underline=1, line-through=4 → 5
    expect(node!.text?.decoration).toBe(5);
  });

  test("decorationStyle and decorationColor", () => {
    const node = buildTextNodeData({
      element: makeTextElement({
        props: {
          children: "Styled",
          style: {
            textDecoration: "underline",
            textDecorationStyle: "dashed",
            textDecorationColor: "rgb(255, 0, 0)",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
            width: "100px",
            height: "30px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "light",
    });

    expect(node!.text?.decorationStyle).toBe("dashed");
    expect(node!.text?.decorationColor).toBeDefined();
    expect(node!.text?.decorationColor![0]).toBeCloseTo(1, 2); // red
    expect(node!.text?.decorationColor![1]).toBeCloseTo(0, 2); // green
  });

  test("padding → paddingLeft/paddingTop + maxWidth", () => {
    const node = buildTextNodeData({
      element: makeTextElement({
        props: {
          children: "Padded",
          style: {
            padding: "8px 16px",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
            width: "200px",
            height: "40px",
          },
        },
      }),
      layout: makeLayout(0, 0, 200, 40),
      theme: "light",
    });

    expect(node!.text?.paddingLeft).toBe(16);
    expect(node!.text?.paddingTop).toBe(8);
    // maxWidth = 200 - 16 - 16 = 168
    expect(node!.text?.maxWidth).toBe(168);
  });

  test("flex alignment → text alignment", () => {
    const node = buildTextNodeData({
      element: makeTextElement({
        props: {
          children: "Centered",
          style: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
            width: "200px",
            height: "40px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "light",
    });

    expect(node!.text?.align).toBe("center");
    expect(node!.text?.verticalAlign).toBe("middle");
  });

  test("whiteSpace, wordBreak, overflowWrap", () => {
    const node = buildTextNodeData({
      element: makeTextElement({
        props: {
          children: "Wrapped",
          style: {
            whiteSpace: "nowrap",
            wordBreak: "break-all",
            overflowWrap: "break-word",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
            width: "100px",
            height: "30px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "light",
    });

    expect(node!.text?.whiteSpace).toBe("nowrap");
    expect(node!.text?.wordBreak).toBe("break-all");
    expect(node!.text?.overflowWrap).toBe("break-word");
  });

  test("textOverflow + overflow:hidden → clipText", () => {
    const node = buildTextNodeData({
      element: makeTextElement({
        props: {
          children: "Ellipsis",
          style: {
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "nowrap",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
            width: "100px",
            height: "30px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "light",
    });

    expect(node!.text?.textOverflow).toBe("ellipsis");
    expect(node!.text?.clipText).toBe(true);
  });

  test("textTransform: uppercase", () => {
    const node = buildTextNodeData({
      element: makeTextElement({
        props: {
          children: "hello",
          style: {
            textTransform: "uppercase",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
            width: "100px",
            height: "30px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "light",
    });

    expect(node!.text?.content).toBe("HELLO");
  });

  test("content sources: children > text > label > tag", () => {
    // children
    const withChildren = buildTextNodeData({
      element: makeTextElement({
        props: {
          children: "From children",
          text: "From text",
          label: "From label",
          style: {
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
            width: "100px",
            height: "30px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "light",
    });
    expect(withChildren!.text?.content).toBe("From children");

    // label (no children, no text)
    const withLabel = buildTextNodeData({
      element: makeTextElement({
        tag: "Label",
        props: {
          label: "From label",
          style: {
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
            width: "100px",
            height: "30px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "light",
    });
    expect(withLabel!.text?.content).toBe("From label");

    // tag fallback
    const withTag = buildTextNodeData({
      element: makeTextElement({
        tag: "Heading",
        props: {
          style: {
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
            width: "100px",
            height: "30px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "light",
    });
    expect(withTag!.text?.content).toBe("Heading");
  });

  test("no style → null", () => {
    const el = { id: "x", tag: "Text", props: { children: "Hi" } } as Element;
    const node = buildTextNodeData({
      element: el,
      layout: undefined,
      theme: "light",
    });
    expect(node).toBeNull();
  });

  test("display:none → visible:false (not null)", () => {
    const node = buildTextNodeData({
      element: makeTextElement({
        props: {
          children: "Hidden",
          style: {
            display: "none",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
            width: "100px",
            height: "30px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "light",
    });

    expect(node).not.toBeNull();
    expect(node!.visible).toBe(false);
  });

  test("box data: fillColor as Float32Array", () => {
    const node = buildTextNodeData({
      element: makeTextElement({
        props: {
          children: "Box",
          style: {
            backgroundColor: "#ff0000",
            fontSize: "16px",
            color: "#000",
            width: "100px",
            height: "30px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "light",
    });

    expect(node!.box).toBeDefined();
    expect(node!.box!.fillColor).toBeInstanceOf(Float32Array);
    expect(node!.box!.fillColor[0]).toBeCloseTo(1, 2); // red
    expect(node!.box!.fillColor[1]).toBeCloseTo(0, 2); // green
    expect(node!.box!.fillColor[2]).toBeCloseTo(0, 2); // blue
  });

  test("fontFamilies uses resolveFamily with split", () => {
    const node = buildTextNodeData({
      element: makeTextElement({
        props: {
          children: "Fonts",
          style: {
            fontFamily: "Inter, Helvetica, sans-serif",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
            width: "100px",
            height: "30px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "light",
    });

    // split(",")[0].trim() = "Inter", 두 번째는 항상 "Pretendard"
    expect(node!.text?.fontFamilies).toEqual(["Inter", "Pretendard"]);
  });

  test("textIndent + fontVariant + fontStretch", () => {
    const node = buildTextNodeData({
      element: makeTextElement({
        props: {
          children: "Advanced",
          style: {
            textIndent: "2em",
            fontVariant: "small-caps",
            fontStretch: "condensed",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
            width: "200px",
            height: "40px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "light",
    });

    expect(node!.text?.fontVariant).toBe("small-caps");
    expect(node!.text?.fontStretch).toBe("condensed");
    // textIndent는 parseCSSSize로 파싱됨
    expect(node!.text?.textIndent).toBeDefined();
  });

  test("wordSpacing", () => {
    const node = buildTextNodeData({
      element: makeTextElement({
        props: {
          children: "Spaced",
          style: {
            wordSpacing: "4px",
            fontSize: "16px",
            color: "#000",
            backgroundColor: "#fff",
            width: "100px",
            height: "30px",
          },
        },
      }),
      layout: makeLayout(),
      theme: "light",
    });

    expect(node!.text?.wordSpacing).toBe(4);
  });
});
