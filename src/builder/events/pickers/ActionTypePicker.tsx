/**
 * ActionTypePicker - 액션 타입 선택 컴포넌트
 *
 * ComboBox 기반 검색 가능한 액션 선택기
 * React Aria ComboBox를 사용하여 검색 기능 제공
 *
 * Phase 3: Events Panel 재설계 - 검색 기능 추가
 */

import { useState, useMemo } from 'react';
import {
  ComboBox,
  Input,
  Button,
  Popover,
  ListBox,
  ListBoxItem,
} from 'react-aria-components';
import { CirclePlus, Search, ChevronDown } from 'lucide-react';
import type { ActionType } from '@/types/events/events.types';
import { ACTION_TYPE_LABELS, REGISTRY_ACTION_CATEGORIES } from '@/types/events/events.types';
import { iconProps } from '@/utils/ui/uiConstants';

interface ActionTypePickerProps {
  /** 액션 선택 시 호출되는 콜백 */
  onSelect: (actionType: ActionType) => void;
  /** 현재 선택된 액션 타입 */
  selectedType?: ActionType;
  /** 비활성화 여부 */
  isDisabled?: boolean;
  /** 인라인 모드 (버튼 대신 입력 필드 표시) */
  inline?: boolean;
  /** placeholder 텍스트 */
  placeholder?: string;
  /** 카테고리별 그룹핑 여부 */
  showCategories?: boolean;
}

/**
 * ActionTypePicker 컴포넌트
 *
 * @example
 * // 헤더 버튼 모드
 * <ActionTypePicker
 *   onSelect={(actionType) => addAction(actionType)}
 * />
 *
 * // 인라인 모드 (검색 입력 필드)
 * <ActionTypePicker
 *   onSelect={(actionType) => updateAction({ type: actionType })}
 *   selectedType={action.type}
 *   inline
 * />
 */
export function ActionTypePicker({
  onSelect,
  selectedType,
  isDisabled = false,
  inline = false,
  placeholder = 'Search actions...',
  showCategories = true,
}: ActionTypePickerProps) {
  const [searchValue, setSearchValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // 사용 가능한 액션 타입 목록
  const availableActionTypes = useMemo(() => {
    return Object.keys(ACTION_TYPE_LABELS) as ActionType[];
  }, []);

  // 검색 필터링된 목록
  const filteredActionTypes = useMemo(() => {
    if (!searchValue) return availableActionTypes;

    const searchLower = searchValue.toLowerCase();
    return availableActionTypes.filter((type) => {
      const label = ACTION_TYPE_LABELS[type]?.toLowerCase() || '';
      return type.toLowerCase().includes(searchLower) || label.includes(searchLower);
    });
  }, [availableActionTypes, searchValue]);

  // 카테고리별 그룹화
  const groupedActionTypes = useMemo(() => {
    if (!showCategories) {
      return [{ category: 'Actions', actions: filteredActionTypes }];
    }

    const groups: { category: string; actions: ActionType[] }[] = [];

    // REGISTRY_ACTION_CATEGORIES가 있으면 사용, 없으면 단일 그룹
    if (typeof REGISTRY_ACTION_CATEGORIES !== 'undefined') {
      Object.entries(REGISTRY_ACTION_CATEGORIES).forEach(([, categoryData]) => {
        // categoryData는 { label: string, actions: readonly string[] } 형태
        const categoryInfo = categoryData as { label: string; actions: readonly string[] };
        const filtered = (categoryInfo.actions as unknown as ActionType[]).filter((a) =>
          filteredActionTypes.includes(a)
        );
        if (filtered.length > 0) {
          groups.push({ category: categoryInfo.label, actions: filtered });
        }
      });
    } else {
      groups.push({ category: 'Actions', actions: filteredActionTypes });
    }

    return groups;
  }, [filteredActionTypes, showCategories]);

  const handleSelectionChange = (key: React.Key | null) => {
    if (key) {
      onSelect(key as ActionType);
      setSearchValue('');
      setIsOpen(false);
    }
  };

  // 인라인 모드: 검색 입력 필드
  if (inline) {
    return (
      <ComboBox
        className="action-type-picker-inline"
        inputValue={searchValue}
        onInputChange={setSearchValue}
        onSelectionChange={handleSelectionChange}
        selectedKey={selectedType}
        isDisabled={isDisabled}
        aria-label="액션 타입 선택"
        onOpenChange={setIsOpen}
      >
        <div className="action-picker-input-wrapper">
          <Input
            className="action-picker-input"
            placeholder={placeholder}
          />
          <Button className="action-picker-button">
            <ChevronDown size={14} />
          </Button>
        </div>

        <Popover
          className="action-picker-popover"
          placement="bottom start"
          offset={4}
        >
          <ListBox className="action-picker-list">
            {filteredActionTypes.length === 0 ? (
              <div className="action-picker-empty">
                <Search size={16} color={iconProps.color} />
                <span>No actions found</span>
              </div>
            ) : (
              groupedActionTypes.map((group) => (
                <div key={group.category} className="action-group">
                  <div className="action-group-label">{group.category}</div>
                  {group.actions.map((actionType) => (
                    <ListBoxItem
                      key={actionType}
                      id={actionType}
                      className="action-item"
                      textValue={ACTION_TYPE_LABELS[actionType] || actionType}
                    >
                      <span className="action-name">
                        {ACTION_TYPE_LABELS[actionType] || actionType}
                      </span>
                      <span className="action-type-code">{actionType}</span>
                    </ListBoxItem>
                  ))}
                </div>
              ))
            )}
          </ListBox>
        </Popover>
      </ComboBox>
    );
  }

  // 버튼 모드: 헤더에서 + 버튼 클릭
  return (
    <ComboBox
      className="action-type-picker"
      inputValue={searchValue}
      onInputChange={setSearchValue}
      onSelectionChange={handleSelectionChange}
      isDisabled={isDisabled || availableActionTypes.length === 0}
      aria-label="액션 타입 선택"
      onOpenChange={setIsOpen}
      menuTrigger="focus"
    >
      <Button className="iconButton" aria-label="액션 추가">
        <CirclePlus
          color={iconProps.color}
          strokeWidth={iconProps.stroke}
          size={iconProps.size}
        />
      </Button>

      <Popover
        className="action-picker-popover"
        placement="bottom end"
        offset={4}
      >
        <div className="action-picker-search">
          <Search size={14} color={iconProps.color} />
          <Input
            className="action-picker-search-input"
            placeholder={placeholder}
          />
        </div>

        <ListBox className="action-picker-list">
          {filteredActionTypes.length === 0 ? (
            <div className="action-picker-empty">
              <span>No actions found</span>
            </div>
          ) : (
            groupedActionTypes.map((group) => (
              <div key={group.category} className="action-group">
                <div className="action-group-label">{group.category}</div>
                {group.actions.map((actionType) => (
                  <ListBoxItem
                    key={actionType}
                    id={actionType}
                    className="action-item"
                    textValue={ACTION_TYPE_LABELS[actionType] || actionType}
                  >
                    <span className="action-name">
                      {ACTION_TYPE_LABELS[actionType] || actionType}
                    </span>
                    <span className="action-type-code">{actionType}</span>
                  </ListBoxItem>
                ))}
              </div>
            ))
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}
