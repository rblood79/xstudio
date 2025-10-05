import {
  Select,
  SelectValue,
  Button,
  ListBox,
  ListBoxItem,
  Popover,
} from "react-aria-components";
import { useComponentMeta } from "../hooks/useComponentMeta";
import { useInspectorState } from "../hooks/useInspectorState";
import { SupabaseCollectionEditor } from "./SupabaseCollectionEditor.tsx";
import { SupabaseValueEditor } from "./SupabaseValueEditor.tsx";
import { StateBindingEditor } from "./StateBindingEditor.tsx";
import { StaticDataEditor } from "./StaticDataEditor.tsx";
import { APICollectionEditor } from "./APICollectionEditor.tsx";
import { APIValueEditor } from "./APIValueEditor.tsx";
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
  const { updateDataBinding } = useInspectorState();

  const bindingType = meta?.inspector.dataBindingType;
  const binding = element.dataBinding;

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

  const handleSourceChange = (source: string) => {
    // 빈 소스 선택 시 바인딩 제거
    if (!source) {
      updateDataBinding(undefined);
      return;
    }

    // 기존 소스와 동일하면 아무것도 하지 않음 (설정된 값 유지)
    if (binding?.source === source) {
      return;
    }

    // 소스 변경 시에만 초기화
    if (source === "supabase") {
      if (bindingType === "collection") {
        updateDataBinding({
          type: "collection",
          source: "supabase",
          config: { table: "", columns: [], filters: [] },
        });
      } else {
        updateDataBinding({
          type: "value",
          source: "supabase",
          config: { table: "", column: "", filter: undefined },
        });
      }
    } else if (source === "api") {
      if (bindingType === "collection") {
        const initialConfig: APICollectionConfig = {
          baseUrl: "MOCK_DATA",
          endpoint: "/companies",
          method: "GET" as const,
          params: { page: 1, limit: 50 },
          headers: {},
          dataMapping: { resultPath: "", idKey: "id", totalKey: "" },
        };

        console.log("🎯 API Collection 초기화:", initialConfig);

        updateDataBinding({
          type: "collection",
          source: "api",
          config: initialConfig,
        });
      } else {
        updateDataBinding({
          type: "value",
          source: "api",
          config: {
            baseUrl: "MOCK_DATA",
            endpoint: "/companies",
            method: "GET",
            params: {},
            headers: {},
            dataMapping: { resultPath: "data" },
          },
        });
      }
    } else if (source === "state") {
      if (bindingType === "collection") {
        updateDataBinding({
          type: "collection",
          source: "state",
          config: { storePath: "", selector: "" },
        });
      } else {
        updateDataBinding({
          type: "value",
          source: "state",
          config: { storePath: "", transform: "" },
        });
      }
    } else if (source === "static") {
      if (bindingType === "collection") {
        updateDataBinding({
          type: "collection",
          source: "static",
          config: { data: [] },
        });
      } else {
        updateDataBinding({
          type: "value",
          source: "static",
          config: { value: "" },
        });
      }
    }
  };

  return (
    <div className="">
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
              selectedKey={binding?.source || ""}
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
                  <ListBoxItem id="api">
                    <span className="source-icon">🌐</span>
                    REST API
                  </ListBoxItem>
                  <ListBoxItem id="supabase">
                    <span className="source-icon">🗄️</span>
                    Supabase
                  </ListBoxItem>
                  <ListBoxItem id="state">
                    <span className="source-icon">🔄</span>
                    Zustand Store
                  </ListBoxItem>
                  <ListBoxItem id="static">
                    <span className="source-icon">📄</span>
                    Static Data
                  </ListBoxItem>
                </ListBox>
              </Popover>
            </Select>
          </div>
        </fieldset>
      </div>

      {/* 소스별 에디터 렌더링 */}
      {binding && (
        <div className="data-editor-container">
          {binding.source === "api" && bindingType === "collection" && (
            <APICollectionEditor
              config={binding.config as APICollectionConfig}
              onChange={(config: APICollectionConfig) =>
                updateDataBinding({
                  type: "collection",
                  source: "api",
                  config,
                })
              }
            />
          )}

          {binding.source === "api" && bindingType === "value" && (
            <APIValueEditor
              config={binding.config as APIValueConfig}
              onChange={(config: APIValueConfig) =>
                updateDataBinding({
                  type: "value",
                  source: "api",
                  config,
                })
              }
            />
          )}

          {binding.source === "supabase" && bindingType === "collection" && (
            <SupabaseCollectionEditor
              config={binding.config as SupabaseCollectionConfig}
              onChange={(config: SupabaseCollectionConfig) =>
                updateDataBinding({
                  type: "collection",
                  source: "supabase",
                  config,
                })
              }
            />
          )}

          {binding.source === "supabase" && bindingType === "value" && (
            <SupabaseValueEditor
              config={binding.config as SupabaseValueConfig}
              onChange={(config: SupabaseValueConfig) =>
                updateDataBinding({
                  type: "value",
                  source: "supabase",
                  config,
                })
              }
            />
          )}

          {binding.source === "state" && bindingType === "collection" && (
            <StateBindingEditor
              bindingType="collection"
              config={binding.config as StateCollectionConfig}
              onChange={(config: StateCollectionConfig) =>
                updateDataBinding({
                  type: "collection",
                  source: "state",
                  config,
                })
              }
            />
          )}

          {binding.source === "state" && bindingType === "value" && (
            <StateBindingEditor
              bindingType="value"
              config={binding.config as StateValueConfig}
              onChange={(config: StateValueConfig) =>
                updateDataBinding({
                  type: "value",
                  source: "state",
                  config,
                })
              }
            />
          )}

          {binding.source === "static" && bindingType === "collection" && (
            <StaticDataEditor
              bindingType="collection"
              config={binding.config as StaticCollectionConfig}
              onChange={(config) =>
                updateDataBinding({
                  type: "collection",
                  source: "static",
                  config: config as StaticCollectionConfig,
                })
              }
            />
          )}

          {binding.source === "static" && bindingType === "value" && (
            <StaticDataEditor
              bindingType="value"
              config={binding.config as StaticValueConfig}
              onChange={(config) =>
                updateDataBinding({
                  type: "value",
                  source: "static",
                  config: config as StaticValueConfig,
                })
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
