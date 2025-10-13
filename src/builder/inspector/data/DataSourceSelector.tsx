import {
  Select,
  SelectValue,
  Button,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import { useState, useEffect } from "react";
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

  const bindingType = meta?.inspector.dataBindingType;
  const binding = element.dataBinding;

  // 현재 선택된 소스 (드롭다운 표시용)
  // binding이 있으면 binding.source, 없으면 빈 문자열
  const currentSource = binding?.source || "";

  // pending source: 드롭다운에서 선택했지만 아직 Apply 안 한 소스
  const [pendingSource, setPendingSource] = useState<string>("");

  // binding이 변경되면 pendingSource 초기화
  useEffect(() => {
    setPendingSource("");
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

    // 현재 소스와 동일하면 아무것도 하지 않음
    if (source === currentSource) {
      setPendingSource("");
      return;
    }

    // pending source 설정 (Apply 버튼이 나타나도록)
    setPendingSource(source);
  };

  // 실제 표시할 소스: pending이 있으면 pending, 없으면 current
  const displaySource = pendingSource || currentSource;

  /**
   * 데이터 소스 변경 시 이전 컬럼을 삭제하는 래퍼 함수
   */
  const handleDataBindingChange = async (callback: () => void) => {
    // 데이터 소스가 실제로 변경되는 경우 (pendingSource가 있는 경우)
    if (pendingSource && pendingSource !== currentSource && element.type === "Table") {
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
    setPendingSource("");
  };

  return (
    <>
      {/* 데이터 소스 선택 - Properties와 동일한 구조 */}
      <div className="component-props">
        <fieldset className="properties-aria">
          <legend className="fieldset-legend">데이터 소스</legend>
          <div className="react-aria-control react-aria-Group">
            <label className="control-label">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-gray-400)"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-database"
                aria-hidden="true"
              >
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5V19A9 3 0 0 0 21 19V5" />
                <path d="M3 12A9 3 0 0 0 21 12" />
              </svg>
            </label>
            <Select
              selectedKey={displaySource}
              onSelectionChange={(key) => handleSourceChange(key as string)}
            >
              <Button>
                <SelectValue />
                <span aria-hidden="true" className="select-chevron">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-chevron-down"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </Button>
              <Popover>
                <ListBox>
                  <ListBoxItem id="">선택 안 함</ListBoxItem>
                  <ListBoxItem id="api">REST API</ListBoxItem>
                  <ListBoxItem id="supabase">Supabase</ListBoxItem>
                  <ListBoxItem id="state">Zustand Store</ListBoxItem>
                  <ListBoxItem id="static">Static Data</ListBoxItem>
                </ListBox>
              </Popover>
            </Select>
          </div>
        </fieldset>
      </div>

      {/* Pending 상태 표시 */}
      {pendingSource && pendingSource !== currentSource && (
        <div className="component-props">
          <div className="pending-change-notice">
            ⚠️ 데이터 소스가 변경되었습니다. 하단의 Apply 버튼을 클릭하여 적용하세요.
          </div>
        </div>
      )}

      {/* 소스별 에디터 렌더링 */}
      {!displaySource && element.type === "Table" && (
        <NoneDataSourceEditor elementId={element.id} />
      )}

      {/* displaySource가 있으면 해당 에디터 표시 (pending 또는 current) */}
      {displaySource && (
        <>
          {/* API Collection Editor */}
          {displaySource === "api" && bindingType === "collection" && (
            <APICollectionEditor
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
