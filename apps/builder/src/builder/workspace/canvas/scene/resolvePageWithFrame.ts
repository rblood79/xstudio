/**
 * ADR-911 P3-θ — Page + Frame Slot Fill Resolution (D7=B / D8=A / D9=A 채택)
 *
 * page.layout_id 가 set 된 경우, 해당 frame 의 element 들 (page_id=null +
 * layout_id===page.layout_id) 을 page rendering pipeline 에 합성한다.
 *
 * 정책:
 *  - D7=B (별도 resolver) — pageIndex 의 page_id 의미 보존, page rendering 진입점
 *    `buildPageDataMap` 에서 명시 호출
 *  - D8=A (legacy slot_name 매칭) — page root element 의 `slot_name`
 *    (props.slot_name 또는 element.slot_name) 이 frame Slot 의 name 과 일치 시
 *    page element 의 parent_id 를 해당 Slot 의 id 로 재매핑하여 fill
 *  - D9=A (무조건 적용) — feature flag 없이 모든 layout-bound page 에 적용
 *
 * Override 분리 (G3-θ c):
 *  - page slot fill 이 매칭된 Slot 의 default 자식 (frame element 중
 *    parent_id===slot.id) 은 결과에서 제외 (hide)
 *  - 매칭 안 된 Slot (예: page slot:content fill 만 있고 slot:header 미 fill 시)
 *    의 default 자식은 그대로 노출
 */

import type { Element, Page } from "../../../../types/core/store.types";

export interface ResolvePageWithFrameInput {
  /** 현재 page (layout_id 가 set 되어 있으면 frame 합성) */
  page: Page;
  /** page_id===page.id 인 element 들 (이미 order_num 정렬) */
  pageElements: Element[];
  /** 전체 elementsMap (frame elements 검색용) */
  elementsMap: Map<string, Element>;
}

export interface ResolvePageWithFrameOutput {
  /** root body element — frame binding 시 frame body, 미바인딩 시 page body */
  bodyElement: Element | null;
  /** body 제외 element 들 (frame slot subtree + page slot fill 합성) */
  pageElements: Element[];
  /** page.layout_id 가 set + frame body 발견 시 true */
  hasFrameBinding: boolean;
}

function isBodyType(type: string): boolean {
  return type.toLowerCase() === "body";
}

function readSlotName(el: Element): string {
  const fromProps = (el.props as { slot_name?: string } | undefined)?.slot_name;
  return fromProps ?? el.slot_name ?? "content";
}

function readSlotElementName(slot: Element): string {
  const fromProps = (slot.props as { name?: string } | undefined)?.name;
  return fromProps ?? slot.slot_name ?? "content";
}

/**
 * page + (optional) frame element 합성 → ScenePageData 호환 출력.
 *
 * page.layout_id 미바인딩: 기존 동작 — page body + page nonBody.
 * page.layout_id 바인딩 + frame body 발견: page body 유지 (root) + frame body
 *   의 자식 (Slot 등) 을 page body 자식으로 reparent + frame Slot 의 default
 *   자식 (Text 등) 그대로 + page root element slot_name 매칭 → 해당 Slot 자식
 *   으로 재매핑 + page non-root 그대로.
 *
 * 정책 정합 (design breakdown §4.10): "frame body subtree 를 page body 자식으로
 * 가상 merge" — frame body 자체가 아닌 frame body **의 자식들** 을 reparent.
 * page width/height/배경 등 시각 속성 보존 + slot_name 미매칭 element orphan 방지.
 */
export function resolvePageWithFrame(
  input: ResolvePageWithFrameInput,
): ResolvePageWithFrameOutput {
  const { page, pageElements, elementsMap } = input;
  const layoutId = page.layout_id ?? null;

  const splitPageBody = (): {
    body: Element | null;
    nonBody: Element[];
  } => {
    let body: Element | null = null;
    const nonBody: Element[] = [];
    for (const el of pageElements) {
      if (isBodyType(el.type)) {
        if (!body) body = el;
        continue;
      }
      nonBody.push(el);
    }
    return { body, nonBody };
  };

  if (!layoutId) {
    const { body, nonBody } = splitPageBody();
    return { bodyElement: body, pageElements: nonBody, hasFrameBinding: false };
  }

  const frameElements: Element[] = [];
  for (const el of elementsMap.values()) {
    if (el.layout_id !== layoutId) continue;
    if (el.page_id != null) continue;
    if (el.deleted) continue;
    frameElements.push(el);
  }

  let frameBody: Element | null = null;
  for (const el of frameElements) {
    if (isBodyType(el.type)) {
      frameBody = el;
      break;
    }
  }

  const { body: pageBody, nonBody: pageNonBody } = splitPageBody();

  if (!frameBody || !pageBody) {
    return {
      bodyElement: pageBody,
      pageElements: pageNonBody,
      hasFrameBinding: false,
    };
  }

  const slotByName = new Map<string, Element>();
  for (const el of frameElements) {
    if (el.type !== "Slot") continue;
    const slotName = readSlotElementName(el);
    if (!slotByName.has(slotName)) slotByName.set(slotName, el);
  }

  const pageBodyId = pageBody.id;
  const frameBodyId = frameBody.id;

  const pageRootBySlot = new Map<string, Element[]>();
  const pageNonRoot: Element[] = [];
  for (const el of pageNonBody) {
    const isRoot = !el.parent_id || el.parent_id === pageBodyId;
    if (!isRoot) {
      pageNonRoot.push(el);
      continue;
    }
    const slotName = readSlotName(el);
    const list = pageRootBySlot.get(slotName);
    if (list) list.push(el);
    else pageRootBySlot.set(slotName, [el]);
  }

  const hiddenChildIds = new Set<string>();
  for (const [slotName, slot] of slotByName) {
    if (!pageRootBySlot.has(slotName)) continue;
    for (const el of frameElements) {
      if (el.parent_id === slot.id) hiddenChildIds.add(el.id);
    }
  }

  const result: Element[] = [];

  for (const el of frameElements) {
    if (el.id === frameBodyId) continue;
    if (hiddenChildIds.has(el.id)) continue;
    if (el.parent_id === frameBodyId) {
      result.push({ ...el, parent_id: pageBodyId });
    } else {
      result.push(el);
    }
  }

  const fallbackSlot =
    slotByName.get("content") ?? slotByName.values().next().value ?? null;

  for (const [slotName, elements] of pageRootBySlot) {
    const targetSlot = slotByName.get(slotName) ?? fallbackSlot;
    if (!targetSlot) {
      result.push(...elements);
      continue;
    }
    for (const el of elements) {
      result.push({ ...el, parent_id: targetSlot.id });
    }
  }

  result.push(...pageNonRoot);

  result.sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));

  return {
    bodyElement: pageBody,
    pageElements: result,
    hasFrameBinding: true,
  };
}
