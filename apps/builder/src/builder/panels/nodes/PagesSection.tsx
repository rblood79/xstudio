/**
 * PagesSection - Pages 섹션 (메모이제이션 적용)
 *
 * NodesPanel에서 분리하여 pages 변경 시에만 리렌더링되도록 최적화
 */

import React, { memo, useCallback, useState } from "react";
import type { Key } from "react-stately";
import { Button } from "react-aria-components";
import { CirclePlus } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { useStore } from "../../stores";
import { useIframeMessenger, usePageManager } from "@/builder/hooks";
import { PanelHeader } from "../../components";
import { PageTree } from "./tree/PageTree";
import { pagesApi } from "../../../services/api/PagesApiService";
import { getDB } from "../../../lib/db";
import type { Page } from "../../../types/builder/unified.types";
import { panToPage } from "../../workspace/canvas/viewport/panToPage";
import { enqueuePagePersistence } from "../../utils/pagePersistenceQueue";

interface PagesSectionProps {
  projectId: string | undefined;
}

export const PagesSection = memo(function PagesSection({
  projectId,
}: PagesSectionProps) {
  // 🚀 Pages만 구독 - elements 변경 시 리렌더링 안됨
  const pages = useStore((state) => state.pages);
  const currentPageId = useStore((state) => state.currentPageId);
  const setCurrentPageId = useStore((state) => state.setCurrentPageId);
  const setSelectedElement = useStore((state) => state.setSelectedElement);
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
    await addPage(projectId);
  }, [projectId, addPage]);

  // 페이지 선택 핸들러
  const handlePageSelect = useCallback(
    (page: Page, options?: { pan?: boolean }) => {
      if (options?.pan !== false) {
        panToPage(page.id);
      }
      if (currentPageId !== page.id) {
        setCurrentPageId(page.id);
      }
      loadPageIfNeeded(page.id);
    },
    [currentPageId, loadPageIfNeeded, setCurrentPageId]
  );

  // 페이지 삭제 핸들러
  const handlePageDelete = useCallback(
    async (page: Page) => {
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

      // 1. UI는 즉시 반영
      removePageLocal(page.id);

      console.log("✅ 페이지 삭제 완료:", page.title);

      // 2. 남은 페이지가 있으면 자동으로 선택
      if (deletingCurrentPage && remainingPages.length > 0) {
        if (pageToSelect) {
          setCurrentPageId(pageToSelect.id);
          if (nextBodyElement) {
            setSelectedElement(nextBodyElement.id);
          }
          void loadPageIfNeeded(pageToSelect.id);
        }
      }

      // 3. 영속화는 백그라운드에서 직렬 처리
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

          await pagesApi.deletePage(page.id);
          console.log(`✅ [Supabase] Page "${page.title}" 삭제 완료`);
        } catch (error) {
          console.error("페이지 삭제 에러:", error);
        }
      });
    },
    [loadPageIfNeeded, pages, removePageLocal, setCurrentPageId, setSelectedElement]
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
