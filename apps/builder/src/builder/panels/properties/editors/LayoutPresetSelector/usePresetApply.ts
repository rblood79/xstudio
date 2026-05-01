/**
 * usePresetApply - 프리셋 적용 훅
 *
 * Phase 6: Layout 프리셋 적용 핵심 로직
 *
 * 핵심 기능:
 * 1. 기존 Slot 감지
 * 2. 모드별 처리 (replace/merge/cancel)
 * 3. Slot 일괄 생성 (addComplexElement 패턴)
 * 4. History 단일 엔트리 기록
 */

import { useCallback, useMemo, useState } from "react";
import { useStore } from "../../../../stores";
import { LAYOUT_PRESETS } from "./presetDefinitions";
import { normalizeFramePresetContainerStyle } from "./presetStyle";
import type {
  PresetApplyMode,
  ExistingSlotInfo,
  SlotDefinition,
} from "./types";
import type { Element } from "../../../../../types/builder/unified.types";
import { isFrameElementForFrame } from "../../../../../adapters/canonical/frameElementLoader";
import { withFrameElementMirrorId } from "../../../../../adapters/canonical/frameMirror";
import { getSlotMirrorName } from "../../../../../adapters/canonical/slotMirror";

export { normalizeFramePresetContainerStyle } from "./presetStyle";

interface UsePresetApplyOptions {
  /** Layout ID */
  layoutId: string;
  /** Body Element ID */
  bodyElementId: string;
}

interface UsePresetApplyReturn {
  /** 현재 Layout의 기존 Slot 목록 */
  existingSlots: ExistingSlotInfo[];
  /** 현재 적용된 프리셋 키 (감지된 경우) */
  currentPresetKey: string | null;
  /** 프리셋 적용 함수 */
  applyPreset: (presetKey: string, mode: PresetApplyMode) => Promise<void>;
  /** 적용 중 여부 */
  isApplying: boolean;
}

/**
 * 프리셋 적용 훅
 */
export function usePresetApply({
  layoutId,
  bodyElementId,
}: UsePresetApplyOptions): UsePresetApplyReturn {
  const [isApplying, setIsApplying] = useState(false);

  // Store actions
  // ADR-040: elementsMap O(1) 조회 (전체 elements 배열 구독 제거)
  const elementsMap = useStore((state) => state.elementsMap);
  const childrenMap = useStore((state) => state.childrenMap);
  const addComplexElement = useStore((state) => state.addComplexElement);
  const removeElements = useStore((state) => state.removeElements);
  const updateElementProps = useStore((state) => state.updateElementProps);

  // 현재 Layout의 기존 Slot 목록.
  //
  // ADR-911 P2 fix: 이전 구현은 `belongsToLegacyLayout(el, layoutId, canonicalDoc)`
  // 로 canonical document 기반 매칭. 그러나 `convertLayoutToReusableFrame` 가
  // slot element 를 `convertElementWithSlotHoisting` 으로 hoist 하여 canonical
  // frame.children 에 slot 이 사라짐 → `isCanonicalDescendantOf(slot, frame)`
  // 항상 false → existingSlots 0개 → currentPresetKey null → 우측 LayoutPresetSelector
  // 의 "적용됨" 표시 stale.
  //
  // 직접 layout binding 매칭은 hoist 영향 받지 않음. slot 은
  // P4 까지 legacy element 로 elementsMap 에 존재. 좌측
  // FramesTab.frameElements 도 같은 직접 매칭 패턴 사용 — 정상 작동 확인됨.
  const existingSlots = useMemo((): ExistingSlotInfo[] => {
    const slots: ExistingSlotInfo[] = [];
    elementsMap.forEach((el) => {
      if (el.type === "Slot" && isFrameElementForFrame(el, layoutId)) {
        const slotChildren = childrenMap.get(el.id) ?? [];
        const slotName =
          ((el.props as { name?: string })?.name as string) || "unnamed";
        const hasChildren =
          slotChildren.length > 0 ||
          // legacy slot binding 매칭도 확인
          (() => {
            let found = false;
            elementsMap.forEach((other) => {
              if (getSlotMirrorName(other.props) === slotName) {
                found = true;
              }
            });
            return found;
          })();
        slots.push({ slotName, elementId: el.id, hasChildren });
      }
    });
    return slots;
  }, [elementsMap, childrenMap, layoutId]);

  // ⭐ 현재 적용된 프리셋 감지 (body element의 appliedPreset prop에서 읽기)
  const currentPresetKey = useMemo((): string | null => {
    // ADR-040: elementsMap O(1) 조회
    const body = elementsMap.get(bodyElementId);
    if (!body) return null;

    const appliedPreset = (body.props as { appliedPreset?: string })
      ?.appliedPreset;

    // appliedPreset이 있고, 해당 프리셋이 존재하며, 현재 slots과 일치하는지 검증
    if (appliedPreset && LAYOUT_PRESETS[appliedPreset]) {
      const preset = LAYOUT_PRESETS[appliedPreset];
      const presetSlotNames = new Set(preset.slots.map((s) => s.name));
      const existingSlotNames = new Set(existingSlots.map((s) => s.slotName));

      // slot 구성이 여전히 일치하면 유효
      if (
        existingSlotNames.size === presetSlotNames.size &&
        [...existingSlotNames].every((name) => presetSlotNames.has(name))
      ) {
        return appliedPreset;
      }
    }

    return null;
  }, [elementsMap, bodyElementId, existingSlots]);

  // 프리셋 적용 함수
  const applyPreset = useCallback(
    async (presetKey: string, mode: PresetApplyMode): Promise<void> => {
      if (mode === "cancel") return;

      const preset = LAYOUT_PRESETS[presetKey];
      if (!preset) {
        console.error(`[usePresetApply] Unknown preset: ${presetKey}`);
        return;
      }

      console.log(
        `[Preset] Applying "${preset.name}" to layout ${layoutId.slice(0, 8)}...`,
      );

      setIsApplying(true);

      try {
        // ============================================
        // Step 1: 기존 Slot 처리
        // ============================================
        if (mode === "replace" && existingSlots.length > 0) {
          console.log(
            `[Preset] Removing ${existingSlots.length} existing slots...`,
          );

          // 병렬 removeElement 는 각 삭제가 오래된 currentState 를 기준으로
          // set 할 수 있어, 마지막 commit 이 앞선 삭제를 메모리에 되살린다.
          // replace 는 동일 부모의 slot 집합을 한 번에 제거해야 한다.
          await removeElements(existingSlots.map((slot) => slot.elementId));

          console.log(
            `[Preset] Removed ${existingSlots.length} existing slots`,
          );
        }

        // ============================================
        // Step 2: 새 Slot 생성 준비
        // ============================================
        const existingSlotNames = new Set(existingSlots.map((s) => s.slotName));
        const slotsToCreate: SlotDefinition[] =
          mode === "merge"
            ? preset.slots.filter((s) => !existingSlotNames.has(s.name))
            : preset.slots;

        if (slotsToCreate.length === 0) {
          console.log("[Preset] No new slots to create (all already exist)");
          setIsApplying(false);
          return;
        }

        console.log(`[Preset] Creating ${slotsToCreate.length} new slots...`);

        // ============================================
        // Step 3: Slot Element 배열 생성
        // ============================================
        let orderNum = 1;
        const slotElements: Element[] = slotsToCreate.map(
          (slotDef): Element =>
            withFrameElementMirrorId(
              {
                id: crypto.randomUUID(),
                type: "Slot",
                props: {
                  name: slotDef.name,
                  required: slotDef.required,
                  description: slotDef.description,
                  style: slotDef.defaultStyle,
                },
                parent_id: bodyElementId,
                page_id: null,
                order_num: orderNum++,
              },
              layoutId,
            ),
        );

        // ============================================
        // Step 4: Body에 containerStyle 및 appliedPreset 저장
        // ============================================
        // ADR-040: elementsMap O(1) 조회 (handler 내부 → getState 최신값)
        const body = useStore.getState().elementsMap.get(bodyElementId);
        if (body) {
          const currentStyle =
            ((body.props as { style?: Record<string, unknown> })
              ?.style as Record<string, unknown>) || {};

          // containerStyle이 있으면 병합, 없으면 기존 스타일 유지
          const presetContainerStyle = normalizeFramePresetContainerStyle(
            preset.containerStyle,
          );
          const mergedStyle =
            Object.keys(presetContainerStyle).length > 0
              ? { ...currentStyle, ...presetContainerStyle }
              : currentStyle;

          // ⭐ appliedPreset 키 저장 (동일 프리셋 감지용)
          await updateElementProps(bodyElementId, {
            style: mergedStyle,
            appliedPreset: presetKey,
          });
          console.log(`[Preset] Saved appliedPreset="${presetKey}" to body`);
        }

        // ============================================
        // Step 5: Slot 일괄 생성 (단일 History 엔트리)
        // ============================================
        if (slotElements.length > 0) {
          // 첫 번째 Slot을 "parent"로, 나머지를 "children"으로 처리
          // addComplexElement가 단일 History 엔트리 생성
          const [firstSlot, ...restSlots] = slotElements;
          await addComplexElement(firstSlot, restSlots);

          console.log(
            `[Preset] Created ${slotElements.length} slots with single history entry`,
          );
        }

        console.log(`[Preset] "${preset.name}" applied successfully`);
      } catch (error) {
        console.error("[Preset] Failed to apply preset:", error);
        throw error;
      } finally {
        setIsApplying(false);
      }
    },
    [
      layoutId,
      bodyElementId,
      existingSlots,
      addComplexElement,
      removeElements,
      updateElementProps,
    ],
  );

  return {
    existingSlots,
    currentPresetKey,
    applyPreset,
    isApplying,
  };
}

export default usePresetApply;
