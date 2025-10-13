import {
  SquarePlus,
  Trash,
  Table,
  Grid,
  Settings,
  Tag,
  List,
  Layers,
} from "lucide-react";
import { PropertyInput, PropertySelect, PropertySwitch } from "../../components";
import { PropertyEditorProps } from "../types/editorTypes";
import { iconProps } from "../../../../utils/uiConstants";
import { PROPERTY_LABELS } from "../../../../utils/labels";
import { supabase } from "../../../../env/supabase.client";
import { useStore } from "../../../stores";
import { Element } from "../../../../types/store";
import { ElementUtils } from "../../../../utils/elementUtils";
import { TableElementProps } from "../../../../types/unified";
import { useCallback } from "react";

// interface TableEditorProps {
//     // element: Element;
//     // onChange: (updates: Partial<Element>) => void;
// }

export function TableEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  const elements = useStore((state) => state.elements);
  const setElements = useStore((state) => state.setElements);

  // Table 속성 업데이트 함수들
  const updateTableProps = useCallback(
    (newProps: Partial<TableElementProps>) => {
      onUpdate({
        ...currentProps,
        ...newProps,
      });
    },
    [currentProps, onUpdate]
  );

  // elementId를 사용하여 현재 Element를 찾음
  const element = elements.find((el) => el.id === elementId);

  // element가 없는 경우 빈 화면 반환
  if (!element || !element.id) {
    return (
      <div className="p-4 text-center text-gray-500">
        Table 요소를 선택하세요
      </div>
    );
  }

  // Table 구조 분석
  const tableBody = elements.find(
    (el) => el.parent_id === element.id && el.tag === "TableBody"
  );

  // 현재 테이블의 행들 찾기 (TableBody > Row)
  const rows = tableBody
    ? elements
      .filter((el) => el.parent_id === tableBody.id && el.tag === "Row")
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
    : [];

  const addRow = async () => {
    if (!tableBody) return;

    try {
      const rowId = ElementUtils.generateId();
      const newRowElement: Element = {
        id: rowId,
        tag: "Row",
        props: {},
        parent_id: tableBody.id,
        page_id: element.page_id!,
        order_num: rows.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 행 생성
      const { error: rowError } = await supabase
        .from("elements")
        .upsert([newRowElement], {
          onConflict: "id",
        });

      if (rowError) {
        console.error("행 추가 실패:", rowError);
        return;
      }

      // 각 컬럼에 대한 셀 생성
      const cellsToCreate: Element[] = [];
      // TableElementProps에는 columns가 없으므로 실제 Column Element들을 사용
      const columnsFromProps = actualColumns;

      for (let i = 0; i < columnsFromProps.length; i++) {
        const cellId = ElementUtils.generateId();
        const newCellElement: Element = {
          id: cellId,
          tag: "Cell",
          props: {
            children: "",
          },
          parent_id: rowId,
          page_id: element.page_id!,
          order_num: i,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        cellsToCreate.push(newCellElement);
      }

      // 셀들 생성
      const { error: cellsError } = await supabase
        .from("elements")
        .upsert(cellsToCreate, {
          onConflict: "id",
        });

      if (cellsError) {
        console.error("셀 추가 실패:", cellsError);
        return;
      }

      // 메모리 상태 업데이트
      const updatedElements = [...elements, newRowElement, ...cellsToCreate];
      setElements(updatedElements);

      console.log("✅ 테이블 행 추가 완료");
    } catch (error) {
      console.error("행 추가 중 오류:", error);
    }
  };

  const removeRow = async (rowId: string) => {
    try {
      // removeElement 함수를 사용하여 자식 Cell들도 함께 삭제
      const { removeElement } = useStore.getState();
      await removeElement(rowId);

      console.log("✅ 테이블 행 삭제 완료:", rowId);
    } catch (error) {
      console.error("행 삭제 중 오류:", error);
    }
  };

  const addColumnGroup = async () => {
    if (!tableHeaderElement) return;

    try {
      // 기존 Column Group들의 order_num 중 최대값 찾기
      const maxOrderNum =
        actualColumnGroups.length > 0
          ? Math.max(...actualColumnGroups.map((group) => group.order_num || 0))
          : -1;

      const groupId = ElementUtils.generateId();
      const newGroupElement: Element = {
        id: groupId,
        tag: "ColumnGroup",
        props: {
          children: "New Group",
          label: "New Group",
          span: 2,
          align: "center",
          variant: "default",
          sticky: false,
        },
        parent_id: tableHeaderElement.id,
        page_id: element.page_id!,
        order_num: maxOrderNum + 1, // 중복 방지를 위해 최대값 + 1
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("elements")
        .upsert([newGroupElement], {
          onConflict: "id",
        });

      if (error) {
        console.error("Column Group 추가 실패:", error);
        return;
      }

      // 메모리 상태 업데이트
      const updatedElements = [...elements, newGroupElement];
      setElements(updatedElements);

      console.log("✅ Column Group 추가 완료");
    } catch (error) {
      console.error("Column Group 추가 중 오류:", error);
    }
  };

  const removeColumnGroup = async (groupId: string) => {
    try {
      const { removeElement } = useStore.getState();
      await removeElement(groupId);

      console.log("✅ Column Group 삭제 완료:", groupId);
    } catch (error) {
      console.error("Column Group 삭제 중 오류:", error);
    }
  };

  // TableHeader 찾기
  const tableHeaderElement = elements.find(
    (el) => el.parent_id === element?.id && el.tag === "TableHeader"
  );

  // 실제 Column Element들 가져오기
  const actualColumns = tableHeaderElement
    ? elements
      .filter(
        (el) => el.parent_id === tableHeaderElement.id && el.tag === "Column"
      )
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
    : [];

  // Column Group Element들 가져오기
  const actualColumnGroups = tableHeaderElement
    ? elements
      .filter(
        (el) =>
          el.parent_id === tableHeaderElement.id && el.tag === "ColumnGroup"
      )
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
    : [];

  return (
    <div className="component-props">
      <fieldset className="properties-aria">
        {/* Selection Mode */}
        <PropertySelect
          label={PROPERTY_LABELS.SELECTION_MODE}
          value={(currentProps as TableElementProps)?.selectionMode || "none"}
          options={[
            { value: "none", label: "선택 없음" },
            { value: "single", label: "단일 선택" },
            { value: "multiple", label: "다중 선택" },
          ]}
          onChange={(key) =>
            updateTableProps({
              selectionMode: key as "none" | "single" | "multiple",
            })
          }
          icon={Grid}
        />

        {/* Table Size */}
        <PropertySelect
          label="크기"
          value={(currentProps as TableElementProps)?.size || "md"}
          options={[
            { value: "sm", label: "작게" },
            { value: "md", label: "보통" },
            { value: "lg", label: "크게" },
          ]}
          onChange={(key) =>
            updateTableProps({ size: key as "sm" | "md" | "lg" })
          }
          icon={Settings}
        />

        {/* Table Variant */}
        <PropertySelect
          label="스타일"
          value={(currentProps as TableElementProps)?.variant || "default"}
          options={[
            { value: "default", label: "기본" },
            { value: "striped", label: "줄무늬" },
            { value: "bordered", label: "테두리" },
          ]}
          onChange={(key) =>
            updateTableProps({
              variant: key as "default" | "striped" | "bordered",
            })
          }
          icon={Table}
        />

        {/* Table Header Variant */}
        <PropertySelect
          label="헤더 스타일"
          value={
            (currentProps as TableElementProps)?.headerVariant || "default"
          }
          options={[
            { value: "default", label: "기본" },
            { value: "dark", label: "어둡게" },
            { value: "primary", label: "주요" },
          ]}
          onChange={(key) =>
            updateTableProps({
              headerVariant: key as "default" | "dark" | "primary",
            })
          }
          icon={Settings}
        />

        {/* Table Cell Variant */}
        <PropertySelect
          label="셀 스타일"
          value={(currentProps as TableElementProps)?.cellVariant || "default"}
          options={[
            { value: "default", label: "기본" },
            { value: "striped", label: "줄무늬" },
          ]}
          onChange={(key) =>
            updateTableProps({ cellVariant: key as "default" | "striped" })
          }
          icon={Settings}
        />
      </fieldset>

      {/* 페이지네이션 모드 설정 */}
      <fieldset className="component-fieldset">
        <legend className="component-legend">
          <List className="legend-icon" />
          Pagination Mode
        </legend>

        <PropertySelect
          icon={Settings}
          label="페이지네이션 모드"
          value={
            (currentProps as TableElementProps)?.paginationMode || "infinite"
          }
          options={[
            { value: "infinite", label: "scroll" },
            { value: "pagination", label: "pagination" },
          ]}
          onChange={(paginationMode) =>
            updateTableProps({
              paginationMode: paginationMode as "pagination" | "infinite",
            })
          }
        />

        <div className="tab-overview">
          <span className="help-text">
            {currentProps?.paginationMode === "pagination"
              ? "페이지 번호로 네비게이션하는 전통적인 방식"
              : "스크롤 시 자동으로 더 많은 데이터를 로드하는 방식"}
          </span>
        </div>

        {/* 페이지당 행 수 설정 - 페이지네이션 모드일 때만 표시 */}
        {currentProps?.paginationMode === "pagination" && (
          <PropertyInput
            icon={Settings}
            label="페이지당 행 수"
            value={(currentProps as TableElementProps)?.itemsPerPage || 10}
            onChange={(itemsPerPage) =>
              updateTableProps({ itemsPerPage: parseInt(itemsPerPage) || 10 })
            }
            type="number"
          />
        )}
      </fieldset>

      {/* 가상화 설정 */}
      <fieldset className="component-fieldset">
        <legend className="component-legend">
          <Grid className="legend-icon" />
          Virtualization Settings
        </legend>

        <PropertySelect
          icon={Settings}
          label="테이블 높이 모드"
          value={(currentProps as TableElementProps)?.heightMode || "fixed"}
          options={[
            { value: "auto", label: "자동 (내용에 따라)" },
            { value: "fixed", label: "고정 높이" },
            { value: "viewport", label: "뷰포트 기준" },
            { value: "full", label: "전체 화면" },
          ]}
          onChange={(heightMode) =>
            updateTableProps({
              heightMode: heightMode as "auto" | "fixed" | "viewport" | "full",
            })
          }
        />

        {/* 고정 높이 설정 - heightMode가 'fixed'일 때만 표시 */}
        {(currentProps as TableElementProps)?.heightMode === "fixed" && (
          <div className="flex gap-2">
            <PropertyInput
              icon={Settings}
              label="높이 값"
              value={String((currentProps as TableElementProps)?.height || 400)}
              onChange={(height) =>
                updateTableProps({ height: parseInt(height) || 400 })
              }
              type="number"
              className="flex-1"
            />
            <PropertySelect
              icon={Settings}
              label="단위"
              value={(currentProps as TableElementProps)?.heightUnit || "px"}
              options={[
                { value: "px", label: "픽셀 (px)" },
                { value: "vh", label: "뷰포트 높이 (%)" },
                { value: "rem", label: "rem" },
                { value: "em", label: "em" },
              ]}
              onChange={(heightUnit) =>
                updateTableProps({
                  heightUnit: heightUnit as "px" | "vh" | "rem" | "em",
                })
              }
              className="w-32"
            />
          </div>
        )}

        {/* 뷰포트 기준 설정 - heightMode가 'viewport'일 때만 표시 */}
        {(currentProps as TableElementProps)?.heightMode === "viewport" && (
          <PropertyInput
            icon={Settings}
            label="뷰포트 높이 비율 (%)"
            value={String(
              (currentProps as TableElementProps)?.viewportHeight || 50
            )}
            onChange={(viewportHeight) =>
              updateTableProps({
                viewportHeight: parseInt(viewportHeight) || 50,
              })
            }
            type="number"
            min={10}
            max={100}
          />
        )}

        <PropertyInput
          icon={Settings}
          label="행 높이 (px)"
          value={(currentProps as TableElementProps)?.itemHeight || 50}
          onChange={(itemHeight) =>
            updateTableProps({ itemHeight: parseInt(itemHeight) || 50 })
          }
        />

        <PropertyInput
          icon={Settings}
          label="미리 렌더링 행 수"
          value={(currentProps as TableElementProps)?.overscan || 5}
          onChange={(overscan) =>
            updateTableProps({ overscan: parseInt(overscan) || 5 })
          }
        />

        <PropertySwitch
          icon={Table}
          label="헤더 고정"
          isSelected={
            (currentProps as TableElementProps)?.stickyHeader || false
          }
          onChange={(stickyHeader) => updateTableProps({ stickyHeader })}
        />

        <PropertyInput
          icon={Settings}
          label="헤더 고정 오프셋 (px)"
          value={(currentProps as TableElementProps)?.stickyHeaderOffset || 0}
          onChange={(stickyHeaderOffset) =>
            updateTableProps({
              stickyHeaderOffset: parseInt(stickyHeaderOffset) || 0,
            })
          }
          type="number"
        />
      </fieldset>

      {/* 정렬 설정 */}
      <fieldset className="component-fieldset">
        <legend className="component-legend">
          <List className="legend-icon" />
          Sorting Settings
        </legend>

        <div className="tab-overview">
          <span className="help-text">
            💡 기본 정렬을 설정하거나 API 순서를 그대로 유지할 수 있습니다.
            사용자는 헤더를 클릭하여 언제든지 정렬을 변경할 수 있습니다.
          </span>
        </div>

        <PropertySelect
          icon={Tag}
          label="기본 정렬 컬럼"
          value={(currentProps as TableElementProps)?.sortColumn || ""}
          options={[
            { value: "", label: "정렬 안함 (API 순서 유지)" },
            { value: "id", label: "ID" },
            { value: "name", label: "이름" },
            { value: "email", label: "이메일" },
            { value: "jobTitle", label: "직업" },
          ]}
          onChange={(sortColumn) =>
            updateTableProps({ sortColumn: sortColumn || undefined })
          }
        />

        <PropertySelect
          icon={List}
          label="기본 정렬 방향"
          value={
            (currentProps as TableElementProps)?.sortDirection || "ascending"
          }
          options={[
            { value: "ascending", label: "오름차순" },
            { value: "descending", label: "내림차순" },
          ]}
          onChange={(sortDirection) =>
            updateTableProps({
              sortDirection: sortDirection as "ascending" | "descending",
            })
          }
        />
      </fieldset>

      <fieldset className="properties-aria">
        <legend className="fieldset-legend">Column Management</legend>

        {/* 컬럼 개수 표시 */}
        <div className="tab-overview">
          <p className="tab-overview-text">
            Total columns: {actualColumns.length || 0}
          </p>
          <p className="tab-overview-help">
            💡 컬럼을 추가/삭제하려면 <strong>TableHeader</strong>를 선택하세요
          </p>
        </div>

        {/* 실제 Column Element 목록 (읽기 전용) */}
        {actualColumns.length > 0 && (
          <div className="tabs-list">
            {actualColumns.map((column, index) => {
              const columnProps = column.props as Record<string, unknown>;
              return (
                <div key={column.id} className="tab-list-item">
                  <div className="tab-content">
                    <span className="tab-title">
                      {index + 1}.{" "}
                      {(columnProps?.children as string) || "제목 없음"}
                      {columnProps?.key != null && (
                        <span className="ml-2 text-gray-500 text-sm">
                          ({String(columnProps.key)})
                        </span>
                      )}
                    </span>
                    <div className="tab-controls">
                      {columnProps?.allowsSorting !== false && (
                        <span
                          className="text-xs text-gray-500"
                          title="정렬 가능"
                        >
                          📊
                        </span>
                      )}
                      {columnProps?.enableResizing !== false && (
                        <span
                          className="text-xs text-gray-500"
                          title="크기 조절 가능"
                        >
                          ↔️
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {actualColumns.length === 0 && (
          <div className="tab-overview">
            <p className="tab-overview-help">
              ⚠️ 컬럼이 없습니다. <strong>Layers</strong>에서{" "}
              <strong>TableHeader</strong>를 선택하고 컬럼을 추가하세요.
            </p>
          </div>
        )}
      </fieldset>

      {/* Column Group Management */}
      <fieldset className="properties-aria">
        <legend className="fieldset-legend">Column Group Management</legend>

        {/* Column Group 개수 표시 */}
        <div className="tab-overview">
          <p className="tab-overview-text">
            Total groups: {actualColumnGroups.length || 0}
          </p>
          <p className="tab-overview-help">
            💡 Column Group을 사용하여 관련 컬럼들을 그룹화하고 멀티레벨 헤더를
            만들 수 있습니다
          </p>
        </div>

        {/* 실제 Column Group Element 목록 */}
        {actualColumnGroups.length > 0 && (
          <div className="tabs-list">
            {actualColumnGroups.map((group, index) => {
              const groupProps = group.props as Record<string, unknown>;
              return (
                <div key={group.id} className="tab-list-item">
                  <div className="tab-content">
                    <span className="tab-title">
                      {index + 1}. {(groupProps?.label as string) || "Group"}
                      <span className="ml-2 text-gray-500 text-sm">
                        (span: {(groupProps?.span as number) || 2})
                      </span>
                    </span>
                    <div className="tab-controls">
                      <span
                        className="text-xs text-gray-500"
                        title="Column Group"
                      >
                        📊
                      </span>
                    </div>
                  </div>
                  <button
                    className="control-button delete"
                    onClick={() => removeColumnGroup(group.id)}
                  >
                    <Trash
                      color={iconProps.color}
                      strokeWidth={iconProps.stroke}
                      size={iconProps.size}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {actualColumnGroups.length === 0 && (
          <div className="tab-overview">
            <p className="tab-overview-help">
              📋 Column Group이 없습니다. 아래 버튼을 클릭하여 그룹을
              추가하세요.
            </p>
          </div>
        )}

        {/* Column Group 추가 버튼 */}
        <div className="tab-actions">
          <button className="control-button add" onClick={addColumnGroup}>
            <Layers
              color={iconProps.color}
              strokeWidth={iconProps.stroke}
              size={iconProps.size}
            />
            Add Column Group
          </button>
        </div>

        {/* Column Group 사용법 안내 */}
        <div className="tab-overview">
          <p className="tab-overview-help">
            <strong>💡 Column Group 사용법:</strong>
            <br />
            • Column Group은 여러 컬럼을 하나의 헤더로 그룹화합니다
            <br />
            • span 속성으로 그룹이 포함할 컬럼 수를 설정합니다
            <br />• 중첩된 그룹 구조도 지원합니다
          </p>
        </div>
      </fieldset>

      <fieldset className="properties-aria">
        <legend className="fieldset-legend">Row Management</legend>

        {/* 행 개수 표시 */}
        <div className="tab-overview">
          <p className="tab-overview-text">Total rows: {rows.length || 0}</p>
          <p className="tab-overview-help">
            💡 Manage table rows and their cells
          </p>
        </div>

        {/* 기존 행들 */}
        {rows.length > 0 && (
          <div className="tabs-list">
            {rows.map((row, index) => {
              const rowCells = elements
                .filter((el) => el.parent_id === row.id && el.tag === "Cell")
                .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

              return (
                <div key={row.id} className="tab-list-item">
                  <span className="tab-title">
                    Row {index + 1} ({rowCells.length} cells)
                  </span>
                  <button
                    className="control-button delete"
                    onClick={() => removeRow(row.id)}
                  >
                    <Trash
                      color={iconProps.color}
                      strokeWidth={iconProps.stroke}
                      size={iconProps.size}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* 행 추가 버튼 */}
        <div className="tab-actions">
          <button className="control-button add" onClick={addRow}>
            <SquarePlus
              color={iconProps.color}
              strokeWidth={iconProps.stroke}
              size={iconProps.size}
            />
            Add Row
          </button>
        </div>
      </fieldset>
    </div>
  );
}
