/**
 * ADR-094: TAG_SPEC_MAP childSpecs 자동 등록 retroactive 검증.
 *
 * 본 test 는 `expandChildSpecs(BASE_TAG_SPEC_MAP)` 가 ListBoxItem / GridListItem
 * 등 child spec 을 PascalCase 키로 자동 추가함으로써 Skia 축 SSOT lookup
 * (`sizes.md.paddingX/paddingY`, `containerStyles`) 이 실제 유효값을 반환하는지
 * 검증 — ADR-078 ListBoxItem + ADR-090 GridListItem 의 실제 SSOT 복구 증거.
 *
 * Phase 3 요구 사양: `specSizeField("listboxitem", "md", "paddingX")` 상응 lookup 이
 * 유효값 반환해야 함. `specSizeField` 는 implicitStyles.ts 내부 함수이므로 본 test 는
 * `TAG_SPEC_MAP` 에서 직접 lookup 하여 동일 계약을 검증.
 */

import { describe, expect, it } from "vitest";
import { TAG_SPEC_MAP, getSpecForTag } from "./tagSpecMap";

describe("TAG_SPEC_MAP — ADR-094 childSpecs 자동 등록", () => {
  describe("ListBoxItem (ListBox.childSpecs → ADR-078 Skia 축 복구)", () => {
    it("TAG_SPEC_MAP['ListBoxItem'] 정의됨 (PascalCase 자동 추가)", () => {
      expect(TAG_SPEC_MAP.ListBoxItem).toBeDefined();
      expect(TAG_SPEC_MAP.ListBoxItem.name).toBe("ListBoxItem");
    });

    it("sizes.md.paddingX === 12 (ADR-078 P1 SSOT)", () => {
      const sz = TAG_SPEC_MAP.ListBoxItem.sizes.md;
      expect(sz).toBeDefined();
      expect(sz.paddingX).toBe(12);
      expect(sz.paddingY).toBe(4);
      expect(sz.gap).toBe(2);
      expect(sz.minHeight).toBe(20);
      expect(sz.fontWeight).toBe(600);
    });

    it("containerStyles 4 필드 선언 (flex column 좌측 정렬 + 수직 중앙)", () => {
      expect(TAG_SPEC_MAP.ListBoxItem.containerStyles).toEqual({
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
      });
    });

    it("getSpecForTag('ListBoxItem') === TAG_SPEC_MAP['ListBoxItem']", () => {
      expect(getSpecForTag("ListBoxItem")).toBe(TAG_SPEC_MAP.ListBoxItem);
    });
  });

  describe("GridListItem (GridList.childSpecs → ADR-090 Skia 축 복구)", () => {
    it("TAG_SPEC_MAP['GridListItem'] 정의됨", () => {
      expect(TAG_SPEC_MAP.GridListItem).toBeDefined();
      expect(TAG_SPEC_MAP.GridListItem.name).toBe("GridListItem");
    });

    it("sizes.md.paddingX === 16 (ADR-090 P1 SSOT)", () => {
      const sz = TAG_SPEC_MAP.GridListItem.sizes.md;
      expect(sz).toBeDefined();
      expect(sz.paddingX).toBe(16);
      expect(sz.paddingY).toBe(12);
      expect(sz.gap).toBe(2);
      expect(sz.fontWeight).toBe(600);
    });

    it("containerStyles 2 필드 (flex column)", () => {
      expect(TAG_SPEC_MAP.GridListItem.containerStyles).toEqual({
        display: "flex",
        flexDirection: "column",
      });
    });

    it("getSpecForTag('GridListItem') === TAG_SPEC_MAP['GridListItem']", () => {
      expect(getSpecForTag("GridListItem")).toBe(TAG_SPEC_MAP.GridListItem);
    });
  });

  describe("수동 등록 우선 (expandChildSpecs 덮어쓰기 금지)", () => {
    it("수동 등록된 Label 은 childSpecs 순회 시 덮어쓰이지 않음", () => {
      // Label 은 BASE_TAG_SPEC_MAP 에 직접 등록됨. 다른 spec 의 childSpecs 에 같은
      // 이름이 있더라도 수동 entry 가 유지되어야 한다.
      expect(TAG_SPEC_MAP.Label).toBeDefined();
      expect(TAG_SPEC_MAP.Label.name).toBe("Label");
    });
  });
});
