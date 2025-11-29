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

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Select as AriaSelect,
  Button,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
} from 'react-aria-components';
import { ChevronDown, Database, Globe, Variable, Link2, X } from 'lucide-react';
import { PropertyFieldset } from './PropertyFieldset';
import { iconProps } from '../../../utils/ui/uiConstants';
import { useDataTables, useApiEndpoints, useVariables } from '../../stores/data';
import './PropertyDataBinding.css';

// ============================================
// Types
// ============================================

export interface DataBindingValue {
  /** 바인딩 소스 타입 */
  source: 'dataTable' | 'api' | 'variable' | 'route';
  /** 소스 이름 */
  name: string;
  /** 데이터 경로 (예: "items[0].name", "user.email") */
  path?: string;
  /** 기본값 */
  defaultValue?: unknown;
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

  // Local state
  const [source, setSource] = useState<DataBindingValue['source'] | ''>(
    value?.source || ''
  );
  const [name, setName] = useState(value?.name || '');
  const [path, setPath] = useState(value?.path || '');

  // Sync with prop value when external value changes
  // This pattern is intentional for controlled/uncontrolled hybrid component
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSource(value?.source || '');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(value?.name || '');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPath(value?.path || '');
  }, [value]);

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

  // 바인딩 값 업데이트
  const updateBinding = useCallback(
    (updates: Partial<DataBindingValue>) => {
      if (!source) return;

      const newBinding: DataBindingValue = {
        source: updates.source || (source as DataBindingValue['source']),
        name: updates.name !== undefined ? updates.name : name,
        path: updates.path !== undefined ? updates.path : path,
      };

      // 유효한 바인딩인지 확인
      if (newBinding.source && newBinding.name) {
        onChange(newBinding);
      }
    },
    [source, name, path, onChange]
  );

  // 소스 타입 변경
  const handleSourceChange = useCallback(
    (key: React.Key | null) => {
      const newSource = key as DataBindingValue['source'] | '';
      setSource(newSource);
      setName(''); // 소스 변경 시 이름 초기화
      setPath('');

      if (!newSource) {
        onChange(null);
      }
    },
    [onChange]
  );

  // 소스 이름 변경
  const handleNameChange = useCallback(
    (key: React.Key | null) => {
      const newName = key as string;
      setName(newName);
      updateBinding({ name: newName });
    },
    [updateBinding]
  );

  // 경로 변경
  const handlePathChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newPath = e.target.value;
      setPath(newPath);
    },
    []
  );

  const handlePathBlur = useCallback(() => {
    updateBinding({ path: path || undefined });
  }, [path, updateBinding]);

  // 바인딩 제거
  const handleClear = useCallback(() => {
    setSource('');
    setName('');
    setPath('');
    onChange(null);
  }, [onChange]);

  // 바인딩 표현식 프리뷰
  const bindingExpression = value
    ? `{{${value.source}.${value.name}${value.path ? '.' + value.path : ''}}}`
    : '';

  const nameOptions = getNameOptions();
  const SourceIcon =
    SOURCE_OPTIONS.find((s) => s.value === source)?.icon || Link2;

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
              <X size={14} />
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
              <label className="control-label">
                <SourceIcon
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </label>
              <SelectValue placeholder="소스 선택..." />
              <span aria-hidden="true" className="select-chevron">
                <ChevronDown size={16} />
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
                    <option.icon size={14} />
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
                  <SelectValue placeholder="이름 선택..." />
                  <span aria-hidden="true" className="select-chevron">
                    <ChevronDown size={16} />
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
              value={name}
              onChange={(e) => {
                setName(e.target.value);
              }}
              onBlur={() => updateBinding({ name })}
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
              value={path}
              onChange={handlePathChange}
              onBlur={handlePathBlur}
              placeholder="데이터 경로 (예: items[0].name)"
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </PropertyFieldset>
  );
});

export default PropertyDataBinding;
