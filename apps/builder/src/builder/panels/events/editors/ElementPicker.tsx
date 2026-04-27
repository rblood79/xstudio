/**
 * ElementPicker - 요소 참조 선택기
 *
 * 페이지 내 요소를 선택하여 조건/액션에서 참조할 수 있도록 하는 컴포넌트
 * customId 또는 element ID로 요소 선택
 */

import { useState, useMemo } from 'react';
import {
  ComboBox,
  Input,
  Button,
  Popover,
  ListBox,
  ListBoxItem,
  Label,
} from 'react-aria-components';
import { Hash, ChevronDown, Search } from 'lucide-react';
import { useStore } from '../../../stores';
import { iconProps, iconEditProps } from '../../../../utils/ui/uiConstants';

interface ElementPickerProps {
  /** 현재 선택된 요소 참조 (예: "#submit-btn", "element-123") */
  value: string;

  /** 값 변경 핸들러 */
  onChange: (value: string) => void;

  /** 라벨 */
  label?: string;

  /** placeholder */
  placeholder?: string;

  /** 필터 콜백 (특정 타입만 표시) */
  filter?: (element: { id: string; type: string; customId?: string }) => boolean;
}

interface ElementOption {
  id: string;
  type: string;
  customId?: string;
  displayName: string;
}

/**
 * 요소 참조 선택기 컴포넌트
 *
 * @example
 * <ElementPicker
 *   value={condition.left.value}
 *   onChange={(value) => updateCondition({ left: { type: 'element', value } })}
 *   label="Element"
 *   placeholder="Select element..."
 * />
 */
export function ElementPicker({
  value,
  onChange,
  label,
  placeholder = '#element or ID',
  filter,
}: ElementPickerProps) {
  const [inputValue, setInputValue] = useState(value);

  // 현재 페이지의 요소들 가져오기 (🆕 O(1) 인덱스 기반)
  const currentPageId = useStore((state) => state.currentPageId);
  const getPageElements = useStore((state) => state.getPageElements);

  // 현재 페이지의 요소만 필터링하고 옵션 생성
  const options: ElementOption[] = useMemo(() => {
    if (!currentPageId) return [];
    // 🆕 O(1) 인덱스 기반 조회
    const pageElements = getPageElements(currentPageId);

    let filteredElements = pageElements;
    if (filter) {
      filteredElements = pageElements.filter((el) =>
        filter({ id: el.id, type: el.type, customId: el.customId })
      );
    }

    return filteredElements.map((el) => ({
      id: el.id,
      type: el.type,
      customId: el.customId,
      displayName: el.customId ? `#${el.customId}` : `${el.type} (${el.id.slice(0, 8)})`,
    }));
  }, [currentPageId, getPageElements, filter]);

  // 검색 필터링된 옵션
  const filteredOptions = useMemo(() => {
    if (!inputValue) return options;

    const searchLower = inputValue.toLowerCase();
    return options.filter(
      (opt) =>
        opt.displayName.toLowerCase().includes(searchLower) ||
        opt.type.toLowerCase().includes(searchLower) ||
        opt.id.toLowerCase().includes(searchLower)
    );
  }, [options, inputValue]);

  const handleSelectionChange = (key: React.Key | null) => {
    if (!key) return;

    const selected = options.find((opt) => opt.id === key);
    if (selected) {
      const newValue = selected.customId ? `#${selected.customId}` : selected.id;
      setInputValue(newValue);
      onChange(newValue);
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    onChange(value);
  };

  return (
    <ComboBox
      className="element-picker"
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onSelectionChange={handleSelectionChange}
      allowsCustomValue
      aria-label={label || 'Element selector'}
    >
      {label && <Label className="element-picker-label">{label}</Label>}

      <div className="element-picker-input-wrapper">
        <Hash size={iconEditProps.size} className="element-picker-icon" />
        <Input
          className="element-picker-input"
          placeholder={placeholder}
        />
        <Button className="element-picker-button">
          <ChevronDown size={iconEditProps.size} />
        </Button>
      </div>

      <Popover className="element-picker-popover">
        <ListBox className="element-picker-list">
          {filteredOptions.length === 0 ? (
            <div className="element-picker-empty">
              <Search size={iconProps.size} color={iconProps.color} />
              <span>No elements found</span>
            </div>
          ) : (
            filteredOptions.map((opt) => (
              <ListBoxItem
                key={opt.id}
                id={opt.id}
                className="element-picker-item"
                textValue={opt.displayName}
              >
                <span className="element-type">{opt.type}</span>
                <span className="element-name">{opt.displayName}</span>
              </ListBoxItem>
            ))
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}
