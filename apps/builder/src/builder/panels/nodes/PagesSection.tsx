/**
 * PagesSection - Pages 섹션 (메모이제이션 적용)
 *
 * NodesPanel에서 분리하여 pages 변경 시에만 리렌더링되도록 최적화
 */

import React, { memo, startTransition, useCallback, useState } from "react";
import type { Key } from "react-stately";
import { Button } from "react-aria-components";
import { CirclePlus } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { useStore } from "../../stores";
import { useIframeMessenger, usePageManager } from "@/builder/hooks";
import { PanelHeader } from "../../components";
import { PageTree } from "./tree/PageTree";
import { getDB } from "../../../lib/db";
import type { Page } from "../../../types/builder/unified.types";
import { panToPage } from "../../workspace/canvas/viewport/panToPage";
import { enqueuePagePersistence } from "../../utils/pagePersistenceQueue";
import { scheduleNextFrame } from "../../utils/scheduleTask";
import { longTaskMonitor } from "../../../utils/longTaskMonitor";

interface PagesSectionProps {
  projectId: string | undefined;
}

function logPerf(name: string, startTime: number, extra?: Record<string, unknown>) {
  const duration = performance.now() - startTime;
  if (duration < 8) {
    return;
  }

  const payload = extra ? { durationMs: Number(duration.toFixed(1)), ...extra } : duration;
  console.log(`[perf] ${name}`, payload);
}

export const PagesSection = memo(function PagesSection({
  projectId,
}: PagesSectionProps) {
  // 🚀 Pages만 구독 - elements 변경 시 리렌더링 안됨
  const pages = useStore((state) => state.pages);
  const currentPageId = useStore((state) => state.currentPageId);
  const activatePage = useStore((state) => state.activatePage);
  const removePageLocal = useStore((state) => state.removePageLocal);

  // Hooks
  const { requestAutoSelectAfterUpdate } = useIframeMessenger();
  const { addPage, loadPageIfNeeded, isCreatingPage } = usePageManager({
    requestAutoSelectAfterUpdate,
  });

  const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(new Set());

  // 페이지 추가 핸들러
  const handleAddPage = useCallback(async () => {
    if (!projectId) {
      console.error("프로젝트 ID가 없습니다");
      return;
    }
    await longTaskMonitor.measureAsync("perf:pages.add-click", async () => {
      const startTime = performance.now();
      const result = await addPage(projectId);
      logPerf("pages.add-click", startTime, {
        pageCount: useStore.getState().pages.length,
        success: result.success,
      });
      return result;
    });
  }, [projectId, addPage]);

  // 페이지 선택 핸들러
  const handlePageSelect = useCallback(
    async (page: Page, options?: { pan?: boolean }) => {
      if (options?.pan !== false) {
        panToPage(page.id);
      }
      if (currentPageId !== page.id) {
        await loadPageIfNeeded(page.id);
        const pageBodyElement =
          (useStore.getState().pageElementsSnapshot[page.id] ?? []).find(
            (element) => element.order_num === 0,
          ) ?? null;
        startTransition(() => {
          activatePage(page.id, pageBodyElement?.id ?? null);
        });
      }
    },
    [activatePage, currentPageId, loadPageIfNeeded]
  );

  // 페이지 삭제 핸들러
  const handlePageDelete = useCallback(
    async (page: Page) => {
      const startTime = performance.now();
      const currentState = useStore.getState();
      const deletingCurrentPage = currentState.currentPageId === page.id;
      const pageIndex = pages.findIndex((candidate) => candidate.id === page.id);
      const pageElements = currentState.elements.filter(
        (element) => element.page_id === page.id,
      );
      const elementIds = pageElements.map((element) => element.id);
      const remainingPages = pages.filter((p) => p.id !== page.id);
      const previousPage =
        pageIndex > 0 ? pages[pageIndex - 1] ?? null : null;
      const nextPage =
        pageIndex >= 0 ? pages[pageIndex + 1] ?? null : null;
      const pageToSelect =
        remainingPages.find((candidate) => candidate.id === previousPage?.id) ??
        remainingPages.find((candidate) => candidate.id === nextPage?.id) ??
        remainingPages[0] ??
        null;
      const nextBodyElement = pageToSelect
        ? currentState.elements.find(
            (element) =>
              element.page_id === pageToSelect.id && element.order_num === 0,
          ) ?? null
        : null;

      console.log(
        `🗑️ Page "${page.title}" 삭제 시작: ${elementIds.length}개 요소 포함`
      );

      if (deletingCurrentPage && pageToSelect) {
        await loadPageIfNeeded(pageToSelect.id);
      }

      const loadedNextBodyElement =
        pageToSelect
          ? (useStore.getState().pageElementsSnapshot[pageToSelect.id] ?? []).find(
              (element) => element.order_num === 0,
            ) ?? nextBodyElement
          : null;

      // 1. UI는 즉시 반영하되, 현재 페이지 삭제 시 fallback activation은 다음 프레임으로 분리
      startTransition(() => {
        removePageLocal(
          page.id,
          deletingCurrentPage && pageToSelect
            ? {
                pageId: pageToSelect.id,
                elementId: null,
              }
            : undefined,
        );
      });

      if (deletingCurrentPage && pageToSelect) {
        scheduleNextFrame(() => {
          startTransition(() => {
            activatePage(pageToSelect.id, loadedNextBodyElement?.id ?? null);
          });
        });
      }

      logPerf("pages.delete-remove-local", startTime, {
        deletingCurrentPage,
        pageCountBefore: pages.length,
        pageCountAfter: useStore.getState().pages.length,
      });

      console.log("✅ 페이지 삭제 완료:", page.title);

      // 2. 영속화는 백그라운드에서 직렬 처리
      enqueuePagePersistence(async () => {
        try {
          const db = await getDB();
          if (db.pages.deleteWithElements) {
            await db.pages.deleteWithElements(page.id, elementIds);
          } else {
            if (elementIds.length > 0) {
              await db.elements.deleteMany(elementIds);
            }
            await db.pages.delete(page.id);
          }
          console.log(`✅ [IndexedDB] Page "${page.title}" 삭제 완료`);
        } catch (error) {
          console.error("페이지 삭제 에러:", error);
        }
      });

      logPerf("pages.delete-click.total", startTime, {
        deletingCurrentPage,
        remainingPages: remainingPages.length,
      });
    },
    [activatePage, loadPageIfNeeded, pages, removePageLocal]
  );

  return (
    <div className="section">
      <PanelHeader
        title="Pages"
        actions={
          <Button
            className="iconButton"
            aria-label="Add Page"
            isDisabled={isCreatingPage}
            onPress={handleAddPage}
          >
            <CirclePlus
              color={iconProps.color}
              strokeWidth={iconProps.strokeWidth}
              size={iconProps.size}
            />
          </Button>
        }
      />
      <div className="section-content">
        <PageTree
          pages={pages}
          selectedPageId={currentPageId}
          expandedKeys={expandedKeys}
          onExpandedChange={setExpandedKeys}
          onPageSelect={handlePageSelect}
          onPageDelete={handlePageDelete}
        />
      </div>
    </div>
  );
});
