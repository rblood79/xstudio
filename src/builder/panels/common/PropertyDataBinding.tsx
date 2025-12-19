/**
 * PropertyDataBinding Component
 *
 * Property Editor에서 요소 속성을 Data Source에 바인딩할 수 있는 UI
 *
 * Features:
 * - DataTable, ApiEndpoint, Variable 선택
 * - 데이터 경로 (path) 설정
 * - 바인딩 표현식 프리뷰
 *
 * @example
 * <PropertyDataBinding
 *   label="데이터 소스"
 *   value={currentProps.dataBinding}
 *   onChange={(binding) => updateProp('dataBinding', binding)}
 * />
 */

import React, { useCallback, memo } from 'react';
import {
  Select as AriaSelect,
  Button,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
} from 'react-aria-components';
import { ChevronDown, Database, Globe, Variable, Link2, X, RefreshCw } from 'lucide-react';
import { iconProps, iconEditProps } from '../../../utils/ui/uiConstants';
import { PropertyFieldset } from './PropertyFieldset';
import { useDataTables, useApiEndpoints, useVariables } from '../../stores/data';
import './PropertyDataBinding.css';

// ============================================
// Constants
// ============================================

const REFRESH_MODE_OPTIONS = [
  { value: 'manual', label: '수동 갱신', description: '직접 갱신 호출 시에만 새로고침' },
  { value: 'onMount', label: '마운트 시', description: '컴포넌트 마운트 시 1회 갱신' },
  { value: 'interval', label: '주기적', description: '설정된 간격으로 자동 갱신' },
] as const;

// ============================================
// Types
// ============================================

/** 데이터 갱신 모드 */
export type RefreshMode = 'manual' | 'onMount' | 'interval';

export interface DataBindingValue {
  /** 바인딩 소스 타입 */
  source: 'dataTable' | 'api' | 'variable' | 'route';
  /** 소스 이름 */
  name: string;
  /** 데이터 경로 (예: "items[0].name", "user.email") */
  path?: string;
  /** 기본값 */
  defaultValue?: unknown;
  /** 갱신 모드 (기본: manual) */
  refreshMode?: RefreshMode;
  /** 갱신 간격 (ms, interval 모드에서 사용) */
  refreshInterval?: number;
}

interface PropertyDataBindingProps {
  /** 라벨 */
  label?: string;
  /** 현재 바인딩 값 */
  value?: DataBindingValue | null;
  /** 바인딩 변경 시 콜백 */
  onChange: (value: DataBindingValue | null) => void;
  /** 추가 클래스 */
  className?: string;
  /** 비활성화 */
  disabled?: boolean;
}

// ============================================
// Constants
// ============================================

const SOURCE_OPTIONS = [
  { value: 'dataTable', label: 'DataTable', icon: Database },
  { value: 'api', label: 'API', icon: Globe },
  { value: 'variable', label: 'Variable', icon: Variable },
  { value: 'route', label: 'Route Param', icon: Link2 },
] as const;

// ============================================
// Component
// ============================================

export const PropertyDataBinding = memo(function PropertyDataBinding({
  label = '데이터 바인딩',
  value,
  onChange,
  className,
  disabled,
}: PropertyDataBindingProps) {
  // Data Store에서 소스 목록 가져오기
  const dataTables = useDataTables();
  const apiEndpoints = useApiEndpoints();
  const variables = useVariables();

  // 직접 prop 값 사용 (fully controlled)
  const source = value?.source || '';
  const name = value?.name || '';
  const path = value?.path || '';
  const refreshMode = value?.refreshMode || 'manual';
  const refreshInterval = value?.refreshInterval || 5000;


  // 소스 타입별 이름 옵션 가져오기
  const getNameOptions = useCallback(() => {
    switch (source) {
      case 'dataTable':
        return dataTables.map((dt) => ({
          value: dt.name,
          label: dt.name,
          description: dt.description,
        }));
      case 'api':
        return apiEndpoints.map((api) => ({
          value: api.name,
          label: api.name,
          description: api.description,
        }));
      case 'variable':
        return variables.map((v) => ({
          value: v.name,
          label: v.name,
          description: `${v.scope} - ${v.type}`,
        }));
      case 'route':
        // Route params는 자유 입력 (동적)
        return [];
      default:
        return [];
    }
  }, [source, dataTables, apiEndpoints, variables]);

  // 소스 타입 변경 (fully controlled - onChange 즉시 호출)
  const handleSourceChange = useCallback(
    (key: React.Key | null) => {
      const newSource = key as DataBindingValue['source'] | '';
      if (newSource) {
        // 소스 변경 시 name, path 초기화
        onChange({ source: newSource, name: '', path: '' });
      } else {
        onChange(null);
      }
    },
    [onChange]
  );

  // 소스 이름 변경
  const handleNameChange = useCallback(
    (key: React.Key | null) => {
      const newName = key as string;
      if (source) {
        console.log(`🔗 PropertyDataBinding: ${source} 소스에서 "${newName}" 선택됨`);
        onChange({
          source: source as DataBindingValue['source'],
          name: newName,
          path,
          refreshMode: value?.refreshMode,
          refreshInterval: value?.refreshInterval,
        });
      }
    },
    [source, path, value?.refreshMode, value?.refreshInterval, onChange]
  );

  // 경로 변경 (blur 시 저장)
  const handlePathBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const newPath = e.target.value;
      if (source && name) {
        onChange({
          source: source as DataBindingValue['source'],
          name,
          path: newPath || undefined,
          refreshMode: value?.refreshMode,
          refreshInterval: value?.refreshInterval,
        });
      }
    },
    [source, name, value?.refreshMode, value?.refreshInterval, onChange]
  );

  // 갱신 모드 변경
  const handleRefreshModeChange = useCallback(
    (key: React.Key | null) => {
      const newMode = key as RefreshMode;
      if (source && name) {
        onChange({
          source: source as DataBindingValue['source'],
          name,
          path: value?.path,
          refreshMode: newMode,
          refreshInterval: newMode === 'interval' ? (value?.refreshInterval || 5000) : undefined,
        });
      }
    },
    [source, name, value?.path, value?.refreshInterval, onChange]
  );

  // 갱신 간격 변경
  const handleRefreshIntervalBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const newInterval = parseInt(e.target.value, 10);
      if (source && name && !isNaN(newInterval) && newInterval > 0) {
        onChange({
          source: source as DataBindingValue['source'],
          name,
          path: value?.path,
          refreshMode: 'interval',
          refreshInterval: newInterval,
        });
      }
    },
    [source, name, value?.path, onChange]
  );

  // 바인딩 제거
  const handleClear = useCallback(() => {
    onChange(null);
  }, [onChange]);

  // 바인딩 표현식 프리뷰
  const bindingExpression = value
    ? `{{${value.source}.${value.name}${value.path ? '.' + value.path : ''}}}`
    : '';

  const nameOptions = getNameOptions();

  return (
    <PropertyFieldset legend={label} icon={Link2} className={className}>
      <div className="property-data-binding">
        {/* 바인딩 표현식 프리뷰 */}
        {bindingExpression && (
          <div className="binding-preview">
            <code className="binding-expression">{bindingExpression}</code>
            <button
              className="binding-clear"
              onClick={handleClear}
              type="button"
              aria-label="바인딩 제거"
            >
              <X size={iconEditProps.size} />
            </button>
          </div>
        )}

        {/* 소스 타입 선택 */}
        <div className="binding-row">
          <AriaSelect
            className="react-aria-Select binding-source-select"
            selectedKey={source || null}
            onSelectionChange={handleSourceChange}
            aria-label="소스 타입"
            isDisabled={disabled}
          >
            <Button className="react-aria-Button">
              
              <SelectValue>{"소스 선택..."}</SelectValue>
              <span aria-hidden="true" className="select-chevron">
                <ChevronDown size={iconProps.size} />
              </span>
            </Button>
            <Popover className="react-aria-Popover">
              <ListBox className="react-aria-ListBox">
                {SOURCE_OPTIONS.map((option) => (
                  <ListBoxItem
                    key={option.value}
                    id={option.value}
                    className="react-aria-ListBoxItem"
                  >
                    <option.icon size={iconEditProps.size} />
                    <span>{option.label}</span>
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </AriaSelect>
        </div>

        {/* 소스 이름 선택 (route 제외) */}
        {source && source !== 'route' && (
          <div className="binding-row">
            {nameOptions.length > 0 ? (
              <AriaSelect
                className="react-aria-Select binding-name-select"
                selectedKey={name || null}
                onSelectionChange={handleNameChange}
                aria-label="소스 이름"
                isDisabled={disabled}
              >
                <Button className="react-aria-Button">
                  <SelectValue>{"이름 선택..."}</SelectValue>
                  <span aria-hidden="true" className="select-chevron">
                    <ChevronDown size={iconProps.size} />
                  </span>
                </Button>
                <Popover className="react-aria-Popover">
                  <ListBox className="react-aria-ListBox">
                    {nameOptions.map((option) => (
                      <ListBoxItem
                        key={option.value}
                        id={option.value}
                        className="react-aria-ListBoxItem"
                        textValue={option.label}
                      >
                        <div className="binding-option">
                          <span className="binding-option-label">
                            {option.label}
                          </span>
                          {option.description && (
                            <span className="binding-option-desc">
                              {option.description}
                            </span>
                          )}
                        </div>
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Popover>
              </AriaSelect>
            ) : (
              <div className="binding-empty">
                등록된 {source === 'dataTable' ? 'DataTable' : source === 'api' ? 'API' : 'Variable'}이 없습니다.
              </div>
            )}
          </div>
        )}

        {/* Route Param 직접 입력 */}
        {source === 'route' && (
          <div className="binding-row">
            <input
              className="react-aria-Input"
              type="text"
              key={`route-${value?.name || ''}`}
              defaultValue={name}
              onBlur={(e) => {
                const newName = e.target.value;
                if (newName) {
                  onChange({ source: 'route', name: newName, path });
                }
              }}
              placeholder="파라미터 이름 (예: productId)"
              disabled={disabled}
            />
          </div>
        )}

        {/* 데이터 경로 입력 */}
        {source && name && (
          <div className="binding-row">
            <input
              className="react-aria-Input binding-path-input"
              type="text"
              key={`path-${value?.source || ''}-${value?.name || ''}`}
              defaultValue={path}
              onBlur={handlePathBlur}
              placeholder="데이터 경로 (예: items[0].name)"
              disabled={disabled}
            />
          </div>
        )}

        {/* 갱신 설정 (api, dataTable만 해당) */}
        {source && name && (source === 'api' || source === 'dataTable') && (
          <>
            <div className="binding-row binding-refresh-row">
              <label className="binding-row-label">
                <RefreshCw size={iconEditProps.size} />
                <span>갱신 모드</span>
              </label>
              <AriaSelect
                className="react-aria-Select binding-refresh-select"
                selectedKey={refreshMode}
                onSelectionChange={handleRefreshModeChange}
                aria-label="갱신 모드"
                isDisabled={disabled}
              >
                <Button className="react-aria-Button">
                  <SelectValue />
                  <span aria-hidden="true" className="select-chevron">
                    <ChevronDown size={iconProps.size} />
                  </span>
                </Button>
                <Popover className="react-aria-Popover">
                  <ListBox className="react-aria-ListBox">
                    {REFRESH_MODE_OPTIONS.map((option) => (
                      <ListBoxItem
                        key={option.value}
                        id={option.value}
                        className="react-aria-ListBoxItem"
                        textValue={option.label}
                      >
                        <div className="binding-option">
                          <span className="binding-option-label">
                            {option.label}
                          </span>
                          <span className="binding-option-desc">
                            {option.description}
                          </span>
                        </div>
                      </ListBoxItem>
                    ))}
                  </ListBox>
                </Popover>
              </AriaSelect>
            </div>

            {/* 갱신 간격 (interval 모드에서만) */}
            {refreshMode === 'interval' && (
              <div className="binding-row binding-interval-row">
                <label className="binding-row-label">
                  <span>갱신 간격</span>
                </label>
                <div className="binding-interval-input">
                  <input
                    className="react-aria-Input"
                    type="number"
                    min="1000"
                    step="1000"
                    key={`interval-${value?.source || ''}-${value?.name || ''}`}
                    defaultValue={refreshInterval}
                    onBlur={handleRefreshIntervalBlur}
                    placeholder="5000"
                    disabled={disabled}
                  />
                  <span className="binding-interval-unit">ms</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PropertyFieldset>
  );
});

export default PropertyDataBinding;
