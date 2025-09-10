import React, { useCallback, useEffect } from 'react';
import { useParams } from "react-router";
import { useStore } from '../stores';
import { ElementProps } from '../../types/supabase';
import { elementsApi } from '../../services/api';
import styles from "./index.module.css";
import {
  ToggleButton,
  ToggleButtonGroup,
  Button,
  TextField,
  Label,
  Input,
  Description,
  FieldError,
  Checkbox,
  CheckboxGroup,
  ListBox,
  ListBoxItem,
  GridList,
  GridListItem,
  Select,
  SelectItem,
  ComboBox,
  ComboBoxItem,
  Slider,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  RadioGroup,
  Radio,
  Tree,
  TreeItem,
  Panel,
  Calendar,
  DatePicker,
  DateRangePicker,
  Switch, // Switch 추가
  Table, // Table 추가
  Card,
  TagGroup,
  Tag,
  /*Column,
  TableHeader,
  Row,
  Cell,*/
} from '../components/list';
import { EventEngine } from '../../utils/eventEngine';
import { ElementEvent, EventContext } from '../../types/events';
//import { useBatchUpdate } from '../stores';


interface PreviewElement {
  id: string;
  tag: string;
  props: ElementProps;
  text?: string;
  parent_id?: string | null;
  page_id: string; // 필수 속성으로 변경 (store의 Element와 일치)
  order_num?: number;
}


function Preview() {
  const { projectId } = useParams<{ projectId: string }>();
  const elements = useStore((state) => state.elements) as PreviewElement[];
  const { setElements, updateElementProps } = useStore();
  const eventEngine = EventEngine.getInstance();

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object' || !data.type) return;

      if (data.type === 'UPDATE_ELEMENTS') {
        setElements(data.elements || []);
      }

      // 새로 추가: 개별 요소 속성 업데이트 처리
      if (data.type === 'UPDATE_ELEMENT_PROPS') {
        const { elementId, props, merge } = data;

        console.log('UPDATE_ELEMENT_PROPS 메시지 받음:', { elementId, props, merge });

        // 요소 찾기
        const elementIndex = elements.findIndex(el => el.id === elementId);
        if (elementIndex !== -1) {
          const updatedElements = [...elements];
          const element = updatedElements[elementIndex];

          // 요소가 존재하고 props가 있는지 확인
          if (element && element.props) {
            // 속성 업데이트 (병합 또는 교체)
            if (merge) {
              element.props = { ...element.props, ...props };
            } else {
              element.props = { ...element.props, ...props };
            }

            // 상태 업데이트로 리렌더링 트리거
            setElements(updatedElements as PreviewElement[]);

            console.log(`요소 ${elementId} 속성 업데이트됨:`, props);
          } else {
            console.warn('요소가 존재하지 않거나 props가 없습니다:', element);
          }
        } else {
          console.warn('요소를 찾을 수 없습니다:', elementId);
        }
      }

      // 기존 THEME_VARS 처리...
      if (data.type === 'THEME_VARS' && Array.isArray(data.vars)) {
        let styleEl = document.getElementById('design-theme-vars') as HTMLStyleElement | null;
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'design-theme-vars';
          document.head.appendChild(styleEl);
        }
        styleEl.textContent =
          ':root {\n' +
          data.vars.map((v: { cssVar: string; value: string }) => `  ${v.cssVar}: ${v.value};`).join('\n') +
          '\n}';
        // 디버그
        console.log('[preview] applied THEME_VARS', data.vars.length);
      }

      // 기존 UPDATE_THEME_TOKENS 처리...
      if (data.type === 'UPDATE_THEME_TOKENS' && data.styles) {
        // 하위 호환 (구 포맷)
        let styleEl = document.getElementById('design-theme-vars') as HTMLStyleElement | null;
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'design-theme-vars';
          document.head.appendChild(styleEl);
        }
        styleEl.textContent =
          ':root {\n' +
          Object.entries(data.styles).map(([k, v]) => `  ${k}: ${v};`).join('\n') +
          '\n}';
        console.log('[preview] applied UPDATE_THEME_TOKENS', Object.keys(data.styles).length);
      }
    },
    [elements, setElements] // elements 의존성 추가
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    // 준비 신호
    try {
      window.parent.postMessage({ type: 'PREVIEW_READY' }, '*'); // 동일 오리진 확인 후 origin 교체
    } catch {
      console.error('Error posting PREVIEW_READY message');
    }
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  document.documentElement.classList.add(styles.root);

  // 이벤트 핸들러 생성 함수 (디버깅 코드 제거)
  const createEventHandler = (element: PreviewElement, eventType: string) => {
    return async (event: Event) => {
      // 요소의 이벤트 찾기
      const elementEvents = element.props.events as ElementEvent[] || [];
      const matchingEvents = elementEvents.filter(e => e.event_type === eventType && e.enabled !== false);

      if (matchingEvents.length === 0) {
        return;
      }

      // 이벤트 컨텍스트 생성
      const context: EventContext = {
        event,
        element: event.target as HTMLElement,
        elementId: element.id,
        pageId: element.page_id || '',
        projectId: projectId || '',
        state: eventEngine.getState()
      };

      // 각 이벤트 실행
      for (const elementEvent of matchingEvents) {
        try {
          await eventEngine.executeEvent(elementEvent, context);
        } catch (error) {
          console.error('이벤트 실행 오류:', error);
        }
      }
    };
  };

  const renderElement = (el: PreviewElement): React.ReactNode => {
    const children = elements
      .filter((child) => child.parent_id === el.id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    // body 태그인 경우 특별 처리 - 실제 body는 이미 존재하므로 div로 렌더링
    const tag = el.tag === 'body' ? 'div' : el.tag;

    const newProps = {
      ...el.props,
      key: el.id,
      "data-element-id": el.id,
    };

    // body 태그인 경우 tag 속성 제거하지 않음 (초기 렌더링 시에도 표시되도록)
    // if (el.tag === 'body' && newProps.tag) {
    //   delete newProps.tag;
    // }

    // 이벤트 핸들러 추가
    const eventHandlers: Record<string, (e: Event) => void> = {};

    if (el.props.events && Array.isArray(el.props.events)) {
      const events = el.props.events as ElementEvent[];

      // 활성화된 이벤트 타입들만 추출
      const enabledEventTypes = events
        .filter(event => event.enabled !== false)
        .map(event => event.event_type);

      // 중복 제거 후 핸들러 생성
      [...new Set(enabledEventTypes)].forEach(eventType => {
        eventHandlers[eventType] = createEventHandler(el, eventType);
      });
    }

    // 기존 props와 이벤트 핸들러 결합

    // 기존 props와 이벤트 핸들러 결합
    const finalProps = {
      ...newProps,
      ...eventHandlers
    };

    // ToggleButton 렌더링 함수
    // Remove the entire renderToggleButton function (lines 234-267)
    // const renderToggleButton = (button: PreviewElement, parentGroup?: PreviewElement) => {
    //   ... entire function body ...
    // };

    // ToggleButtonGroup 컴포넌트 특별 처리
    if (el.tag === 'ToggleButtonGroup') {
      const orientation = el.props.orientation as 'horizontal' | 'vertical';

      // 실제 ToggleButton 자식 요소들을 찾기
      const toggleButtonChildren = elements
        .filter((child) => child.parent_id === el.id && child.tag === 'ToggleButton')
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      return (
        <ToggleButtonGroup
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          orientation={orientation}
          selectionMode={el.props.selectionMode as 'single' | 'multiple'}
          // ... existing code ...
          selectedKeys={Array.isArray(el.props.value) ? el.props.value : []}
          onSelectionChange={async (selectedKeys) => {
            const updatedProps = {
              ...el.props,
              value: Array.from(selectedKeys).map(key => String(key))
            };
            updateElementProps(el.id, updatedProps);
          }}
        >
          {toggleButtonChildren.map((toggleButton) => renderElement(toggleButton))}
        </ToggleButtonGroup>
      );
    }

    // 단독 ToggleButton 또는 ToggleButtonGroup 내부의 ToggleButton 처리
    if (el.tag === 'ToggleButton') {
      const isInGroup = elements.some(parent =>
        parent.id === el.parent_id && parent.tag === 'ToggleButtonGroup'
      );

      const parentGroup = isInGroup ?
        elements.find(parent => parent.id === el.parent_id) : null;

      return (
        <ToggleButton
          key={el.id}
          id={el.id}
          data-element-id={el.id}
          isSelected={isInGroup ?
            Array.isArray(parentGroup?.props.value) && parentGroup.props.value.includes(el.id) :
            el.props.isSelected
          }
          defaultSelected={el.props.defaultSelected}
          isDisabled={Boolean(el.props.isDisabled)}
          style={el.props.style}
          className={el.props.className}
          onPress={() => {
            if (isInGroup && parentGroup) {
              // 그룹 내 토글버튼인 경우 - 그룹의 value 업데이트
              const currentValue = Array.isArray(parentGroup.props.value) ? parentGroup.props.value : [];
              let newValue;

              if (parentGroup.props.selectionMode === 'multiple') {
                newValue = currentValue.includes(el.id) ?
                  currentValue.filter((id: string) => id !== el.id) :
                  [...currentValue, el.id];
              } else {
                newValue = currentValue.includes(el.id) ? [] : [el.id];
              }

              updateElementProps(parentGroup.id, {
                ...parentGroup.props,
                value: newValue
              });
            } else {
              // 단독 토글버튼인 경우
              const updatedProps = {
                ...el.props,
                isSelected: !el.props.isSelected
              };
              updateElementProps(el.id, updatedProps);
            }
          }}
        >
          {typeof el.props.children === 'string' ? el.props.children : null}
          {children.map((child) => renderElement(child))}
        </ToggleButton>
      );
    }

    // Checkbox 컴포넌트 특별 처리
    if (el.tag === 'Checkbox') {
      return (
        <Checkbox
          key={el.id}
          data-element-id={el.id}
          isSelected={Boolean(el.props.isSelected)}
          isIndeterminate={Boolean(el.props.isIndeterminate)}
          isDisabled={Boolean(el.props.isDisabled)}
          style={el.props.style}
          className={el.props.className}
          onChange={(isSelected) => {
            const updatedProps = {
              ...el.props,
              isSelected: Boolean(isSelected)
            };
            updateElementProps(el.id, updatedProps);
          }}
        >
          {typeof el.props.children === 'string' ? el.props.children : null}
          {children.map((child) => renderElement(child))}
        </Checkbox>
      );
    }

    // Radio 컴포넌트 특별 처리
    if (el.tag === 'Radio') {
      return (
        <Radio
          key={el.id}
          data-element-id={el.id}
          value={String(el.props.value || '')}
          isDisabled={Boolean(el.props.isDisabled || false)}
          style={el.props.style}
          className={el.props.className}
        >
          {typeof el.props.children === 'string' ? el.props.children : null}
          {children.map((child) => renderElement(child))}
        </Radio>
      );
    }

    // Label 컴포넌트 특별 처리
    if (el.tag === 'Label') {
      return (
        <Label
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
        >
          {typeof el.props.children === 'string' ? el.props.children : null}
          {children.map((child) => renderElement(child))}
        </Label>
      );
    }

    if (el.tag === 'Input') {
      return (
        <Input
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
        />
      );
    }

    if (el.tag === 'Description') {
      return (
        <Description
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
        >
          {typeof el.props.text === 'string' ? el.props.text : null}
          {children.map((child) => renderElement(child))}
        </Description>
      );
    }

    if (el.tag === 'FieldError') {
      return (
        <FieldError
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
        >
          {typeof el.props.text === 'string' ? el.props.text : null}
          {children.map((child) => renderElement(child))}
        </FieldError>
      );
    }

    // CheckboxGroup 컴포넌트 특별 처리
    if (el.tag === 'CheckboxGroup') {
      // 실제 Checkbox 자식 요소들을 찾기
      const checkboxChildren = elements
        .filter((child) => child.parent_id === el.id && child.tag === 'Checkbox')
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      // isSelected: true인 체크박스들의 ID를 value 배열로 생성
      const selectedValues = checkboxChildren
        .filter((checkbox) => checkbox.props.isSelected)
        .map((checkbox) => checkbox.id);

      return (
        <CheckboxGroup
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          label={String(el.props.label || '')}
          value={selectedValues} // 동적으로 생성된 value 배열 사용
          orientation={(el.props.orientation as 'horizontal' | 'vertical') || 'vertical'}
          onChange={async (newSelectedValues) => {
            // CheckboxGroup의 onChange: 전체 value 배열 업데이트
            const updatedProps = {
              ...el.props,
              value: newSelectedValues
            };
            updateElementProps(el.id, updatedProps);

            // 개별 체크박스의 isSelected도 동기화
            for (const checkbox of checkboxChildren) {
              const isSelected = newSelectedValues.includes(checkbox.id);
              if (checkbox.props.isSelected !== isSelected) {
                updateElementProps(checkbox.id, {
                  ...checkbox.props,
                  isSelected
                });
              }
            }
          }}
        >
          {checkboxChildren.map((checkbox) => (
            <Checkbox
              key={checkbox.id}
              data-element-id={checkbox.id}
              value={checkbox.id} // CheckboxGroup 내부에서는 value prop 사용
              isIndeterminate={Boolean(checkbox.props.isIndeterminate)}
              isDisabled={Boolean(checkbox.props.isDisabled)}
              style={checkbox.props.style}
              className={checkbox.props.className}
              onChange={(isSelected: boolean) => {
                const updatedProps = {
                  ...checkbox.props,
                  isSelected
                };
                updateElementProps(checkbox.id, updatedProps);
              }}
            >
              {typeof checkbox.props.children === 'string' ? checkbox.props.children : null}
            </Checkbox>
          ))}
        </CheckboxGroup>
      );
    }

    // RadioGroup 컴포넌트 특별 처리
    if (el.tag === 'RadioGroup') {
      // 실제 Radio 자식 요소들을 찾기
      const radioChildren = elements
        .filter((child) => child.parent_id === el.id && child.tag === 'Radio')
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      return (
        <RadioGroup
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          label={String(el.props.label || '')}
          value={String(el.props.value || '')}
          orientation={(el.props.orientation as 'horizontal' | 'vertical') || 'vertical'}
          onChange={(selectedValue) => {
            const updatedProps = {
              ...el.props,
              value: selectedValue
            };
            updateElementProps(el.id, updatedProps);

            // 개별 Radio의 isSelected도 동기화
            for (const radio of radioChildren) {
              const isSelected = radio.props.value === selectedValue;
              if (radio.props.isSelected !== isSelected) {
                updateElementProps(radio.id, {
                  ...radio.props,
                  isSelected
                });
              }
            }
          }}
        >
          {radioChildren.map((radio) => renderElement(radio))}
        </RadioGroup>
      );
    }

    // TextField 컴포넌트 특별 처리
    if (el.tag === 'TextField') {
      return (
        <TextField
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          label={String(el.props.label || '')}
          description={String(el.props.description || '')}
          errorMessage={String(el.props.errorMessage || '')}
          isDisabled={Boolean(el.props.isDisabled || false)}
          isRequired={Boolean(el.props.isRequired || false)}
          isReadOnly={Boolean(el.props.isReadOnly || false)}
        />
      );
    }

    // Button 컴포넌트 특별 처리 (디버깅 코드 제거)
    if (el.tag === 'Button') {
      return (
        <Button
          key={el.id}
          data-element-id={el.id}
          isDisabled={Boolean(el.props.isDisabled as boolean)}
          style={el.props.style}
          className={el.props.className}
          onPress={eventHandlers.onClick as unknown as () => void}
          onHoverStart={eventHandlers.onMouseEnter as unknown as (e: unknown) => void}
          onHoverEnd={eventHandlers.onMouseLeave as unknown as (e: unknown) => void}
          onFocus={eventHandlers.onFocus as unknown as (e: unknown) => void}
          onBlur={eventHandlers.onBlur as unknown as (e: unknown) => void}
          onKeyDown={eventHandlers.onKeyDown as unknown as (e: unknown) => void}
          onKeyUp={eventHandlers.onKeyUp as unknown as (e: unknown) => void}
          // DOM 이벤트를 직접 연결 (더블클릭)
          ref={(buttonElement: HTMLElement) => {
            if (buttonElement && eventHandlers.onDoubleClick) {
              const handleDoubleClick = (e: MouseEvent) => {
                eventHandlers.onDoubleClick(e);
              };

              buttonElement.addEventListener('dblclick', handleDoubleClick);

              return () => {
                buttonElement.removeEventListener('dblclick', handleDoubleClick);
              };
            }
          }}
        >
          {typeof el.props.children === 'string' ? el.props.children : (children.length === 0 ? 'Button' : null)}
          {children.map((child) => renderElement(child))}
        </Button>
      );
    }

    // GridList 컴포넌트 특별 처리
    if (el.tag === 'GridList') {
      // 실제 GridListItem 자식 요소들을 찾기
      const gridListChildren = elements
        .filter((child) => child.parent_id === el.id && child.tag === 'GridListItem')
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      return (
        <GridList
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          selectionMode={(el.props.selectionMode as 'none' | 'single' | 'multiple') || 'none'}
          // ... existing code ...
          selectedKeys={Array.isArray(el.props.selectedKeys) && el.props.selectedKeys.length > 0 && typeof el.props.selectedKeys[0] !== 'object' ? el.props.selectedKeys as unknown as string[] : []}
          // ... existing code ...
          onSelectionChange={(selectedKeys) => {
            const updatedProps = {
              ...el.props,
              selectedKeys: Array.from(selectedKeys)
            };
            updateElementProps(el.id, updatedProps);
          }}
        >
          {gridListChildren.map((item) => (
            <GridListItem
              key={item.id}
              value={item.props.value as object}
              isDisabled={Boolean(item.props.isDisabled)}
            >
              {String(item.props.label || '')}
            </GridListItem>
          ))}
        </GridList>
      );
    }

    // ListBox 컴포넌트 특별 처리
    if (el.tag === 'ListBox') {
      // 실제 ListBoxItem 자식 요소들을 찾기
      const listBoxChildren = elements
        .filter((child) => child.parent_id === el.id && child.tag === 'ListBoxItem')
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      return (
        <ListBox
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          orientation={(el.props.orientation as 'horizontal' | 'vertical') || 'vertical'}
          selectionMode={(el.props.selectionMode as 'none' | 'single' | 'multiple') || 'none'}
          selectedKeys={Array.isArray(el.props.selectedKeys) && el.props.selectedKeys.length > 0 && typeof el.props.selectedKeys[0] !== 'object' ? el.props.selectedKeys as unknown as string[] : []}
          onSelectionChange={(selectedKeys) => {
            const updatedProps = {
              ...el.props,
              selectedKeys: Array.from(selectedKeys)
            };
            updateElementProps(el.id, updatedProps);
          }}
        >
          {listBoxChildren.map((item) => (
            <ListBoxItem
              key={item.id}
              value={item.props.value as object}
              isDisabled={Boolean(item.props.isDisabled)}
            >
              {String(item.props.label || '')}
            </ListBoxItem>
          ))}
        </ListBox>
      );
    }

    // Select 컴포넌트 특별 처리
    if (el.tag === 'Select') {
      // 실제 SelectItem 자식 요소들을 찾기
      const selectItemChildren = elements
        .filter((child) => child.parent_id === el.id && child.tag === 'SelectItem')
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      // 디버깅을 위한 로그
      console.log('Select 렌더링:', {
        id: el.id,
        selectedKey: el.props.selectedKey,
        children: selectItemChildren.map((item, index) => ({
          index,
          id: item.id,
          value: item.props.value,
          label: item.props.label
        }))
      });

      return (
        <Select
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          label={String(el.props.label || '')}
          description={String(el.props.description || '')}
          errorMessage={String(el.props.errorMessage || '')}
          placeholder={el.props.placeholder}
          selectedKey={String(el.props.selectedKey || '')}
          defaultSelectedKey={String(el.props.defaultSelectedKey || '')}
          isDisabled={Boolean(el.props.isDisabled)}
          isRequired={Boolean(el.props.isRequired)}
          autoFocus={Boolean(el.props.autoFocus)}
          onSelectionChange={async (selectedKey) => {
            console.log('Select 선택 변경:', selectedKey);

            // React Aria의 내부 ID를 실제 값으로 변환 (데이터베이스 저장용)
            let actualValue = selectedKey;
            if (selectedKey && typeof selectedKey === 'string' && selectedKey.startsWith('react-aria-')) {
              // react-aria-1, react-aria-2 등을 실제 인덱스로 변환
              const index = parseInt(selectedKey.replace('react-aria-', '')) - 1;
              const selectedItem = selectItemChildren[index];
              if (selectedItem) {
                actualValue = String(selectedItem.props.value || selectedItem.props.label || `option-${index + 1}`);
              }
            }

            // React Aria는 내부 ID를 그대로 사용, 데이터베이스에는 실제 값 저장
            const updatedProps = {
              ...el.props,
              selectedKey, // React Aria 내부 ID 그대로 사용 (프리뷰용)
              selectedValue: actualValue // 실제 값 별도 저장 (데이터베이스용)
            };

            console.log('Select 상태 업데이트 전:', {
              elementId: el.id,
              selectedKey,
              actualValue,
              updatedProps
            });

            updateElementProps(el.id, updatedProps);

            // 데이터베이스에도 저장
            try {
              await elementsApi.updateElementProps(el.id, updatedProps);
              console.log('Element props updated successfully');
            } catch (err) {
              console.error('Error updating element props:', err);
            }

            // SelectEditor에 즉시 상태 변경 알림
            window.parent.postMessage({
              type: 'UPDATE_ELEMENT_PROPS',
              elementId: el.id,
              props: {
                selectedKey, // 내부 ID (프리뷰용)
                selectedValue: actualValue // 실제 값 (SelectEditor용)
              },
              merge: true
            }, window.location.origin);

            console.log('Select 상태 업데이트 후:', {
              elementId: el.id,
              selectedKey,
              actualValue,
              updatedProps
            });
          }}
        >
          {selectItemChildren.map((item, index) => {
            // 실제 value를 명시적으로 설정
            const actualValue = item.props.value || item.props.label || `option-${index + 1}`;

            return (
              <SelectItem
                key={item.id}
                value={String(actualValue) as unknown as object} // 실제 값 사용
                isDisabled={Boolean(item.props.isDisabled)}
              >
                {String(item.props.label || item.id)}
              </SelectItem>
            );
          })}
        </Select>
      );
    }

    // ComboBox 컴포넌트 특별 처리
    if (el.tag === 'ComboBox') {
      // 실제 ComboBoxItem 자식 요소들을 찾기
      const comboBoxItemChildren = elements
        .filter((child) => child.parent_id === el.id && child.tag === 'ComboBoxItem')
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      return (
        <ComboBox
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          label={String(el.props.label || '')}
          description={String(el.props.description || '')}
          errorMessage={String(el.props.errorMessage || '')}
          selectedKey={String(el.props.selectedValue || el.props.selectedKey)} // selectedValue 우선 사용
          inputValue={String(el.props.inputValue || '')}
          allowsCustomValue={Boolean(el.props.allowsCustomValue)}
          isDisabled={Boolean(el.props.isDisabled)}
          isRequired={Boolean(el.props.isRequired)}
          isReadOnly={Boolean(el.props.isReadOnly)}
          onSelectionChange={async (selectedKey) => {
            console.log('ComboBox 선택 변경:', selectedKey);

            // React Aria의 내부 ID를 실제 값으로 변환
            let actualValue = selectedKey;
            let displayValue = selectedKey;

            if (selectedKey && typeof selectedKey === 'string' && selectedKey.startsWith('react-aria-')) {
              const index = parseInt(selectedKey.replace('react-aria-', '')) - 1;
              const selectedItem = comboBoxItemChildren[index];
              if (selectedItem) {
                actualValue = String(selectedItem.props.value || selectedItem.props.label || `option-${index + 1}`);
                displayValue = String(selectedItem.props.label || selectedItem.props.value || `option-${index + 1}`);
              }
            }

            const updatedProps = {
              ...el.props,
              selectedKey, // React Aria 내부 ID (프리뷰용)
              selectedValue: actualValue, // 실제 값 (데이터베이스용)
              inputValue: displayValue // 표시용 라벨
            };

            updateElementProps(el.id, updatedProps);

            // 데이터베이스에도 저장
            try {
              await elementsApi.updateElementProps(el.id, updatedProps);
              console.log('Element props updated successfully');
            } catch (err) {
              console.error('Error updating element props:', err);
            }

            // ComboBoxEditor에 즉시 상태 변경 알림
            window.parent.postMessage({
              type: 'UPDATE_ELEMENT_PROPS',
              elementId: el.id,
              props: {
                selectedKey, // 내부 ID (프리뷰용)
                selectedValue: actualValue, // 실제 값 (ComboBoxEditor용)
                inputValue: displayValue
              },
              merge: true
            }, window.location.origin);
          }}
          onInputChange={(inputValue) => {
            const updatedProps = {
              ...el.props,
              inputValue
            };
            updateElementProps(el.id, updatedProps);
          }}
        >
          {comboBoxItemChildren.map((item, index) => {
            // 실제 value를 명시적으로 설정
            const actualValue = item.props.value || item.props.label || `option-${index + 1}`;

            return (
              <ComboBoxItem
                key={item.id} // key는 item.id 유지
                value={String(actualValue) as unknown as object} // value만 actualValue로 설정
                isDisabled={Boolean(item.props.isDisabled)}
              >
                {String(item.props.label || item.id)}
              </ComboBoxItem>
            );
          })}
        </ComboBox>
      );
    }

    // GridListItem 컴포넌트 특별 처리 (독립적으로 렌더링될 때)
    if (el.tag === 'GridListItem') {
      return (
        <GridListItem
          key={el.id}
          data-element-id={el.id}
          value={el.props.value as object}
          isDisabled={Boolean(el.props.isDisabled)}
          style={el.props.style}
          className={el.props.className}
        >
          {String(el.props.label || '')}
        </GridListItem>
      );
    }

    // Slider 컴포넌트 특별 처리
    if (el.tag === 'Slider') {
      return (
        <Slider
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          label={String(el.props.label || '')}
          value={Array.isArray(el.props.value) ? el.props.value : [50]}
          minValue={Number(el.props.minValue) || 0}
          maxValue={Number(el.props.maxValue) || 100}
          step={Number(el.props.step) || 1}
          orientation={(el.props.orientation as 'horizontal' | 'vertical') || 'horizontal'}
          onChange={(value) => {
            const updatedProps = {
              ...el.props,
              value
            };
            updateElementProps(el.id, updatedProps);
          }}
        />
      );
    }

    // Tabs 컴포넌트 특별 처리
    if (el.tag === 'Tabs') {
      // Tabs의 실제 Tab과 Panel 자식들을 찾기
      const tabChildren = elements
        .filter((child) => child.parent_id === el.id && child.tag === 'Tab')
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      const panelChildren = elements
        .filter((child) => child.parent_id === el.id && child.tag === 'Panel')
        .sort((a, b) => (a.props.tabIndex || 0) - (b.props.tabIndex || 0));

      return (
        <Tabs
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          defaultSelectedKey={String(el.props.defaultSelectedKey || '')}
          orientation={el.props.orientation as 'horizontal' | 'vertical' || 'horizontal'}
          isDisabled={Boolean(el.props.isDisabled)}
          onSelectionChange={(key) => {
            const updatedProps = {
              ...el.props,
              selectedKey: key
            };
            updateElementProps(el.id, updatedProps);
          }}
        >
          <TabList orientation={el.props.orientation as 'horizontal' | 'vertical' || 'horizontal'}>
            {tabChildren.map((tab) => (
              <Tab key={tab.id} id={tab.id}>
                {tab.props.title}
              </Tab>
            ))}
          </TabList>

          {/* 실제 Panel 컴포넌트들을 TabPanel로 래핑하여 렌더링 */}
          {panelChildren.map((panel) => {
            const correspondingTab = tabChildren[panel.props.tabIndex || 0];
            return (
              <TabPanel key={panel.id} id={correspondingTab?.id || `tab-${panel.props.tabIndex || 0}`}>
                {renderElement(panel)}
              </TabPanel>
            );
          })}
        </Tabs>
      );
    }

    // Tree 컴포넌트 특별 처리
    if (el.tag === 'Tree') {
      // 플랫 구조를 계층 구조로 변환하는 함수
      const buildHierarchy = (flatItems: Record<string, unknown>[]): Record<string, unknown>[] => {
        const itemMap = new Map<string, Record<string, unknown>>();
        const rootItems: Record<string, unknown>[] = [];

        // 모든 아이템을 맵에 저장
        flatItems.forEach(item => {
          itemMap.set(item.id as string, { ...item, children: [] });
        });

        // 계층 구조 구축
        flatItems.forEach(item => {
          const itemWithChildren = itemMap.get(item.id as string);
          if (item.parent_id === null || item.parent_id === undefined) {
            rootItems.push(itemWithChildren as Record<string, unknown>);
          } else {
            const parent = itemMap.get(item.parent_id as string);
            if (parent && itemWithChildren) {
              (parent.children as Record<string, unknown>[]).push(itemWithChildren);
            }
          }
        });

        return rootItems;
      };

      const renderTreeItems = (items: Record<string, unknown>[]): React.ReactNode => {
        return items.map((item: Record<string, unknown>) => (
          <TreeItem key={item.id as string} id={item.id as string} title={item.title as string}>
            {item.children && (item.children as Record<string, unknown>[]).length > 0 ? renderTreeItems(item.children as Record<string, unknown>[]) : null}
          </TreeItem>
        ));
      };

      const hierarchicalData = buildHierarchy(Array.isArray(el.props.children) ? el.props.children : []);

      return (
        <Tree
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          selectionMode={(el.props.selectionMode as 'single' | 'multiple') || 'single'}
          selectionBehavior={(el.props.selectionBehavior as 'replace' | 'toggle') || 'replace'}
          expandedKeys={Array.isArray(el.props.expandedKeys) ? el.props.expandedKeys as unknown as string[] : []}
          selectedKeys={Array.isArray(el.props.selectedKeys) ? el.props.selectedKeys as unknown as string[] : []}
          onSelectionChange={(selectedKeys) => {
            const updatedProps = {
              ...el.props,
              selectedKeys: Array.from(selectedKeys)
            };
            updateElementProps(el.id, updatedProps);
          }}
          onExpandedChange={(expandedKeys) => {
            const updatedProps = {
              ...el.props,
              expandedKeys: Array.from(expandedKeys)
            };
            updateElementProps(el.id, updatedProps);
          }}
        >
          {renderTreeItems(hierarchicalData)}
        </Tree>
      );
    }

    // Text 컴포넌트 특별 처리
    if (el.tag === 'Text') {
      const Tag = el.props.as || 'p';
      return (
        <Tag
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
        >
          {el.props.children}
          {children.map((child) => renderElement(child))}
        </Tag>
      );
    }

    // Calendar 컴포넌트 특별 처리 - 안전한 props 처리
    if (el.tag === 'Calendar') {
      // visibleDuration 안전 처리
      const getVisibleDuration = () => {
        const vd = el.props.visibleDuration;
        if (typeof vd === 'object' && vd !== null && 'months' in vd) {
          const months = Number(vd.months);
          if (months >= 1 && months <= 12) {
            return { months };
          }
        }
        return { months: 1 }; // 기본값
      };

      // pageBehavior 안전 처리
      const getPageBehavior = () => {
        const pb = el.props.pageBehavior;
        return (pb === 'visible' || pb === 'single') ? pb : 'visible';
      };

      return (
        <Calendar
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          aria-label={el.props['aria-label'] || 'Calendar'}
          isDisabled={Boolean(el.props.isDisabled)}
          visibleDuration={getVisibleDuration()}
          pageBehavior={getPageBehavior() as 'visible' | 'single'}
          value={el.props.value as unknown as never}
          onChange={(date) => {
            const updatedProps = {
              ...el.props,
              value: String(date || '')
            };
            updateElementProps(el.id, updatedProps);
          }}
          errorMessage={String(el.props.errorMessage || '')}
        />
      );
    }

    // DatePicker 컴포넌트 특별 처리 - 안전한 처리
    if (el.tag === 'DatePicker') {
      // granularity 안전 처리
      const getGranularity = () => {
        // includeTime이 true이면 minute로, 아니면 기본값 또는 day
        if (el.props.includeTime) {
          const g = String(el.props.granularity || '');
          return ['hour', 'minute', 'second'].includes(g) ? g : 'minute';
        } else {
          const g = String(el.props.granularity || '');
          return ['day'].includes(g) ? g : 'day';
        }
      };

      // firstDayOfWeek 안전 처리
      const getFirstDayOfWeek = () => {
        const fdow = Number(el.props.firstDayOfWeek);
        return (fdow >= 0 && fdow <= 6) ? fdow : 0;
      };

      // calendarIconPosition 안전 처리
      const getCalendarIconPosition = () => {
        const cip = el.props.calendarIconPosition;
        return (cip === 'left' || cip === 'right') ? cip : 'right';
      };

      return (
        <DatePicker
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          label={String(el.props.label || 'Date Picker')}
          description={String(el.props.description || '')}
          errorMessage={String(el.props.errorMessage || '')}
          placeholder={el.props.placeholder}
          isDisabled={Boolean(el.props.isDisabled)}
          isRequired={Boolean(el.props.isRequired)}
          isReadOnly={Boolean(el.props.isReadOnly)}
          isInvalid={Boolean(el.props.isInvalid)}
          value={el.props.value as unknown as never}
          defaultValue={el.props.defaultValue as unknown as never}
          minValue={el.props.minValue as unknown as never}
          maxValue={el.props.maxValue as unknown as never}
          placeholderValue={el.props.placeholderValue as unknown as never}
          granularity={getGranularity() as 'day' | 'hour' | 'minute' | 'second'}
          firstDayOfWeek={['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][getFirstDayOfWeek()] as 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'}
          showCalendarIcon={el.props.showCalendarIcon !== false}
          calendarIconPosition={getCalendarIconPosition() as 'left' | 'right'}
          showWeekNumbers={Boolean(el.props.showWeekNumbers)}
          highlightToday={el.props.highlightToday !== false}
          allowClear={el.props.allowClear !== false}
          autoFocus={Boolean(el.props.autoFocus)}
          shouldForceLeadingZeros={el.props.shouldForceLeadingZeros !== false}
          shouldCloseOnSelect={el.props.shouldCloseOnSelect !== false}
          // 새로운 Time 관련 props 추가
          includeTime={Boolean(el.props.includeTime)}
          timeFormat={el.props.timeFormat as '12h' | '24h' || '24h'}
          timeLabel={el.props.timeLabel as string || '시간'}
          onChange={(date) => {
            const updatedProps = {
              ...el.props,
              value: String(date || '')
            };
            updateElementProps(el.id, updatedProps);
          }}
        />
      );
    }

    // DateRangePicker 컴포넌트 특별 처리 - 안전한 처리
    if (el.tag === 'DateRangePicker') {
      // 동일한 안전 처리 함수들 사용
      const getGranularity = () => {
        const g = String(el.props.granularity || '');
        return ['day', 'hour', 'minute', 'second'].includes(g) ? g : 'day';
      };

      const getFirstDayOfWeek = () => {
        const fdow = Number(el.props.firstDayOfWeek);
        return (fdow >= 0 && fdow <= 6) ? fdow : 0;
      };

      const getCalendarIconPosition = () => {
        const cip = el.props.calendarIconPosition;
        return (cip === 'left' || cip === 'right') ? cip : 'right';
      };

      return (
        <DateRangePicker
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          label={String(el.props.label || 'Date Range Picker')}
          description={String(el.props.description || '')}
          errorMessage={String(el.props.errorMessage || '')}
          placeholder={el.props.placeholder as string || ''}
          isDisabled={Boolean(el.props.isDisabled)}
          isRequired={Boolean(el.props.isRequired)}
          isReadOnly={Boolean(el.props.isReadOnly)}
          isInvalid={Boolean(el.props.isInvalid)}
          value={el.props.value as unknown as never}
          defaultValue={el.props.defaultValue as unknown as never}
          minValue={el.props.minValue as unknown as never}
          maxValue={el.props.maxValue as unknown as never}
          placeholderValue={el.props.placeholderValue as unknown as never}
          granularity={getGranularity() as 'day' | 'hour' | 'minute' | 'second'}
          firstDayOfWeek={['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][getFirstDayOfWeek()] as 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'}
          showCalendarIcon={el.props.showCalendarIcon !== false}
          calendarIconPosition={getCalendarIconPosition() as 'left' | 'right'}
          showWeekNumbers={Boolean(el.props.showWeekNumbers)}
          highlightToday={el.props.highlightToday !== false}
          allowClear={el.props.allowClear !== false}
          autoFocus={Boolean(el.props.autoFocus)}
          shouldForceLeadingZeros={el.props.shouldForceLeadingZeros !== false}
          shouldCloseOnSelect={el.props.shouldCloseOnSelect !== false}
          allowsNonContiguousRanges={Boolean(el.props.allowsNonContiguousRanges)}
          // 새로운 Time 관련 props 추가
          includeTime={Boolean(el.props.includeTime)}
          timeFormat={el.props.timeFormat as '12h' | '24h' || '24h'}
          startTimeLabel={el.props.startTimeLabel as string || '시작 시간'}
          endTimeLabel={el.props.endTimeLabel as string || '종료 시간'}
          onChange={(dateRange) => {
            const updatedProps = {
              ...el.props,
              value: String(dateRange || '')
            };
            updateElementProps(el.id, updatedProps);
          }}
        />
      );
    }

    // Panel 컴포넌트 렌더링 로직 수정
    if (el.tag === 'Panel') {
      return (
        <Panel
          key={el.id}
          data-element-id={el.id}
          variant={(el.props.variant as 'default' | 'tab' | 'sidebar' | 'card' | 'modal') || 'default'}
          title={el.props.title}
          style={el.props.style}
          className={el.props.className}
        >
          {children.map((child) => renderElement(child))}
        </Panel>
      );
    }

    // Card 컴포넌트 특별 처리 수정
    if (el.tag === 'Card') {
      return (
        <Card
          key={el.id}
          data-element-id={el.id}
          title={el.props.title}
          description={String(el.props.description || '')}
          variant={(el.props.variant as 'default' | 'elevated' | 'outlined') || 'default'}
          size={el.props.size as 'small' | 'medium' | 'large' || 'medium'}
          isQuiet={Boolean(el.props.isQuiet)}
          isSelected={Boolean(el.props.isSelected)}
          isDisabled={Boolean(el.props.isDisabled)}
          isFocused={Boolean(el.props.isFocused)}
          style={el.props.style}
          className={el.props.className}
          onClick={eventHandlers.onClick as unknown as () => void}
        >
          {typeof el.props.children === 'string' ? el.props.children : null}
          {children.map((child) => renderElement(child))}
        </Card>
      );
    }

    // Page 컴포넌트 렌더링 로직 수정
    if (['section', 'Card', 'Div', 'Nav'].includes(el.tag)) {
      const tagMapping = { 'section': 'section', 'Card': 'div', 'Div': 'div', 'Nav': 'nav' };
      const Tag = tagMapping[el.tag as keyof typeof tagMapping];

      return (
        <Tag
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={`${el.props.className || ''} ${el.tag === 'Card' ? 'react-aria-Card' : ''}`.trim()}
        >
          {el.props.children}
          {children.map((child) => renderElement(child))}
        </Tag>
      );
    }

    // Switch 컴포넌트 특별 처리
    if (el.tag === 'Switch') {
      return (
        <Switch
          key={el.id}
          data-element-id={el.id}
          isSelected={Boolean(el.props.isSelected)}
          isDisabled={Boolean(el.props.isDisabled)}
          style={el.props.style}
          className={el.props.className}
          onChange={(isSelected) => {
            const updatedProps = {
              ...el.props,
              isSelected
            };
            updateElementProps(el.id, updatedProps);
          }}
        >
          {typeof el.props.children === 'string' ? el.props.children : null}
        </Switch>
      );
    }

    // Table 컴포넌트 특별 처리
    if (el.tag === 'Table') {
      return (
        <Table
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          selectionMode={(el.props.selectionMode as 'none' | 'single' | 'multiple') || 'none'}
          selectionBehavior={(el.props.selectionBehavior as 'toggle' | 'replace') || 'toggle'}
          onSelectionChange={(selectedKeys) => {
            const updatedProps = {
              ...el.props,
              selectedKeys: Array.from(selectedKeys)
            };
            updateElementProps(el.id, updatedProps);
          }}
        >
          {children.map((child) => renderElement(child))}
        </Table>
      );
    }

    // TagGroup 컴포넌트 특별 처리
    if (el.tag === 'TagGroup') {
      const tagChildren = elements
        .filter((child) => child.parent_id === el.id && child.tag === 'Tag')
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      return (
        <TagGroup
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          label={String(el.props.label || '')}
          description={String(el.props.description || '')}
          errorMessage={String(el.props.errorMessage || '')}
          allowsRemoving={Boolean(el.props.allowsRemoving)}
          onRemove={(keys) => {
            console.log('Removing tags:', Array.from(keys));
          }}
          items={tagChildren.map(tag => ({
            id: tag.id,
            label: String(tag.props.children || ''),
            value: tag.id
          }))}
        >
          {tagChildren.map((tag) => (
            <Tag
              key={tag.id}
              data-element-id={tag.id}
              isDisabled={Boolean(tag.props.isDisabled)}
              style={tag.props.style}
              className={tag.props.className}
            >
              {String(tag.props.children || '')}
            </Tag>
          ))}
        </TagGroup>
      );
    }

    // Tag 컴포넌트 특별 처리 (독립적으로 렌더링될 때)
    if (el.tag === 'Tag') {
      return (
        <Tag
          key={el.id}
          data-element-id={el.id}
          isDisabled={Boolean(el.props.isDisabled)}
          style={el.props.style}
          className={el.props.className}
        >
          {String(el.props.children || '')}
        </Tag>
      );
    }

    // 일반 요소 처리
    const content = [
      el.props.text && String(el.props.text),
      ...children.map((child) => renderElement(child))
    ].filter(Boolean);

    return React.createElement(tag, finalProps, content.length > 0 ? content : undefined);
  };

  const renderElementsTree = (): React.ReactNode => {
    const rootElement = elements.length > 0 ? elements[0] : null;

    if (rootElement && rootElement.tag === 'body') {
      // body가 루트인 경우, body의 직접 자식 요소들만 렌더링
      const bodyChildren = elements
        .filter((el) => el.parent_id === rootElement.id)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
      return bodyChildren.map((el) => renderElement(el));
    } else {
      // body가 아닌 경우 기존 로직 사용
      const sortedRootElements = elements
        .filter((el) => !el.parent_id)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
      return sortedRootElements.map((el) => renderElement(el));
    }
  };

  const handleGlobalClick = (e: React.MouseEvent) => {
    // Find the closest element with data-element-id attribute
    const target = e.target as HTMLElement;
    const elementWithId = target.closest('[data-element-id]');

    if (!elementWithId) return;

    const elementId = elementWithId.getAttribute('data-element-id');
    if (!elementId) return;

    // Find the element in our elements array
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    const rect = elementWithId.getBoundingClientRect();
    window.parent.postMessage({
      type: "ELEMENT_SELECTED",
      elementId: elementId,
      payload: {
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        },
        props: element.props,
        tag: element.tag
      },
    }, window.location.origin);
  };

  const rootElement = elements.length > 0 ? elements[0] : { tag: 'div', props: {} as ElementProps };

  // body 태그인 경우 실제 HTML body를 사용
  //const RootTag = rootElement.tag === 'body' ? 'body' : rootElement.tag;
  const RootTag = rootElement.tag === 'body' ? 'div' : rootElement.tag;

  return React.createElement(
    RootTag,
    {
      className: styles.main,
      id: rootElement.tag === 'body' ? (rootElement as PreviewElement).id : (projectId || undefined),
      "data-element-id": rootElement.tag === 'body' ? (rootElement as PreviewElement).id : undefined,
      onMouseUp: handleGlobalClick,
      ...rootElement.props,
      // body 태그인 경우 명시적으로 tag 속성 추가
      ...(rootElement.tag === 'body' ? { tag: 'body' } : {}),
    },
    elements.length === 0 ? "No elements available" : renderElementsTree()
  );
}

export default Preview;