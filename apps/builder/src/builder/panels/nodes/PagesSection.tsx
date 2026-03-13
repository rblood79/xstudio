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
  const removePageLocal = useStore((state) => state.removePageLocal);

  // Hooks
  const { requestAutoSelectAfterUpdate } = useIframeMessenger();
  const { pageList, addPage, fetchElements, isCreatingPage } = usePageManager({
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
    (page: Page) => {
      panToPage(page.id);
      setCurrentPageId(page.id);
      fetchElements(page.id);
    },
    [setCurrentPageId, fetchElements]
  );

  // 페이지 삭제 핸들러
  const handlePageDelete = useCallback(
    async (page: Page) => {
      try {
        // 1. IndexedDB에서 해당 페이지의 모든 요소 조회 및 삭제
        const db = await getDB();
        const pageElements = await db.elements.getByPage(page.id);
        const elementIds = pageElements.map((el) => el.id);

        console.log(
          `🗑️ Page "${page.title}" 삭제 시작: ${elementIds.length}개 요소 포함`
        );

        // 2. IndexedDB에서 페이지 + 요소를 단일 transaction으로 삭제
        if (db.pages.deleteWithElements) {
          await db.pages.deleteWithElements(page.id, elementIds);
        } else {
          if (elementIds.length > 0) {
            await db.elements.deleteMany(elementIds);
            console.log(`✅ [IndexedDB] ${elementIds.length}개 요소 삭제 완료`);
          }
          await db.pages.delete(page.id);
        }
        console.log(`✅ [IndexedDB] Page "${page.title}" 삭제 완료`);

        // 3. Supabase에서 삭제 (캐시 무효화 포함)
        await pagesApi.deletePage(page.id);
        console.log(`✅ [Supabase] Page "${page.title}" 삭제 완료`);
      } catch (error) {
        console.error("페이지 삭제 에러:", error);
        return;
      }

      // 4. pageList에서 제거
      if (pageList?.remove) {
        pageList.remove(page.id);
      }

      // 5. 남은 페이지 목록 계산
      const remainingPages = pages.filter((p) => p.id !== page.id);

      // 6. Zustand store에서도 제거
      removePageLocal(page.id);

      console.log("✅ 페이지 삭제 완료:", page.title);

      // 7. 남은 페이지가 있으면 자동으로 선택
      if (remainingPages.length > 0) {
        const homePage = remainingPages.find((p) => p.order_num === 0);
        const pageToSelect = homePage || remainingPages[0];
        handlePageSelect(pageToSelect);
      }
    },
    [handlePageSelect, pageList, pages, removePageLocal]
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
