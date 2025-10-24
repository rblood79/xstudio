import { useState, useEffect } from "react";
import { Database } from "lucide-react";
import { PropertySelect } from "../components";
import { useComponentMeta } from "../hooks/useComponentMeta";
import { useInspectorState } from "../hooks/useInspectorState";
import { useStore } from "../../stores/elements";
import { deleteTableColumns } from "./utils/deleteTableColumns";
import { SupabaseCollectionEditor } from "./SupabaseCollectionEditor.tsx";
import { SupabaseValueEditor } from "./SupabaseValueEditor.tsx";
import { StateBindingEditor } from "./StateBindingEditor.tsx";
import { StaticDataEditor } from "./StaticDataEditor.tsx";
import { APICollectionEditor } from "./APICollectionEditor.tsx";
import { APIValueEditor } from "./APIValueEditor.tsx";
import { NoneDataSourceEditor } from "./NoneDataSourceEditor.tsx";
import type {
  SelectedElement,
  SupabaseCollectionConfig,
  SupabaseValueConfig,
  StateCollectionConfig,
  StateValueConfig,
  StaticCollectionConfig,
  StaticValueConfig,
  APICollectionConfig,
  APIValueConfig,
} from "../types";

export interface DataSourceSelectorProps {
  element: SelectedElement;
}

export function DataSourceSelector({ element }: DataSourceSelectorProps) {
  const meta = useComponentMeta(element.type);
  const { updateDataBinding, updateProperties } = useInspectorState();
  const elements = useStore((state) => state.elements);
  const setElements = useStore((state) => state.setElements);

  const bindingType = meta?.inspector.dataBindingType;
  const binding = element.dataBinding;

  // 현재 선택된 소스 (드롭다운 표시용)
  // binding이 있으면 binding.source, 없으면 빈 문자열
  const currentSource = binding?.source || "";

  // pending source: 드롭다운에서 선택했지만 아직 Apply 안 한 소스
  // null은 pending 없음, 빈 문자열("")은 "선택 안함" pending
  const [pendingSource, setPendingSource] = useState<string | null>(null);

  // binding이 변경되면 pendingSource 초기화
  useEffect(() => {
    setPendingSource(null);
  }, [binding]);

  // 데이터 바인딩 미지원 컴포넌트
  if (!bindingType) {
    return (
      <div className="data-source-empty">
        <div className="empty-icon">📊</div>
        <p className="empty-message">
          이 컴포넌트는 데이터 바인딩을 지원하지 않습니다.
        </p>
      </div>
    );
  }

  // 드롭다운 선택 핸들러: pending source만 설정 (즉시 적용 안 함)
  const handleSourceChange = (source: string) => {
    console.log("🎯 데이터 소스 선택:", source, "현재:", currentSource);

    // 현재 소스와 동일하면 아무것도 하지 않음 (pending 초기화)
    if (source === currentSource) {
      setPendingSource(null);
      return;
    }

    // pending source 설정 (Apply 버튼이 나타나도록)
    // "선택 안함"(빈 문자열)도 동일하게 처리
    setPendingSource(source);
  };

  // 실제 표시할 소스: pending이 있으면 pending, 없으면 current
  // null이 아니면 pending을 사용 (빈 문자열 포함)
  const displaySource = pendingSource !== null ? pendingSource : currentSource;

  console.log("🎨 DataSourceSelector 상태:", {
    currentSource,
    pendingSource,
    displaySource,
    elementType: element.type,
    hasBinding: !!binding,
  });

  /**
   * 데이터 소스 변경 시 이전 컬럼을 삭제하는 래퍼 함수
   */
  const handleDataBindingChange = async (callback: () => void) => {
    // 데이터 소스가 실제로 변경되는 경우 (pendingSource가 null이 아닌 경우)
    if (pendingSource !== null && pendingSource !== currentSource && element.type === "Table") {
      console.log("🔄 데이터 소스 변경:", currentSource, "→", pendingSource);
      console.log("🗑️ 이전 컬럼 삭제 중...");

      try {
        await deleteTableColumns(element.id, elements);
      } catch (error) {
        console.error("❌ 컬럼 삭제 실패:", error);
      }
    }

    // 실제 바인딩 업데이트 콜백 실행
    callback();

    // pending source 초기화
    setPendingSource(null);
  };

  return (
    <>
      {/* 데이터 소스 선택 */}
      <div className="component-props">
        <PropertySelect
          icon={Database}
          label="데이터 소스"
          value={displaySource}
          options={[
            { value: "", label: "선택 안 함" },
            { value: "api", label: "REST API" },
            { value: "supabase", label: "Supabase" },
            { value: "state", label: "Zustand Store" },
            { value: "static", label: "Static Data" },
          ]}
          onChange={(key: string) => handleSourceChange(key)}
        />
      </div>

      {/* Pending 상태 표시 */}
      {pendingSource !== null && pendingSource !== currentSource && (
        <div className="component-props">
          <div className="pending-change-notice">
            ⚠️ 데이터 소스가 변경되었습니다. 하단의 Apply 버튼을 클릭하여 적용하세요.
          </div>
        </div>
      )}

      {/* 소스별 에디터 렌더링 */}

      {/* "선택 안함" (빈 문자열) 에디터 */}
      {(() => {
        const showNoneEditor = displaySource === "" && element.type === "Table";
        console.log("🔍 NoneDataSourceEditor 표시 조건:", {
          displaySource,
          elementType: element.type,
          showNoneEditor,
        });
        return showNoneEditor;
      })() && (
          <NoneDataSourceEditor
            elementId={element.id}
            onApply={async () => {
              console.log("🔍 NoneDataSourceEditor onApply 호출됨", {
                pendingSource,
                currentSource,
                elementType: element.type,
              });

              // pending source가 빈 문자열인 경우 처리
              if (pendingSource === "") {
                console.log("🗑️ 데이터 바인딩 제거 (Apply)");

                // NoneDataSourceEditor에서 DB에서 컬럼 삭제는 이미 완료됨
                // Store에서도 컬럼 제거
                const tableHeader = elements.find(
                  (el) => el.tag === "TableHeader" && el.parent_id === element.id
                );

                if (tableHeader) {
                  const columnIds = elements
                    .filter((el) => el.tag === "Column" && el.parent_id === tableHeader.id)
                    .map((col) => col.id);

                  if (columnIds.length > 0) {
                    const newElements = elements.filter(
                      (el) => !columnIds.includes(el.id)
                    );
                    setElements(newElements);
                    console.log(`✅ Store에서 ${columnIds.length}개 컬럼 제거 완료`);
                  }
                }

                // Table props 초기화
                updateProperties({
                  enableAsyncLoading: false,
                  apiUrlKey: undefined,
                  customApiUrl: undefined,
                  endpointPath: undefined,
                  dataMapping: undefined,
                  apiParams: undefined,
                  columns: undefined,
                  data: undefined,
                  columnMapping: undefined,
                });
                console.log("✅ Table props 초기화 완료");

                // 데이터 바인딩 제거
                updateDataBinding(undefined);
                setPendingSource(null);
              } else {
                console.warn("⚠️ onApply 조건 미충족:", {
                  pendingSource,
                  expectedValue: "",
                  matches: pendingSource === "",
                });
              }
            }}
          />
        )}

      {/* displaySource가 있으면 해당 에디터 표시 (pending 또는 current) */}
      {displaySource && displaySource !== "" && (
        <>
          {/* API Collection Editor */}
          {displaySource === "api" && bindingType === "collection" && (
            <APICollectionEditor
              elementId={element.id}
              config={
                binding?.source === "api"
                  ? (binding.config as APICollectionConfig)
                  : {
                    baseUrl: "MOCK_DATA",
                    endpoint: "/companies",
                    method: "GET" as const,
                    params: { page: 1, limit: 50 },
                    headers: {},
                    dataMapping: { resultPath: "", idKey: "id", totalKey: "" },
                  }
              }
              onChange={(config: APICollectionConfig) => {
                handleDataBindingChange(() => {
                  updateDataBinding({
                    type: "collection",
                    source: "api",
                    config,
                  });

                  // Table 컴포넌트인 경우 props 동기화
                  if (element.type === "Table") {
                    updateProperties({
                      enableAsyncLoading: true,
                      apiUrlKey: config.baseUrl,
                      customApiUrl: config.baseUrl === "CUSTOM" ? config.customUrl : undefined,
                      endpointPath: config.endpoint,
                      dataMapping: config.dataMapping,
                      apiParams: config.params,
                      columns: config.columns, // 선택된 컬럼 정보 추가
                    });
                    console.log("🔄 APICollectionEditor - Table props 업데이트:", config);
                  }

                  // ListBox 컴포넌트인 경우 columnMapping 동기화
                  if (element.type === "ListBox") {
                    // columns 배열을 ColumnMapping 객체로 변환
                    const columnMapping: Record<string, {
                      key: string;
                      label?: string;
                      type?: string;
                      visible?: boolean;
                      order?: number;
                    }> = {};

                    config.columns?.forEach((col, index) => {
                      columnMapping[col.key] = {
                        key: col.key,
                        label: col.label,
                        type: col.type,
                        visible: true,
                        order: index,
                      };
                    });

                    updateProperties({
                      columnMapping,
                    });
                    console.log("🔄 APICollectionEditor - ListBox columnMapping 업데이트:", columnMapping);
                  }
                });
              }}
            />
          )}

          {/* API Value Editor */}
          {displaySource === "api" && bindingType === "value" && (
            <APIValueEditor
              config={
                binding?.source === "api"
                  ? (binding.config as APIValueConfig)
                  : {
                    baseUrl: "MOCK_DATA",
                    endpoint: "/companies",
                    method: "GET" as const,
                    params: {},
                    headers: {},
                    dataMapping: { resultPath: "data" },
                  }
              }
              onChange={(config: APIValueConfig) => {
                handleDataBindingChange(() => {
                  updateDataBinding({
                    type: "value",
                    source: "api",
                    config,
                  });
                });
              }}
            />
          )}

          {/* Supabase Collection Editor */}
          {displaySource === "supabase" && bindingType === "collection" && (
            <SupabaseCollectionEditor
              config={
                binding?.source === "supabase"
                  ? (binding.config as SupabaseCollectionConfig)
                  : { table: "", columns: [], filters: [] }
              }
              onChange={(config: SupabaseCollectionConfig) => {
                handleDataBindingChange(() => {
                  updateDataBinding({
                    type: "collection",
                    source: "supabase",
                    config,
                  });
                });
              }}
              onTablePropsUpdate={(props) => {
                // Table 컴포넌트인 경우 props 동기화
                if (element.type === "Table") {
                  console.log("🔄 SupabaseCollectionEditor - Table props 업데이트:", props);
                  updateProperties(props);
                }
              }}
            />
          )}

          {/* Supabase Value Editor */}
          {displaySource === "supabase" && bindingType === "value" && (
            <SupabaseValueEditor
              config={
                binding?.source === "supabase"
                  ? (binding.config as SupabaseValueConfig)
                  : { table: "", column: "", filter: undefined }
              }
              onChange={(config: SupabaseValueConfig) => {
                handleDataBindingChange(() => {
                  updateDataBinding({
                    type: "value",
                    source: "supabase",
                    config,
                  });
                });
              }}
            />
          )}

          {/* State Collection Editor */}
          {displaySource === "state" && bindingType === "collection" && (
            <StateBindingEditor
              bindingType="collection"
              config={
                binding?.source === "state"
                  ? (binding.config as StateCollectionConfig)
                  : { storePath: "", selector: "" }
              }
              onChange={(config: StateCollectionConfig) => {
                handleDataBindingChange(() => {
                  updateDataBinding({
                    type: "collection",
                    source: "state",
                    config,
                  });
                });
              }}
            />
          )}

          {/* State Value Editor */}
          {displaySource === "state" && bindingType === "value" && (
            <StateBindingEditor
              bindingType="value"
              config={
                binding?.source === "state"
                  ? (binding.config as StateValueConfig)
                  : { storePath: "", transform: "" }
              }
              onChange={(config: StateValueConfig) => {
                handleDataBindingChange(() => {
                  updateDataBinding({
                    type: "value",
                    source: "state",
                    config,
                  });
                });
              }}
            />
          )}

          {/* Static Collection Editor */}
          {displaySource === "static" && bindingType === "collection" && (
            <StaticDataEditor
              bindingType="collection"
              config={
                binding?.source === "static"
                  ? (binding.config as StaticCollectionConfig)
                  : { data: [], columnMapping: {} }
              }
              onChange={(config) => {
                handleDataBindingChange(() => {
                  updateDataBinding({
                    type: "collection",
                    source: "static",
                    config: config as StaticCollectionConfig,
                  });
                });
              }}
              onTablePropsUpdate={(props) => {
                // Table 컴포넌트인 경우 props 동기화
                if (element.type === "Table") {
                  console.log("🔄 StaticDataEditor - Table props 업데이트:", props);
                  updateProperties(props);
                }
              }}
            />
          )}

          {/* Static Value Editor */}
          {displaySource === "static" && bindingType === "value" && (
            <StaticDataEditor
              bindingType="value"
              config={
                binding?.source === "static"
                  ? (binding.config as StaticValueConfig)
                  : { value: "" }
              }
              onChange={(config) => {
                handleDataBindingChange(() => {
                  updateDataBinding({
                    type: "value",
                    source: "static",
                    config: config as StaticValueConfig,
                  });
                });
              }}
            />
          )}
        </>
      )}
    </>
  );
}
