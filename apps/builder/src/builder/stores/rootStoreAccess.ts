import type { StoreApi, UseBoundStore } from "zustand";

import {
  useStore as fallbackElementsStore,
  type ElementsState,
} from "./elements";

type LiveBuilderStore = UseBoundStore<
  StoreApi<ElementsState & Record<string, unknown>>
>;

type WindowWithBuilderStore = Window & {
  __composition_STORE__?: LiveBuilderStore;
};

/**
 * Layouts store lives outside the unified Builder store, but its actions need
 * to mutate the live Builder state used by Canvas/Properties.
 */
export function getLiveElementsState(): ElementsState {
  const liveStore =
    typeof window === "undefined"
      ? undefined
      : (window as WindowWithBuilderStore).__composition_STORE__;

  return liveStore
    ? (liveStore.getState() as ElementsState)
    : fallbackElementsStore.getState();
}
