/**
 * Data Component Renderers
 *
 * DataTable 등 데이터 관리 컴포넌트 렌더러
 * DataTable은 비시각적 컴포넌트로, UI를 렌더링하지 않고
 * 데이터를 로드하여 다른 컴포넌트가 참조할 수 있도록 합니다.
 */

import type { PreviewElement, RenderContext } from "../types";
import type { ReactNode } from "react";
import { DataTableComponent } from "./DataTableComponent";

/**
 * DataTable 렌더러
 */
export function renderDataTable(
  element: PreviewElement,
  context: RenderContext,
): ReactNode {
  return (
    <DataTableComponent
      key={element.id}
      element={element}
      setDataState={context.setDataState}
    />
  );
}
