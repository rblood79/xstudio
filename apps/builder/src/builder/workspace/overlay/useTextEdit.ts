/**
 * useTextEdit Hook
 *
 * Pencil textEditorManager 패턴:
 * - startEdit: 원본 스냅샷 저장 + Skia 텍스트 숨김
 * - completeEdit: 히스토리 기록 + store 업데이트 + Skia 텍스트 복원
 * - cancelEdit: Skia 텍스트 복원 (store 변경 없음)
 *
 * @since 2025-12-11 Phase 10 B1.5
 * @updated 2026-03-07 Pencil 패턴 적용 (히스토리, Skia 연동)
 */

import { useState, useCallback, useRef } from "react";
import { useStore } from "../../stores";
import type { TextStyleConfig } from "./TextEditOverlay";
import { setEditingElementId } from "../canvas/skia/nodeRenderers";
import { getSkiaNode, notifyLayoutChange } from "../canvas/skia/useSkiaNode";

// ============================================
// Types
// ============================================

export interface TextEditState {
  /** 편집 중인 요소 ID */
  elementId: string | null;
  /** 현재 텍스트 값 */
  value: string;
  /** 위치 (screen 좌표) */
  position: { x: number; y: number };
  /** 크기 (screen 픽셀) */
  size: { width: number; height: number };
  /** 스타일 */
  style: TextStyleConfig;
}

/** 레이아웃 위치 정보 */
export interface LayoutPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UseTextEditReturn {
  /** 편집 상태 */
  editState: TextEditState | null;
  /** 편집 시작 (layoutPosition: screen 좌표 bounds) */
  startEdit: (elementId: string, layoutPosition?: LayoutPosition) => void;
  /** 텍스트 변경 */
  updateText: (elementId: string, newValue: string) => void;
  /** 편집 완료 (저장) */
  completeEdit: (elementId: string) => void;
  /** 편집 취소 */
  cancelEdit: (elementId: string) => void;
  /** 편집 중 여부 */
  isEditing: boolean;
}

// ============================================
// Text Element Tags
// ============================================

const TEXT_ELEMENT_TAGS = new Set([
  "Text",
  "Heading",
  "Label",
  "Paragraph",
  "Link",
  // 소문자 태그 (handleElementDoubleClick의 textTags와 호환)
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
  "a",
  "label",
  "button",
  "Description",
  "Strong",
  "Em",
  "Code",
  "Tag",
  "Badge",
  // Input 관련
  "Button",
  "Input",
  "TextField",
  "TextInput",
  "SearchField",
  "TextArea",
]);

// ============================================
// Helper Functions
// ============================================

/**
 * 요소에서 텍스트 추출
 */
function extractText(props: Record<string, unknown> | undefined): string {
  if (!props) return "";
  return String(
    props.value ||
      props.defaultValue ||
      props.children ||
      props.text ||
      props.label ||
      "",
  );
}

/**
 * Skia 렌더 데이터에서 텍스트 스타일 추출 (가장 정확한 소스)
 * fallback: element.props.style
 */
function extractTextStyle(
  elementId: string,
  style: Record<string, unknown> | undefined,
): TextStyleConfig {
  // Skia 노드에서 실제 렌더링 스타일 추출
  const skiaNode = getSkiaNode(elementId);
  if (skiaNode?.text) {
    const t = skiaNode.text;
    // Float32Array color → CSS hex
    const r = Math.round((t.color[0] ?? 0) * 255);
    const g = Math.round((t.color[1] ?? 0) * 255);
    const b = Math.round((t.color[2] ?? 0) * 255);
    const hexColor = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;

    // fontFamilies → CSS fontFamily
    const fontFamily = t.fontFamilies.join(", ") || "Pretendard, sans-serif";

    // align: EmbindEnumEntity | string → CSS textAlign
    let textAlign: "left" | "center" | "right" = "left";
    if (typeof t.align === "string") {
      textAlign = t.align as "left" | "center" | "right";
    }

    return {
      fontFamily,
      fontSize: t.fontSize,
      fontWeight: t.fontWeight ?? 400,
      color: hexColor,
      textAlign,
      lineHeight: t.lineHeight,
      padding: t.paddingLeft ?? 0,
      letterSpacing: t.letterSpacing,
      paddingTop: t.paddingTop ?? 0,
    };
  }

  // fallback: inline style
  return {
    fontFamily: String(style?.fontFamily || "Pretendard, sans-serif"),
    fontSize: Number(style?.fontSize) || 16,
    fontWeight: style?.fontWeight as string | number | undefined,
    color: String(style?.color || "#000000"),
    textAlign: (style?.textAlign as "left" | "center" | "right") || "left",
    lineHeight: style?.lineHeight as number | string | undefined,
    padding: Number(style?.padding || style?.paddingLeft || 0),
  };
}

/**
 * 텍스트 속성 키 결정 (저장 시 사용)
 */
function getTextPropKey(
  tag: string,
  props: Record<string, unknown> | undefined,
): string {
  if (props && ("value" in props || "defaultValue" in props)) return "value";
  if (props && "children" in props) return "children";
  if (props && "text" in props) return "text";
  if (props && "label" in props) return "label";
  // Input 관련 태그면 value, 아니면 children
  const inputTags = new Set([
    "Input",
    "TextField",
    "TextInput",
    "SearchField",
    "TextArea",
  ]);
  return inputTags.has(tag) ? "value" : "children";
}

// ============================================
// Hook
// ============================================

export function useTextEdit(): UseTextEditReturn {
  const [editState, setEditState] = useState<TextEditState | null>(null);

  // Pencil originalUndoSnapshot 패턴: 편집 시작 시 원본 값 저장
  const originalValueRef = useRef<string>("");
  const editingIdRef = useRef<string | null>(null);
  const currentValueRef = useRef<string>("");

  // 편집 시작 (Pencil startTextEditing + nUt constructor 패턴)
  const startEdit = useCallback(
    (elementId: string, layoutPosition?: LayoutPosition) => {
      const state = useStore.getState();
      const element = state.elementsMap.get(elementId);
      if (!element) return;

      // 텍스트 요소만 편집 가능
      if (!TEXT_ELEMENT_TAGS.has(element.tag)) {
        console.warn(
          `[useTextEdit] Element ${element.tag} is not a text element`,
        );
        return;
      }

      const props = element.props as Record<string, unknown> | undefined;
      const text = extractText(props);
      const elStyle = element.props?.style as
        | Record<string, unknown>
        | undefined;

      // Pencil: 원본 스냅샷 저장 (undo용)
      originalValueRef.current = text;
      currentValueRef.current = text;
      editingIdRef.current = elementId;

      // Pencil hideText: Skia 텍스트 렌더링 숨김 + 리렌더 트리거
      setEditingElementId(elementId);
      notifyLayoutChange();

      // 위치 결정 (layoutPosition = screen 좌표 from layoutBoundsRegistry)
      const position = layoutPosition
        ? { x: layoutPosition.x, y: layoutPosition.y }
        : { x: 0, y: 0 };
      const size = layoutPosition
        ? { width: layoutPosition.width, height: layoutPosition.height }
        : { width: 100, height: 40 };

      setEditState({
        elementId,
        value: text,
        position,
        size,
        style: extractTextStyle(elementId, elStyle),
      });
    },
    [],
  );

  // 텍스트 변경 (실시간 — Quill 내부에서만 관리, store 미반영)
  // Pencil 패턴: 편집 중에는 DOM(Quill)에서만 텍스트 관리
  // Skia 텍스트는 숨겨진 상태이므로 store 업데이트 불필요
  // completeEdit에서 최종 값으로 store 한 번만 업데이트 (히스토리 1건)
  const updateText = useCallback((elementId: string, newValue: string) => {
    if (editingIdRef.current !== elementId) return;
    currentValueRef.current = newValue;
    setEditState((prev) => {
      if (!prev || prev.elementId !== elementId) return prev;
      return { ...prev, value: newValue };
    });
  }, []);

  // 편집 완료 (Pencil: commitBlock with undo: true)
  const completeEdit = useCallback((elementId: string) => {
    if (editingIdRef.current !== elementId) return;

    const finalValue = currentValueRef.current;
    const originalValue = originalValueRef.current;

    // Pencil showText: Skia 텍스트 렌더링 복원 + 리렌더 트리거
    setEditingElementId(null);
    notifyLayoutChange();
    editingIdRef.current = null;

    // 변경이 있으면 store 업데이트 (히스토리 1건 자동 기록)
    if (finalValue !== originalValue) {
      const state = useStore.getState();
      const element = state.elementsMap.get(elementId);
      if (element) {
        const props = element.props as Record<string, unknown> | undefined;
        const propKey = getTextPropKey(element.tag, props);
        state.updateElementProps(elementId, {
          ...props,
          [propKey]: finalValue,
        });
        // layoutVersion 증가 (텍스트 변경 → 레이아웃 재계산 필요)
        state.invalidateLayout?.();
      }
    }

    setEditState(null);
  }, []);

  // 편집 취소 (Pencil: 원본 유지, store 변경 없음)
  const cancelEdit = useCallback((elementId: string) => {
    if (editingIdRef.current !== elementId) return;

    // Pencil showText: Skia 텍스트 렌더링 복원 + 리렌더 트리거
    setEditingElementId(null);
    notifyLayoutChange();
    editingIdRef.current = null;

    // 편집 중 store를 변경하지 않으므로 복원 불필요 — 그냥 닫기
    setEditState(null);
  }, []);

  const isEditing = editState !== null;

  return {
    editState,
    startEdit,
    updateText,
    completeEdit,
    cancelEdit,
    isEditing,
  };
}

export default useTextEdit;
