import React from "react";
import Table, { type ColumnDefinition } from "../../shared/components/Table";
import { PreviewElement, RenderContext } from "../types";
import { ElementProps } from "../../types/integrations/supabase.types";
import { ElementUtils } from "../../utils/element/elementUtils";

/**
 * Table 컴포넌트 렌더러
 * - Table
 * - TableHeader, TableBody (null 반환 - Table 내부에서 처리)
 * - Column, Row, Cell (null 반환 - Table 내부에서 처리)
 * - ColumnGroup
 */

// Column Elements 생성 요청 추적 (중복 방지)
const columnCreationRequestedRef = React.createRef<Set<string>>();
if (!columnCreationRequestedRef.current) {
  (columnCreationRequestedRef as React.MutableRefObject<Set<string>>).current =
    new Set();
}

/**
 * Table 렌더링
 */
export const renderTable = (
  element: PreviewElement,
  context: RenderContext
): React.ReactNode => {
  const { elements } = context;

  // TableHeader 찾기
  const children = elements
    .filter((child) => child.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  const tableHeaderElement = children.find(
    (child) => child.tag === "TableHeader"
  );

  // Column Elements 찾기
  const columnElements = tableHeaderElement
    ? elements
        .filter(
          (el) =>
            el.parent_id === tableHeaderElement.id &&
            el.tag === "Column" &&
            !el.deleted
        )
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
    : children.filter((child) => child.tag === "Column" && !child.deleted);

  // Column 정의 생성
  const columns = columnElements.map((col, index) => {
    const dataKey =
      col.props.key ||
      (typeof col.props.children === "string"
        ? col.props.children.toLowerCase()
        : "") ||
      col.props.id ||
      `col${index}`;

    return {
      key: dataKey as string,
      label: (col.props.children || col.props.label || "Column") as string,
      elementId: col.id,
      order_num: col.order_num,
      allowsSorting: Boolean(col.props.allowsSorting ?? true),
      enableResizing: Boolean(col.props.enableResizing ?? true),
      width: typeof col.props.width === "number" ? col.props.width : 150,
      minWidth:
        typeof col.props.minWidth === "number" ? col.props.minWidth : undefined,
      maxWidth:
        typeof col.props.maxWidth === "number" ? col.props.maxWidth : undefined,
      align: (col.props.align || "left") as "left" | "center" | "right",
    };
  });

  // dataBinding을 통한 API 데이터 사용 여부 확인
  const hasApiBinding =
    element.dataBinding?.type === "collection" &&
    element.dataBinding?.source === "api";

  // API 설정 추출
  let apiConfig: {
    baseUrl?: string;
    customUrl?: string;
    endpoint?: string;
    params?: Record<string, unknown>;
    dataMapping?: {
      resultPath?: string;
      idKey?: string;
      totalKey?: string;
    };
  } = {};

  if (hasApiBinding && element.dataBinding?.config) {
    const config = element.dataBinding.config as typeof apiConfig;
    apiConfig = {
      baseUrl: config.baseUrl,
      customUrl: config.customUrl,
      endpoint: config.endpoint,
      params: config.params,
      dataMapping: config.dataMapping,
    };
  }

  // 정적 데이터 바인딩에서 데이터 추출
  const staticData =
    element.dataBinding?.type === "collection" &&
    element.dataBinding?.source === "static" &&
    element.dataBinding?.config &&
    (element.dataBinding.config as { data?: unknown[] }).data;

  // Supabase 데이터는 props.data에 저장됨
  const supabaseData =
    element.dataBinding?.type === "collection" &&
    element.dataBinding?.source === "supabase" &&
    (element.props as { data?: unknown[] }).data;

  console.log("🔍 데이터 소스 확인:", {
    hasSupabaseBinding: element.dataBinding?.source === "supabase",
    supabaseDataLength: Array.isArray(supabaseData) ? supabaseData.length : 0,
    hasStaticBinding: element.dataBinding?.source === "static",
    staticDataLength: Array.isArray(staticData) ? staticData.length : 0,
    propsData: (element.props as { data?: unknown[] }).data,
  });

  // API 데이터 사용 시 빈 배열로 시작 (Table 컴포넌트에서 로딩)
  // 정적 데이터 또는 Supabase 데이터 사용 시 실제 데이터 제공
  const rawData = hasApiBinding ? [] : supabaseData || staticData || [];

  // 빈 배열인 경우 undefined로 처리 (데이터가 없는 것과 빈 배열 구분)
  const finalData =
    Array.isArray(rawData) && rawData.length === 0 ? undefined : rawData;

  // 데이터 소스 변경 감지 - 이전과 다른 데이터 소스면 요청 캐시 초기화
  const currentDataSource = element.dataBinding?.source || "none";
  const tableRequestPrefix = `${element.id}_`;

  // 현재 테이블의 모든 요청 기록 중 다른 데이터 소스 것들 삭제
  const keysToDelete: string[] = [];
  columnCreationRequestedRef.current?.forEach((key) => {
    if (
      key.startsWith(tableRequestPrefix) &&
      !key.includes(`_${currentDataSource}_`)
    ) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => {
    columnCreationRequestedRef.current?.delete(key);
    console.log("🗑️ 이전 데이터 소스 요청 기록 삭제:", key);
  });

  // 정적 데이터 바인딩의 컬럼 매핑에서 컬럼 생성
  let mappedColumns: ColumnDefinition<{ id: string | number }>[] = [];

  // Static Data의 컬럼 매핑 (props.columnMapping에서 가져옴)
  if (
    element.dataBinding?.type === "collection" &&
    element.dataBinding?.source === "static" &&
    (element.props as { columnMapping?: unknown }).columnMapping
  ) {
    const columnMapping = (
      element.props as {
        columnMapping: Record<
          string,
          {
            key: string;
            label?: string;
            type?: string;
            sortable?: boolean;
            width?: number;
            align?: string;
          }
        >;
      }
    ).columnMapping;

    console.log("🔍 Static Data 컬럼 매핑 발견:", columnMapping);

    mappedColumns = Object.entries(columnMapping).map(
      ([columnName, mapping]) => {
        console.log("📝 Static Data 컬럼 생성:", columnName, mapping);
        return {
          key: (mapping.key || columnName) as keyof { id: string | number },
          label: mapping.label || columnName,
          allowsSorting: mapping.sortable !== false,
          enableResizing: true,
          width: mapping.width || 150,
          align: (mapping.align || "left") as "left" | "center" | "right",
          elementId: ElementUtils.generateId(),
        };
      }
    );

    console.log("✅ Static Data 컬럼 생성 완료:", mappedColumns.length, mappedColumns);
  }

  // Supabase의 컬럼 매핑 (props.columnMapping에서 가져옴)
  if (
    element.dataBinding?.type === "collection" &&
    element.dataBinding?.source === "supabase" &&
    (element.props as { columnMapping?: unknown }).columnMapping
  ) {
    const columnMapping = (
      element.props as {
        columnMapping: Record<
          string,
          {
            key: string;
            label?: string;
            type?: string;
            sortable?: boolean;
            width?: number;
            align?: string;
          }
        >;
      }
    ).columnMapping;

    console.log("🔍 Supabase 컬럼 매핑 발견:", columnMapping);

    mappedColumns = Object.entries(columnMapping).map(
      ([columnName, mapping]) => {
        console.log("📝 Supabase 컬럼 생성:", columnName, mapping);
        return {
          key: (mapping.key || columnName) as keyof { id: string | number },
          label: mapping.label || columnName,
          allowsSorting: mapping.sortable !== false,
          enableResizing: true,
          width: mapping.width || 150,
          align: (mapping.align || "left") as "left" | "center" | "right",
          elementId: ElementUtils.generateId(),
        };
      }
    );

    console.log("✅ Supabase 컬럼 생성 완료:", mappedColumns.length, mappedColumns);
  }

  // API의 컬럼 매핑 (props.columns에서 가져옴)
  if (
    element.dataBinding?.type === "collection" &&
    element.dataBinding?.source === "api" &&
    (element.props as { columns?: string[] }).columns
  ) {
    const apiColumns = (element.props as { columns: string[] }).columns;

    console.log("🔍 API 컬럼 매핑 발견:", apiColumns);

    mappedColumns = apiColumns.map((columnName) => {
      console.log("📝 API 컬럼 생성:", columnName);
      return {
        key: columnName as keyof { id: string | number },
        label: columnName.charAt(0).toUpperCase() + columnName.slice(1),
        allowsSorting: true,
        enableResizing: true,
        width: 150,
        align: "left" as "left" | "center" | "right",
        elementId: ElementUtils.generateId(),
      };
    });

    console.log("✅ API 컬럼 생성 완료:", mappedColumns.length, mappedColumns);
  }

  // Column Element가 있으면 해당 컬럼 사용,
  // 없으면 매핑된 컬럼 사용 (Static/Supabase),
  // 그것도 없으면 빈 배열로 자동 감지 활성화
  const finalColumns =
    columns.length > 0
      ? columns
      : mappedColumns.length > 0
        ? mappedColumns
        : [];

  console.log("🎨 Table 렌더링 준비:", {
    tableId: element.id,
    hasApiBinding,
    columnElementsCount: columnElements.length,
    columnsLength: columns.length,
    mappedColumnsLength: mappedColumns.length,
    finalColumnsLength: finalColumns.length,
    willAutoDetect: finalColumns.length === 0,
    finalDataLength: Array.isArray(finalData) ? finalData.length : 0,
  });

  // Static/Supabase의 mappedColumns가 있고 Column Elements가 없으면
  // Column Elements 생성을 위해 부모에게 전달
  if (
    mappedColumns.length > 0 &&
    columnElements.length === 0 &&
    tableHeaderElement
  ) {
    const dataSource = element.dataBinding?.source || "none";
    const requestKey = `${element.id}_${dataSource}_${mappedColumns.map((c) => c.key).join("_")}`;

    if (!columnCreationRequestedRef.current?.has(requestKey)) {
      console.log("🔄 mappedColumns 감지 - Column Elements 생성 요청:", {
        dataSource,
        mappedColumns,
      });

      const columnElementsToCreate = mappedColumns.map((colDef, index) => ({
        id: colDef.elementId || `col_${Date.now()}_${index}`,
        tag: "Column",
        page_id: element.page_id,
        parent_id: tableHeaderElement.id,
        order_num: index,
        props: {
          key: String(colDef.key),
          label: colDef.label,
          children: colDef.label,
          allowsSorting: colDef.allowsSorting ?? true,
          enableResizing: colDef.enableResizing ?? true,
          width: colDef.width ?? 150,
          align: colDef.align ?? "left",
        },
      }));

      console.log("📤 부모에게 Column Elements 생성 요청:", columnElementsToCreate);

      columnCreationRequestedRef.current?.add(requestKey);

      window.parent.postMessage(
        {
          type: "ADD_COLUMN_ELEMENTS",
          payload: {
            tableId: element.id,
            tableHeaderId: tableHeaderElement.id,
            columns: columnElementsToCreate,
          },
        },
        window.location.origin
      );
    } else {
      console.log("⏭️ Column Elements 생성 이미 요청됨, 건너뛰기:", requestKey);
    }
  }

  // Column Group Element에서 추출한 그룹 데이터 생성
  const columnGroups = tableHeaderElement
    ? elements
        .filter(
          (el) =>
            el.parent_id === tableHeaderElement.id && el.tag === "ColumnGroup"
        )
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
        .map((groupEl) => {
          const props = groupEl.props as ElementProps;

          const alignValue = String(props?.align || "center");
          const align: "left" | "center" | "right" =
            alignValue === "left" ||
            alignValue === "center" ||
            alignValue === "right"
              ? alignValue
              : "center";

          const variantValue = String(props?.variant || "default");
          const variant: "default" | "primary" | "secondary" =
            variantValue === "primary" || variantValue === "secondary"
              ? variantValue
              : "default";

          return {
            id: groupEl.id,
            label: String(props?.label || "Group"),
            span: Number(props?.span || 2),
            order_num: groupEl.order_num,
            align,
            variant,
            sticky: Boolean(props?.sticky || false),
          };
        })
    : [];

  return (
    <Table
      key={element.id}
      id={element.customId}
      data-element-id={element.id}
      tableHeaderElementId={tableHeaderElement?.id}
      className={element.props.className}
      columns={finalColumns as ColumnDefinition<{ id: string | number }>[]}
      columnGroups={columnGroups}
      data={
        hasApiBinding
          ? undefined
          : finalData && Array.isArray(finalData) && finalData.length > 0
            ? (finalData as { id: string | number }[])
            : undefined
      }
      paginationMode={
        (element.props.paginationMode as "pagination" | "infinite") ||
        "pagination"
      }
      itemsPerPage={
        typeof element.props.itemsPerPage === "number"
          ? element.props.itemsPerPage
          : 50
      }
      height={
        typeof element.props.height === "number" ? element.props.height : 300
      }
      heightMode={
        (element.props.heightMode as "auto" | "fixed" | "viewport" | "full") ||
        "fixed"
      }
      heightUnit={(element.props.heightUnit as "px" | "vh" | "rem" | "em") || "px"}
      viewportHeight={
        typeof element.props.viewportHeight === "number"
          ? element.props.viewportHeight
          : 50
      }
      rowHeight={
        typeof element.props.rowHeight === "number"
          ? element.props.rowHeight
          : 40
      }
      overscan={
        typeof element.props.overscan === "number" ? element.props.overscan : 10
      }
      enableAsyncLoading={hasApiBinding}
      apiUrlKey={
        hasApiBinding && apiConfig.baseUrl ? apiConfig.baseUrl : undefined
      }
      customApiUrl={
        hasApiBinding &&
        apiConfig.baseUrl === "CUSTOM" &&
        apiConfig.customUrl
          ? apiConfig.customUrl
          : undefined
      }
      endpointPath={
        hasApiBinding && apiConfig.endpoint ? apiConfig.endpoint : undefined
      }
      apiParams={
        hasApiBinding && apiConfig.params ? apiConfig.params : undefined
      }
      dataMapping={
        hasApiBinding && apiConfig.dataMapping
          ? {
              resultPath: apiConfig.dataMapping.resultPath || "",
              idKey: apiConfig.dataMapping.idKey || "id",
              totalKey: apiConfig.dataMapping.totalKey || "",
            }
          : undefined
      }
      sortColumn={
        typeof element.props.sortColumn === "string"
          ? element.props.sortColumn
          : undefined
      }
      sortDirection={
        (element.props.sortDirection as "ascending" | "descending") ||
        "ascending"
      }
      enableResize={Boolean(element.props.enableResize ?? true)}
      onColumnsDetected={(detectedColumns) => {
        console.log("🎯 Preview에서 자동 감지된 컬럼 수신:", detectedColumns);

        if (!tableHeaderElement) {
          console.warn(
            "⚠️ TableHeader Element를 찾을 수 없어 컬럼을 추가할 수 없습니다."
          );
          return;
        }

        const columnElementsToCreate = detectedColumns.map((colDef, index) => ({
          id: colDef.elementId || `col_${Date.now()}_${index}`,
          tag: "Column",
          page_id: element.page_id,
          parent_id: tableHeaderElement.id,
          order_num: index,
          props: {
            key: String(colDef.key),
            label: colDef.label,
            children: colDef.label,
            allowsSorting: colDef.allowsSorting ?? true,
            enableResizing: colDef.enableResizing ?? true,
            width: colDef.width ?? 150,
            align: colDef.align ?? "left",
          },
        }));

        console.log("📤 부모에게 Column Elements 생성 요청:", columnElementsToCreate);

        window.parent.postMessage(
          {
            type: "ADD_COLUMN_ELEMENTS",
            payload: {
              tableId: element.id,
              tableHeaderId: tableHeaderElement.id,
              columns: columnElementsToCreate,
            },
          },
          window.location.origin
        );
      }}
    />
  );
};

/**
 * Table 관련 요소들은 Table 내부에서 처리되므로 null 반환
 */
export const renderTableHeader = (): React.ReactNode => null;
export const renderTableBody = (): React.ReactNode => null;
export const renderColumn = (): React.ReactNode => null;
export const renderRow = (): React.ReactNode => null;
export const renderCell = (): React.ReactNode => null;
