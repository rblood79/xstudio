/**
 * ActionTypePicker - 액션 타입 선택 컴포넌트
 *
 * ActionPalette를 대체하는 간단한 Select 컴포넌트
 * React Aria Select를 사용하여 30줄로 구현 (기존 200+ 줄)
 *
 * Phase 1: Inspector Events React Stately 전환
 */

import { Select, Label, Button, Popover, ListBox, ListBoxItem, Section, Header } from 'react-aria-components';
import { Plus } from 'lucide-react';
import type { ActionType } from '@/types/events';
import { ACTION_TYPE_LABELS, ACTION_CATEGORIES } from '@/types/events';

interface ActionTypePickerProps {
  /** 액션 선택 시 호출되는 콜백 */
  onSelect: (actionType: ActionType) => void;
  /** 비활성화 여부 */
  isDisabled?: boolean;
  /** 카테고리별 그룹핑 여부 */
  showCategories?: boolean;
}

/**
 * ActionTypePicker 컴포넌트
 *
 * @example
 * <ActionTypePicker
 *   onSelect={(actionType) => addAction(actionType)}
 *   showCategories={true}
 * />
 */
export function ActionTypePicker({
  onSelect,
  isDisabled = false,
  showCategories = true,
}: ActionTypePickerProps) {
  const handleSelect = (key: string | number) => {
    if (key) {
      onSelect(key as ActionType);
    }
  };

  // 카테고리별로 그룹핑하지 않는 경우
  if (!showCategories) {
    const allActionTypes = Object.keys(ACTION_TYPE_LABELS) as ActionType[];

    return (
      <Select
        placeholder="액션 추가"
        onSelectionChange={handleSelect}
        isDisabled={isDisabled}
        className="action-type-picker"
      >
        <Label>액션 추가</Label>
        <Button>
          <Plus size={16} strokeWidth={1.5} />
          <span>액션 추가</span>
        </Button>
        <Popover>
          <ListBox>
            {allActionTypes.map((actionType) => (
              <ListBoxItem key={actionType} id={actionType}>
                {ACTION_TYPE_LABELS[actionType]}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </Select>
    );
  }

  // 카테고리별로 그룹핑
  return (
    <Select
      placeholder="액션 추가"
      onSelectionChange={handleSelect}
      isDisabled={isDisabled}
      className="action-type-picker"
    >
      <Label>액션 추가</Label>
      <Button>
        <Plus size={16} strokeWidth={1.5} />
        <span>액션 추가</span>
      </Button>
      <Popover>
        <ListBox>
          <Section key="navigation">
            <Header>네비게이션</Header>
            {ACTION_CATEGORIES.navigation.map((actionType) => (
              <ListBoxItem key={actionType} id={actionType}>
                {ACTION_TYPE_LABELS[actionType as ActionType]}
              </ListBoxItem>
            ))}
          </Section>

          <Section key="interaction">
            <Header>인터랙션</Header>
            {ACTION_CATEGORIES.interaction.map((actionType) => (
              <ListBoxItem key={actionType} id={actionType}>
                {ACTION_TYPE_LABELS[actionType as ActionType]}
              </ListBoxItem>
            ))}
          </Section>

          <Section key="data">
            <Header>데이터</Header>
            {ACTION_CATEGORIES.data.map((actionType) => (
              <ListBoxItem key={actionType} id={actionType}>
                {ACTION_TYPE_LABELS[actionType as ActionType]}
              </ListBoxItem>
            ))}
          </Section>

          <Section key="media">
            <Header>미디어</Header>
            {ACTION_CATEGORIES.media.map((actionType) => (
              <ListBoxItem key={actionType} id={actionType}>
                {ACTION_TYPE_LABELS[actionType as ActionType]}
              </ListBoxItem>
            ))}
          </Section>

          <Section key="custom">
            <Header>커스텀</Header>
            {ACTION_CATEGORIES.custom.map((actionType) => (
              <ListBoxItem key={actionType} id={actionType}>
                {ACTION_TYPE_LABELS[actionType as ActionType]}
              </ListBoxItem>
            ))}
          </Section>
        </ListBox>
      </Popover>
    </Select>
  );
}
