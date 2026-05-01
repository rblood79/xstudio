import type { Element, Page } from "../../types/core/store.types";
import type { ElementsState } from "../stores/elements";
// ADR-916 Phase 3 G4 — mutation reverse pilot caller (D18=A 정합)
import { setElementsCanonicalPrimary } from "../../adapters/canonical/canonicalMutations";

type SemanticFixtureElement = Element & {
  componentRole?: "master" | "instance";
  masterId?: string;
  reusable?: boolean;
};

const FIXTURE_PARAM = "editingSemanticsFixture";
const PAGE_ID = "adr-912-editing-semantics-page";
const BODY_ID = "adr-912-editing-semantics-body";
const ORIGIN_ID = "adr-912-origin";
const INSTANCE_ID = "adr-912-instance";
const SLOT_FRAME_ID = "adr-912-slot-frame";
const SLOT_INSTANCE_ID = "adr-912-slot-instance";
const SLOT_RECOMMENDATION_ID = "adr-912-slot-recommendation";

export function shouldApplyEditingSemanticsFixture(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has(FIXTURE_PARAM);
}

function getInitialSelection(): string {
  if (typeof window === "undefined") return ORIGIN_ID;

  const value = new URLSearchParams(window.location.search).get(FIXTURE_PARAM);
  if (value === "slot") return SLOT_FRAME_ID;
  if (value === "slot-instance") return SLOT_INSTANCE_ID;
  return value === "instance" ? INSTANCE_ID : ORIGIN_ID;
}

export function applyEditingSemanticsFixture(store: ElementsState): void {
  const now = new Date().toISOString();
  const page: Page = {
    id: PAGE_ID,
    title: "ADR-912 Editing Semantics",
    project_id: "adr-912-fixture",
    slug: "adr-912-editing-semantics",
    order_num: 0,
    created_at: now,
    updated_at: now,
  };

  const body: SemanticFixtureElement = {
    id: BODY_ID,
    type: "body",
    page_id: PAGE_ID,
    parent_id: null,
    order_num: 0,
    props: {
      style: {
        alignItems: "flex-start",
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        gap: "32px",
        minHeight: "100%",
        padding: "56px",
        width: "100%",
      },
    },
    created_at: now,
    updated_at: now,
  };

  const origin: SemanticFixtureElement = {
    id: ORIGIN_ID,
    type: "Button",
    reusable: true,
    page_id: PAGE_ID,
    parent_id: BODY_ID,
    order_num: 1,
    props: {
      children: "Origin marker",
      style: {
        height: "44px",
        width: "180px",
      },
      variant: "primary",
    },
    created_at: now,
    updated_at: now,
  };

  const instanceA: SemanticFixtureElement = {
    id: INSTANCE_ID,
    type: "Button",
    componentRole: "instance",
    masterId: ORIGIN_ID,
    page_id: PAGE_ID,
    parent_id: BODY_ID,
    order_num: 2,
    props: {
      children: "Instance marker",
      style: {
        height: "44px",
        width: "180px",
      },
      variant: "secondary",
    },
    created_at: now,
    updated_at: now,
  };

  const instanceB: SemanticFixtureElement = {
    ...instanceA,
    id: "adr-912-instance-b",
    order_num: 3,
    props: {
      ...instanceA.props,
      children: "Instance marker B",
    },
  };

  const slotRecommendation: SemanticFixtureElement = {
    id: SLOT_RECOMMENDATION_ID,
    type: "NumberField",
    componentName: "RecommendedNumberField",
    reusable: true,
    page_id: PAGE_ID,
    parent_id: BODY_ID,
    order_num: 4,
    props: {
      label: "Recommended number",
      style: {
        height: "72px",
        width: "220px",
      },
    },
    created_at: now,
    updated_at: now,
  };

  const slotFrame: SemanticFixtureElement = {
    id: SLOT_FRAME_ID,
    type: "frame",
    componentName: "ArticleFrame",
    reusable: true,
    page_id: PAGE_ID,
    parent_id: BODY_ID,
    order_num: 5,
    slot: [SLOT_RECOMMENDATION_ID],
    metadata: {
      slot: [SLOT_RECOMMENDATION_ID],
    },
    props: {
      style: {
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        height: "160px",
        padding: "16px",
        width: "280px",
      },
    },
    created_at: now,
    updated_at: now,
  } as SemanticFixtureElement;

  const slotInstance: SemanticFixtureElement = {
    id: SLOT_INSTANCE_ID,
    type: "ref",
    ref: SLOT_FRAME_ID,
    page_id: PAGE_ID,
    parent_id: BODY_ID,
    order_num: 6,
    props: {
      style: {
        height: "160px",
        width: "280px",
      },
    },
    created_at: now,
    updated_at: now,
  } as SemanticFixtureElement;

  store.setPages([page]);
  // ADR-916 G4 wrapper 경유 — mutation reverse pilot
  setElementsCanonicalPrimary([
    body,
    origin,
    instanceA,
    instanceB,
    slotRecommendation,
    slotFrame,
    slotInstance,
  ]);
  store.setCurrentPageId(PAGE_ID);
  store.selectElementWithPageTransition(getInitialSelection(), PAGE_ID);

  if (import.meta.env.DEV) {
    console.info(
      "[ADR-912] editing semantics fixture loaded. Use ?editingSemanticsFixture=origin, =instance, =slot, or =slot-instance.",
    );
  }
}
