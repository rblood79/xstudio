import React, { useCallback, useEffect } from 'react';
import { useParams } from "react-router";
import { useStore } from '../stores';
import { ElementProps } from '../../types/supabase';
//import { supabase } from '../../env/supabase.client'; // 추가된 import
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
  Card,
  TagGroup,
  Tag,
} from '../components/list';
import Table from '../components/Table';
import { EventEngine } from '../../utils/eventEngine';
import { ElementEvent, EventContext } from '../../types/events';
//import { useBatchUpdate } from '../stores';
import { ElementUtils } from '../../utils/elementUtils';


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

  // Console error/warning suppression for development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const originalError = console.error;
      const originalWarn = console.warn;

      console.error = (...args) => {
        const message = String(args[0] || '');
        if (
          message.includes('cannot be a child of') ||
          message.includes('using incorrect casing') ||
          message.includes('is unrecognized in this browser') ||
          message.includes('validateDOMNesting')
        ) {
          return; // DOM 중첩 관련 경고 무시
        }
        originalError.apply(console, args);
      };

      console.warn = (...args) => {
        const message = String(args[0] || '');
        if (
          message.includes('using incorrect casing') ||
          message.includes('is unrecognized in this browser')
        ) {
          return; // 컴포넌트 케이싱 관련 경고 무시
        }
        originalWarn.apply(console, args);
      };

      return () => {
        console.error = originalError;
        console.warn = originalWarn;
      };
    }
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object' || !data.type) return;

      if (data.type === 'UPDATE_ELEMENTS') {
        setElements(data.elements || []);
      }

      // 개별 요소 속성 업데이트 처리
      if (data.type === 'UPDATE_ELEMENT_PROPS') {
        const { elementId, props, merge = true } = data;

        if (merge) {
          const element = elements.find(el => el.id === elementId);
          if (element) {
            updateElementProps(elementId, {
              ...element.props,
              ...props
            });
          } else {
            updateElementProps(elementId, props);
          }
        } else {
          updateElementProps(elementId, props);
        }
        return;
      }

      // 요소 삭제 처리 추가
      if (data.type === 'DELETE_ELEMENTS' && Array.isArray(data.elementIds)) {
        const updatedElements = elements.filter(element =>
          !data.elementIds.includes(element.id)
        );
        setElements(updatedElements);
        return;
      }

      // 단일 요소 삭제 처리 추가
      if (data.type === 'DELETE_ELEMENT' && data.elementId) {
        const updatedElements = elements.filter(element =>
          element.id !== data.elementId
        );
        setElements(updatedElements);
        return;
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
    [elements, setElements, updateElementProps]
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

  // renderElement 함수 수정

  const renderElement = (el: PreviewElement, key?: string): React.ReactNode => {
    const children = elements
      .filter((child) => child.parent_id === el.id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    // body 태그는 특별 처리 - 다른 컴포넌트 내부에서는 div로 렌더링
    const effectiveTag = el.tag === 'body' ? 'div' : el.tag;

    const newProps: Record<string, unknown> = {
      ...el.props,
      "data-element-id": el.id,
    };

    // body 태그였다면 data 속성으로 원래 태그 기록
    if (el.tag === 'body') {
      newProps['data-original-tag'] = 'body';
    }

    // 이벤트 핸들러 추가
    const eventHandlers: Record<string, (e: Event) => void> = {};

    if (el.props.events && Array.isArray(el.props.events)) {
      const events = el.props.events as ElementEvent[];
      const enabledEventTypes = events
        .filter(event => event.enabled !== false)
        .map(event => event.event_type);

      [...new Set(enabledEventTypes)].forEach(eventType => {
        eventHandlers[eventType] = createEventHandler(el, eventType);
      });
    }

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
              } as Record<string, unknown>);
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
          {children.map((child) => renderElement(child, child.id))}
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
          {children.map((child) => renderElement(child, child.id))}
        </Checkbox>
      );
    }

    // Radio 컴포넌트 특별 처리 - RadioGroup 컨텍스트 필요
    if (el.tag === 'Radio') {
      // 부모가 RadioGroup인지 확인
      const parentElement = elements.find(parent => parent.id === el.parent_id);
      if (parentElement && parentElement.tag === 'RadioGroup') {
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
            {children.map((child) => renderElement(child, child.id))}
          </Radio>
        );
      } else {
        // RadioGroup이 없으면 기본 RadioGroup으로 감싸기
        return (
          <RadioGroup key={`group-${el.id}`} data-element-id={`group-${el.id}`}>
            <Radio
              key={el.id}
              data-element-id={el.id}
              value={String(el.props.value || '')}
              isDisabled={Boolean(el.props.isDisabled || false)}
              style={el.props.style}
              className={el.props.className}
            >
              {typeof el.props.children === 'string' ? el.props.children : null}
              {children.map((child) => renderElement(child, child.id))}
            </Radio>
          </RadioGroup>
        );
      }
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
          {children.map((child) => renderElement(child, child.id))}
        </Label>
      );
    }

    // Input 컴포넌트 렌더링 수정

    if (el.tag === 'Input') {
      return (
        <Input
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          type={el.props.type as 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number' || 'text'}
          placeholder={String(el.props.placeholder || '')} // placeholder 추가
          value={String(el.props.value || '')}
          disabled={Boolean(el.props.isDisabled || false)}
          readOnly={Boolean(el.props.isReadOnly || false)}
          onChange={(value) => {
            const updatedProps = {
              ...el.props,
              value: String(value)
            };
            updateElementProps(el.id, updatedProps);
          }}
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
          {children.map((child) => renderElement(child, child.id))}
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
          {children.map((child) => renderElement(child, child.id))}
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
                // 512-515번째 줄 수정
                updateElementProps(checkbox.id, {
                  ...checkbox.props,
                  isSelected
                } as Record<string, unknown>);
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
                // 571-574번째 줄 수정
                updateElementProps(radio.id, {
                  ...radio.props,
                  isSelected
                } as Record<string, unknown>);
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
      // 개발 환경에서 받은 props 확인
      /*if (process.env.NODE_ENV === 'development') {
        console.log('Preview TextField props:', {
          id: el.id,
          label: el.props.label,
          placeholder: el.props.placeholder,
          description: el.props.description,
          type: el.props.type,
          value: el.props.value,
          isRequired: el.props.isRequired,
          isDisabled: el.props.isDisabled,
          isReadOnly: el.props.isReadOnly
        });
      }*/

      return (
        <TextField
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          label={String(el.props.label || '')}
          description={String(el.props.description || '')}
          errorMessage={String(el.props.errorMessage || '')}
          placeholder={String(el.props.placeholder || '')}
          type={el.props.type as 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number' || 'text'}
          value={String(el.props.value || '')} // value만 사용
          // defaultValue 제거
          isDisabled={Boolean(el.props.isDisabled || false)}
          isRequired={Boolean(el.props.isRequired || false)}
          isReadOnly={Boolean(el.props.isReadOnly || false)}
          onChange={(value) => {
            const updatedProps = {
              ...el.props,
              value: String(value)
            };
            updateElementProps(el.id, updatedProps);
          }}
        />
      );
    }

    // Button 컴포넌트 특별 처리 (variant와 size props 추가)
    if (el.tag === 'Button') {
      return (
        <Button
          key={el.id}
          data-element-id={el.id}
          variant={el.props.variant as 'primary' | 'secondary' | 'surface' | 'outline' | 'ghost'}
          size={el.props.size as 'sm' | 'md' | 'lg'}
          type={el.props.type as 'button' | 'submit' | 'reset' || 'button'}
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
        >
          {typeof el.props.children === 'string' ? el.props.children : (children.length === 0 ? 'Button' : null)}
          {children.map((child) => renderElement(child, child.id))}
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
          selectedKeys={Array.isArray(el.props.selectedKeys) ? el.props.selectedKeys as unknown as string[] : []}
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
              data-element-id={item.id}
              value={item.props.value as object}
              isDisabled={Boolean(item.props.isDisabled)}
              style={item.props.style}
              className={item.props.className}
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
          selectedKeys={Array.isArray(el.props.selectedKeys) ? el.props.selectedKeys as unknown as string[] : []}
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
              data-element-id={item.id}
              value={item.props.value as object}
              isDisabled={Boolean(item.props.isDisabled)}
              style={item.props.style}
              className={item.props.className}
            >
              {String(item.props.label || '')}
            </ListBoxItem>
          ))}
        </ListBox>
      );
    }

    // Select 컴포넌트 특별 처리
    if (el.tag === 'Select') {
      const selectItemChildren = elements
        .filter((child) => child.parent_id === el.id && child.tag === 'SelectItem')
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      // props를 안전하게 보존
      const elementProps = { ...el.props };
      const labelValue = elementProps.label;
      const processedLabel = labelValue ? String(labelValue).trim() : undefined;
      const placeholderValue = elementProps.placeholder;
      const processedPlaceholder = placeholderValue ? String(placeholderValue).trim() : undefined;

      // selectedKey 상태 확인
      const currentSelectedKey = elementProps.selectedKey;
      //const hasSelection = currentSelectedKey && currentSelectedKey !== '' && currentSelectedKey !== 'undefined';

      // 접근성을 위한 aria-label 설정
      const ariaLabel = processedLabel
        ? undefined
        : (elementProps['aria-label'] || processedPlaceholder || `Select ${el.id}`);

      /*console.log('Select 렌더링 (개선된):', {
        id: el.id,
        label: processedLabel,
        placeholder: processedPlaceholder,
        selectedKey: currentSelectedKey,
        hasSelection,
        shouldShowPlaceholder: !hasSelection
      });*/

      return (
        <Select
          key={el.id}
          data-element-id={el.id}
          style={elementProps.style}
          className={el.props.className}
          label={processedLabel}
          description={elementProps.description ? String(elementProps.description).trim() : undefined}
          errorMessage={elementProps.errorMessage ? String(elementProps.errorMessage).trim() : undefined}
          placeholder={processedPlaceholder} // 항상 placeholder 전달
          aria-label={ariaLabel}
          selectedKey={currentSelectedKey ? String(currentSelectedKey) : undefined} // 빈 문자열 대신 undefined 사용
          defaultSelectedKey={String(elementProps.defaultSelectedKey || '')}
          isDisabled={Boolean(elementProps.isDisabled)}
          isRequired={Boolean(elementProps.isRequired)}
          autoFocus={Boolean(elementProps.autoFocus)}
          onSelectionChange={async (selectedKey) => {
            /*console.log('Select 선택 변경 (개선된):', {
              selectedKey,
              placeholderPreserved: processedPlaceholder
            });*/

            // React Aria의 내부 ID를 실제 값으로 변환
            let actualValue = selectedKey;
            if (selectedKey && typeof selectedKey === 'string' && selectedKey.startsWith('react-aria-')) {
              const index = parseInt(selectedKey.replace('react-aria-', '')) - 1;
              const selectedItem = selectItemChildren[index];
              if (selectedItem) {
                actualValue = String(selectedItem.props.value || selectedItem.props.label || `option-${index + 1}`);
              }
            }

            // placeholder를 포함한 모든 props 보존
            const updatedProps = {
              ...elementProps, // 모든 기존 props 보존
              selectedKey,
              selectedValue: actualValue
            };

            updateElementProps(el.id, updatedProps);

            try {
              await ElementUtils.updateElementProps(el.id, updatedProps);
              console.log('Element props updated successfully (placeholder preserved)');
            } catch (err) {
              console.error('Error updating element props:', err);
            }

            // 전체 props 전송으로 placeholder 보존
            window.parent.postMessage({
              type: 'UPDATE_ELEMENT_PROPS',
              elementId: el.id,
              props: updatedProps,
              merge: false // 전체 교체로 모든 props 보존
            }, window.location.origin);
          }}
        >
          {selectItemChildren.map((item, index) => {
            const actualValue = item.props.value || item.props.label || `option-${index + 1}`;

            return (
              <SelectItem
                key={item.id}
                data-element-id={item.id}
                value={String(actualValue) as unknown as object}
                isDisabled={Boolean(item.props.isDisabled)}
                style={item.props.style}
                className={item.props.className}
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
          placeholder={String(el.props.placeholder || '')}
          {...(el.props.selectedKey || el.props.selectedValue ? {
            selectedKey: String(el.props.selectedKey || el.props.selectedValue)
          } : {})}
          inputValue={String(el.props.inputValue || '')}
          allowsCustomValue={Boolean(el.props.allowsCustomValue)}
          isDisabled={Boolean(el.props.isDisabled)}
          isRequired={Boolean(el.props.isRequired)}
          isReadOnly={Boolean(el.props.isReadOnly)}
          onSelectionChange={async (selectedKey) => {
            // selectedKey가 undefined이면 선택 해제로 처리
            if (selectedKey === undefined || selectedKey === null) {
              const updatedProps = {
                ...el.props,
                selectedKey: undefined,
                selectedValue: undefined,
                inputValue: ''
              };
              updateElementProps(el.id, updatedProps);
              return;
            }

            // React Aria의 내부 ID를 실제 값으로 변환
            let actualValue = selectedKey;
            let displayValue = String(selectedKey); // 기본값으로 selectedKey 사용

            if (selectedKey && typeof selectedKey === 'string' && selectedKey.startsWith('react-aria-')) {
              const index = parseInt(selectedKey.replace('react-aria-', '')) - 1;
              const selectedItem = comboBoxItemChildren[index];
              if (selectedItem) {
                // 여기가 핵심: label을 표시용으로, value를 데이터 저장용으로 사용
                actualValue = String(selectedItem.props.value || selectedItem.props.label || `option-${index + 1}`);
                displayValue = String(selectedItem.props.label || selectedItem.props.value || `option-${index + 1}`);
              }
            } else {
              // React Aria 내부 ID가 아닌 경우, 직접 선택된 아이템 찾기
              const selectedItem = comboBoxItemChildren.find(item =>
                String(item.props.value) === String(selectedKey) ||
                String(item.props.label) === String(selectedKey)
              );

              if (selectedItem) {
                actualValue = String(selectedItem.props.value || selectedItem.props.label || selectedKey);
                displayValue = String(selectedItem.props.label || selectedItem.props.value || selectedKey);
              }
            }

            const updatedProps = {
              ...el.props,
              selectedKey, // React Aria 내부 ID 그대로 사용 (프리뷰용)
              selectedValue: actualValue, // 실제 값 별도 저장 (데이터베이스용)
              inputValue: displayValue // 표시용 라벨 (사용자가 보는 값)
            };

            updateElementProps(el.id, updatedProps);

            // 데이터베이스에도 저장
            try {
              await ElementUtils.updateElementProps(el.id, updatedProps);
              console.log('ComboBox element props updated successfully');
            } catch (err) {
              console.error('Error updating ComboBox element props:', err);
            }

            // ComboBoxEditor에 즉시 상태 변경 알림
            window.parent.postMessage({
              type: 'UPDATE_ELEMENT_PROPS',
              elementId: el.id,
              props: {
                selectedKey, // 내부 ID (프리뷰용)
                selectedValue: actualValue, // 실제 값 (ComboBoxEditor용)
                inputValue: displayValue // 표시용 라벨 (사용자가 보는 값)
              },
              merge: true
            }, window.location.origin);
          }}
          onInputChange={(inputValue) => {
            // 사용자가 직접 입력하는 경우에만 업데이트
            const updatedProps = {
              ...el.props,
              inputValue
            };
            updateElementProps(el.id, updatedProps);
          }}
        >
          {comboBoxItemChildren.map((item, index) => {
            // 실제 value를 명시적으로 설정
            const reactAriaId = `react-aria-${index + 1}`;
            //const actualValue = item.props.value;

            return (
              <ComboBoxItem
                key={item.id} // key는 item.id 유지
                data-element-id={item.id}
                value={reactAriaId as unknown as object} // React Aria 내부 ID 사용
                isDisabled={Boolean(item.props.isDisabled)}
                style={item.props.style}
                className={item.props.className}
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
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

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

          {/* Tab과 Panel을 순서대로 매칭하여 렌더링 */}
          {tabChildren.map((tab) => {
            // 같은 순서의 Panel 찾기 (order_num 기준)
            const correspondingPanel = panelChildren.find(panel => {
              // tabId가 있으면 tabId로 매칭
              if (panel.props.tabId && tab.props.tabId) {
                return panel.props.tabId === tab.props.tabId;
              }
              // tabId가 없으면 순서로 매칭
              return (panel.order_num || 0) === (tab.order_num || 0) + 1;
            });

            if (!correspondingPanel) {
              console.warn(`No corresponding panel found for tab ${tab.id}`);
              return null;
            }

            return (
              <TabPanel key={correspondingPanel.id} id={tab.id}>
                {/* Panel 컴포넌트를 직접 렌더링하되, TabPanel 안에서만 */}
                <Panel
                  key={correspondingPanel.id}
                  data-element-id={correspondingPanel.id}
                  variant={(correspondingPanel.props.variant as 'default' | 'tab' | 'sidebar' | 'card' | 'modal') || 'tab'}
                  title={correspondingPanel.props.title}
                  style={correspondingPanel.props.style}
                  className={correspondingPanel.props.className}
                >
                  {elements
                    .filter((child) => child.parent_id === correspondingPanel.id)
                    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
                    .map((child) => renderElement(child))}
                </Panel>
              </TabPanel>
            );
          })}
        </Tabs>
      );
    }

    // Tree 컴포넌트와 TreeItem 컴포넌트 렌더링 통합 개선

    // Tree 컴포넌트 특별 처리 (1017-1095 라인 완전 교체)
    if (el.tag === 'Tree') {
      // Tree의 실제 TreeItem 자식 요소들을 찾기
      const treeItemChildren = elements
        .filter((child) => child.parent_id === el.id && child.tag === 'TreeItem')
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      // Tree 컴포넌트 내부의 재귀 렌더링 함수 - React Aria 컬렉션 시스템 사용
      const renderTreeItemsRecursively = (items: PreviewElement[]): React.ReactNode => {
        return items.map((item) => {
          // 하위 TreeItem들 찾기
          const childTreeItems = elements
            .filter((child) => child.parent_id === item.id && child.tag === 'TreeItem')
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

          // TreeItem이 아닌 다른 컴포넌트들 찾기 (Button, Text 등)
          const otherChildren = elements
            .filter((child) => child.parent_id === item.id && child.tag !== 'TreeItem')
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

          const displayTitle = String(
            item.props.title ||
            item.props.label ||
            item.props.value ||
            item.props.children ||
            `Item ${item.id}`
          );

          const hasChildren = childTreeItems.length > 0;

          return (
            <TreeItem
              key={item.id}
              data-element-id={item.id}
              id={item.id}
              title={displayTitle}
              hasChildren={hasChildren}
              showInfoButton={false}
              style={item.props.style}
              className={item.props.className}
              // ... existing code ...
              children={otherChildren.map((child) => renderElement(child))}
              // 하위 TreeItem들
              childItems={hasChildren ? renderTreeItemsRecursively(childTreeItems) : undefined}
            />
          );
        });
      };

      return (
        <Tree
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          aria-label={String(el.props['aria-label'] || 'Tree')}
          selectionMode={(el.props.selectionMode as 'none' | 'single' | 'multiple') || 'single'}
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
          {renderTreeItemsRecursively(treeItemChildren)}
        </Tree>
      );
    }

    // TreeItem 개별 렌더링 처리 수정
    if (el.tag === 'TreeItem') {
      // 하위 TreeItem들 찾기
      const childTreeItems = elements
        .filter((child) => child.parent_id === el.id && child.tag === 'TreeItem')
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      // TreeItem이 아닌 다른 컴포넌트들 찾기
      const otherChildren = elements
        .filter((child) => child.parent_id === el.id && child.tag !== 'TreeItem')
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      const displayTitle = String(
        el.props.title ||
        el.props.label ||
        el.props.value ||
        el.props.children ||
        `Item ${el.id}`
      );

      const hasChildren = childTreeItems.length > 0;

      // TreeItem이 독립적으로 렌더링되는 경우 (Tree 외부)
      return (
        <TreeItem
          key={el.id}
          data-element-id={el.id}
          id={el.id}
          title={displayTitle}
          hasChildren={hasChildren}
          showInfoButton={true}
          children={otherChildren.map((child) => renderElement(child))}
          childItems={hasChildren ? childTreeItems.map((childItem) => renderElement(childItem)) : undefined}
        />
      );
    }

    // Text 컴포넌트 특별 처리
    if (el.tag === 'Text') {
      const TextTag = (el.props.as || 'p') as string;
      return React.createElement(
        TextTag,
        {
          key: el.id,
          'data-element-id': el.id,
          style: el.props.style,
          className: el.props.className,
        },
        el.props.children,
        ...children.map((child) => renderElement(child, child.id))
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
          {children.map((child) => renderElement(child, child.id))}
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
          {children.map((child) => renderElement(child, child.id))}
        </Card>
      );
    }

    // Page 컴포넌트 렌더링 로직 수정
    if (['section', 'Card', 'Div', 'Nav'].includes(el.tag)) {
      const tagMapping = { 'section': 'section', 'Card': 'div', 'Div': 'div', 'Nav': 'nav' };
      const Tag = tagMapping[el.tag as keyof typeof tagMapping];

      // HTML 요소에는 isDisabled 대신 disabled 사용
      const htmlProps: Record<string, unknown> = {
        'data-element-id': el.id,
        style: el.props.style,
        className: el.props.className,
      };

      // isDisabled가 true인 경우에만 disabled 속성 추가
      if (el.props.isDisabled) {
        htmlProps.disabled = true;
      }

      return React.createElement(
        Tag,
        {
          key: el.id,
          ...htmlProps,
          textValue: String(el.props.children || '')
        }
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

    // Table 컴포넌트 특별 처리 (새로운 TanStack Table 기반)
    if (el.tag === 'Table') {
      console.log('🔍 Table rendering:', { id: el.id, childrenCount: children.length, props: el.props });
      console.log('🔍 Table children:', children.map(c => ({ tag: c.tag, id: c.id })));
      console.log('🔍 All elements:', elements.filter(e => e.parent_id === el.id).map(e => ({ tag: e.tag, id: e.id, parent_id: e.parent_id })));

      // 컬럼 정의 추출 (children에서 Column 요소들)
      const columnElements = children.filter(child => child.tag === 'Column');
      const columns = columnElements.map(col => ({
        key: (col.props.key || col.props.id || 'col') as string,
        label: (col.props.children || col.props.label || 'Column') as string,
        allowsSorting: Boolean(col.props.allowsSorting ?? true),
        width: typeof col.props.width === 'number' ? col.props.width : undefined,
        minWidth: typeof col.props.minWidth === 'number' ? col.props.minWidth : undefined,
        maxWidth: typeof col.props.maxWidth === 'number' ? col.props.maxWidth : undefined,
        align: (col.props.align || 'left') as 'left' | 'center' | 'right'
      }));

      // 데이터 추출 (children에서 Row 요소들)
      // TableBody 내부의 Row 요소들을 찾기
      const tableBodyElement = children.find(child => child.tag === 'TableBody');
      const rowElements = tableBodyElement
        ? elements.filter(el => el.parent_id === tableBodyElement.id && el.tag === 'Row')
        : children.filter(child => child.tag === 'Row');
      const data = rowElements.map((row, index) => {
        const cellElements = elements.filter(el => el.parent_id === row.id && el.tag === 'Cell');
        const rowData: Record<string, unknown> = { id: row.id || index };

        cellElements.forEach((cell, cellIndex) => {
          const columnKey = columns[cellIndex]?.key || `col${cellIndex}`;
          rowData[columnKey] = cell.props.children || cell.props.value || '';
        });

        return rowData as { id: string | number;[key: string]: unknown };
      });

      console.log('🔍 Extracted data:', {
        columns: columns.length,
        data: data.length,
        rowElements: rowElements.length,
        tableBodyElement: tableBodyElement?.id
      });

      // API 데이터 사용 여부 확인 (테스트를 위해 강제로 true)
      const useApiData = true; // Boolean(el.props.enableAsyncLoading) && 
      // typeof el.props.apiUrlKey === 'string' && 
      // typeof el.props.endpointPath === 'string';

      console.log('🔍 API 사용 여부:', {
        useApiData,
        enableAsyncLoading: el.props.enableAsyncLoading,
        apiUrlKey: el.props.apiUrlKey,
        endpointPath: el.props.endpointPath
      });

      // API 데이터 사용 시 빈 배열로 시작 (Table 컴포넌트에서 로딩)
      // 샘플 데이터 사용 시 정적 데이터 제공
      const finalData = useApiData ? [] : [
        { id: 1, name: 'Sample Item 1', value: 'Value 1' },
        { id: 2, name: 'Sample Item 2', value: 'Value 2' },
        { id: 3, name: 'Sample Item 3', value: 'Value 3' },
        { id: 4, name: 'Sample Item 4', value: 'Value 4' },
        { id: 5, name: 'Sample Item 5', value: 'Value 5' }
      ];

      // API 데이터용 컬럼 정의
      const finalColumns = [
        { key: 'id' as const, label: 'ID', allowsSorting: true, width: 80 },
        { key: 'name' as const, label: 'Name', allowsSorting: true, width: 200 },
        { key: 'email' as const, label: 'Email', allowsSorting: true, width: 250 },
        { key: 'phone' as const, label: 'Phone', allowsSorting: true, width: 150 },
        { key: 'company' as const, label: 'Company', allowsSorting: true, width: 200 }
      ];

      return (
        <Table
          key={el.id}
          data-element-id={el.id}
          className={el.props.className}
          columns={finalColumns}
          data={useApiData ? undefined : finalData}
          paginationMode={(el.props.paginationMode as 'pagination' | 'infinite') || 'pagination'}
          itemsPerPage={typeof el.props.itemsPerPage === 'number' ? el.props.itemsPerPage : 50}
          height={typeof el.props.height === 'number' ? el.props.height : 300}
          rowHeight={typeof el.props.rowHeight === 'number' ? el.props.rowHeight : 40}
          overscan={typeof el.props.overscan === 'number' ? el.props.overscan : 10}
          enableAsyncLoading={useApiData}
          apiUrlKey={useApiData ? (el.props.apiUrlKey as string) : 'demo'}
          endpointPath={useApiData ? (el.props.endpointPath as string) : '/users'}
          sortColumn={typeof el.props.sortColumn === 'string' ? el.props.sortColumn : undefined}
          sortDirection={(el.props.sortDirection as 'ascending' | 'descending') || 'ascending'}
          enableResize={Boolean(el.props.enableResize ?? true)}
        />
      );
    }

    // TableHeader, TableBody, Column, Row, Cell은 Table 컴포넌트 내부에서 처리됨
    // 이들은 Table의 children으로만 사용되며 개별 렌더링은 하지 않음
    if (el.tag === 'TableHeader' || el.tag === 'TableBody' || el.tag === 'Column' || el.tag === 'Row' || el.tag === 'Cell') {
      return null; // Table 컴포넌트에서 처리되므로 개별 렌더링하지 않음
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
          selectionMode={el.props.selectionMode as 'none' | 'single' | 'multiple' || 'none'}
          selectionBehavior={el.props.selectionBehavior as 'toggle' | 'replace' || 'toggle'}
          selectedKeys={Array.isArray(el.props.selectedKeys) ? el.props.selectedKeys as unknown as string[] : []}
          orientation={el.props.orientation as 'horizontal' | 'vertical' || 'horizontal'}
          isDisabled={Boolean(el.props.isDisabled)}
          disallowEmptySelection={Boolean(el.props.disallowEmptySelection)}
          onSelectionChange={async (selectedKeys) => {
            const updatedProps = {
              ...el.props,
              selectedKeys: Array.from(selectedKeys)
            };
            updateElementProps(el.id, updatedProps);

            // 데이터베이스에도 저장
            try {
              await ElementUtils.updateElementProps(el.id, updatedProps);
              console.log('TagGroup selectedKeys updated successfully');
            } catch (err) {
              console.error('Error updating TagGroup selectedKeys:', err);
            }

            // TagGroupEditor에 즉시 상태 변경 알림
            window.parent.postMessage({
              type: 'UPDATE_ELEMENT_PROPS',
              elementId: el.id,
              props: {
                selectedKeys: Array.from(selectedKeys)
              },
              merge: true
            }, window.location.origin);
          }}
          onRemove={async (keys) => {
            console.log('Removing tags:', Array.from(keys));

            // 선택된 태그들을 실제로 삭제
            const keysToRemove = Array.from(keys);
            const deletedTagIds: string[] = [];

            // 1. 먼저 모든 태그를 데이터베이스에서 삭제
            for (const key of keysToRemove) {
              let tagId = key;
              if (typeof key === 'string' && key.startsWith('react-aria-')) {
                const index = parseInt(key.replace('react-aria-', '')) - 1;
                const tagToRemove = tagChildren[index];
                if (tagToRemove) {
                  tagId = tagToRemove.id;
                }
              }

              try {
                await ElementUtils.deleteElement(String(tagId));
                deletedTagIds.push(String(tagId));
                console.log(`Tag ${tagId} deleted successfully`);
              } catch (err) {
                console.error(`Error deleting tag ${tagId}:`, err);
              }
            }

            // 2. 최신 elements 상태를 가져와서 삭제된 태그들을 제거
            const currentElements = useStore.getState().elements;
            const updatedElements = currentElements.filter(el => !deletedTagIds.includes(el.id));

            // 3. TagGroup의 selectedKeys 업데이트
            const currentSelectedKeys = Array.isArray(el.props.selectedKeys) ? el.props.selectedKeys as unknown as string[] : [];
            const updatedSelectedKeys = currentSelectedKeys.filter(key => !keysToRemove.includes(key));

            const updatedProps = {
              ...el.props,
              selectedKeys: updatedSelectedKeys
            };

            // 4. 모든 상태를 한 번에 업데이트
            setElements(updatedElements);
            updateElementProps(el.id, updatedProps);

            // 5. 데이터베이스에 TagGroup props 저장
            try {
              await ElementUtils.updateElementProps(el.id, updatedProps);
              console.log('TagGroup selectedKeys updated after removal');
            } catch (err) {
              console.error('Error updating TagGroup selectedKeys after removal:', err);
            }

            // 6. 부모 창에 업데이트 알림 (한 번만, 지연 없이)
            setTimeout(() => {
              window.parent.postMessage({
                type: "UPDATE_ELEMENTS",
                elements: updatedElements
              }, window.location.origin);
            }, 0);
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
          textValue={String(el.props.children || '')}
        >
          {String(el.props.children || '')}
        </Tag>
      );
    }

    // React 컴포넌트와 HTML 요소 구분을 위한 매핑
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reactComponentMap: Record<string, React.ComponentType<any>> = {
      'Button': Button,
      'TextField': TextField,
      'Label': Label,
      'Input': Input,
      'Description': Description,
      'FieldError': FieldError,
      'Checkbox': Checkbox,
      'CheckboxGroup': CheckboxGroup,
      'Radio': Radio,
      'RadioGroup': RadioGroup,
      'ListBox': ListBox,
      'ListBoxItem': ListBoxItem,
      'GridList': GridList,
      'GridListItem': GridListItem,
      'Select': Select,
      'SelectItem': SelectItem,
      'ComboBox': ComboBox,
      'ComboBoxItem': ComboBoxItem,
      'Slider': Slider,
      'Tabs': Tabs,
      'TabList': TabList,
      'Tab': Tab,
      'TabPanel': TabPanel,
      'Tree': Tree,
      'TreeItem': TreeItem,
      'Panel': Panel,
      'Calendar': Calendar,
      'DatePicker': DatePicker,
      'DateRangePicker': DateRangePicker,
      'Switch': Switch,
      'Table': Table,
      'Card': Card,
      'TagGroup': TagGroup,
      'Tag': Tag,
      'ToggleButton': ToggleButton,
      'ToggleButtonGroup': ToggleButtonGroup,
      // ... 다른 React Aria 컴포넌트들
    };

    // HTML 요소 목록
    const htmlElements = [
      'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'section', 'article', 'header', 'footer', 'nav', 'main', 'aside',
      'ul', 'ol', 'li', 'a', 'img', 'video', 'audio', 'canvas',
      'table', 'thead', 'tbody', 'tr', 'td', 'th', 'form', 'input',
      'textarea', 'button', 'select', 'option', 'label', 'fieldset',
      'legend', 'datalist', 'output', 'progress', 'meter'
    ];

    // React 컴포넌트인지 확인 (대소문자 구분)
    const ReactComponent = reactComponentMap[effectiveTag];

    if (ReactComponent) {
      // React 컴포넌트인 경우 - JSX.Element 반환
      const content = children.map((child) => renderElement(child, child.id));
      return React.createElement(
        ReactComponent,
        {
          key,
          ...finalProps,
          "data-element-id": el.id,
        },
        content.length > 0 ? content : undefined
      );
    }

    // HTML 요소인지 확인 (소문자 변환 후 체크)
    const isHTMLElement = htmlElements.includes(effectiveTag.toLowerCase()) ||
      (effectiveTag && typeof effectiveTag === 'string' &&
        effectiveTag[0] === effectiveTag[0].toLowerCase());

    if (isHTMLElement) {
      // HTML 요소인 경우 - React Aria 전용 props 제거
      const cleanProps = { ...finalProps };
      const content = children.map((child) => renderElement(child, child.id));

      // React Aria 전용 props 제거
      const propsToRemove = [
        'isDisabled', 'isSelected', 'isIndeterminate', 'isRequired',
        'isReadOnly', 'isInvalid', 'onPress', 'onHoverStart', 'onHoverEnd',
        'selectionMode', 'selectionBehavior', 'orientation', 'variant',
        'size', 'isQuiet', 'isFocused', 'allowsRemoving', 'textValue',
        'selectedKeys', 'defaultSelectedKey', 'allowsCustomValue',
        'granularity', 'firstDayOfWeek', 'calendarIconPosition',
        'showCalendarIcon', 'showWeekNumbers', 'highlightToday',
        'allowClear', 'shouldForceLeadingZeros', 'shouldCloseOnSelect',
        'includeTime', 'timeFormat', 'timeLabel', 'startTimeLabel', 'endTimeLabel',
        'allowsNonContiguousRanges', 'visibleDuration', 'pageBehavior',
        'disallowEmptySelection', 'text', 'children', 'events', 'label',
        'description', 'errorMessage', 'placeholder', 'value', 'defaultValue',
        'minValue', 'maxValue', 'step', 'expandedKeys', 'defaultSelectedKeys',
        'disabledKeys', 'autoFocus', 'onSelectionChange', 'onChange', 'onInputChange',
        'onExpandedChange', 'onRemove', 'items', 'hasChildren', 'showInfoButton',
        'childItems', 'title', 'as'
      ];

      propsToRemove.forEach(prop => {
        if (prop in cleanProps) {
          delete (cleanProps as Record<string, unknown>)[prop];
        }
      });

      // HTML disabled 속성 처리
      if (finalProps.isDisabled) {
        cleanProps.disabled = true;
      }

      return React.createElement(
        effectiveTag.toLowerCase(),
        {
          key,
          ...cleanProps,
          "data-element-id": el.id,
        },
        content.length > 0 ? content : undefined
      );
    }

    // 알 수 없는 태그인 경우 div로 렌더링
    console.warn(`Unknown component/element type: ${effectiveTag}. Rendering as div.`);

    const content = children.map((child) => renderElement(child, child.id));
    const fallbackProps = {
      "data-element-id": el.id,
      "data-unknown-component": effectiveTag,
      "data-original-tag": el.tag,
      style: finalProps.style,
      className: finalProps.className,
    };

    return React.createElement(
      'div',
      { ...fallbackProps, key },
      content.length > 0 ? content : `Unknown: ${effectiveTag}`
    );
  };

  const renderElementsTree = (): React.ReactNode => {
    // body 태그 확인
    const bodyElement = elements.find(el => el.tag === 'body');

    if (bodyElement) {
      // body가 있는 경우, body의 직접 자식 요소들만 렌더링
      const bodyChildren = elements
        .filter((el) => el.parent_id === bodyElement.id)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      // body의 자식들을 렌더링 (body 자체는 Preview 컴포넌트의 루트에서 처리)
      return bodyChildren.map((el) => renderElement(el, el.id));
    } else {
      // body가 없는 경우 루트 요소들 렌더링
      const rootElements = elements
        .filter((el) => !el.parent_id)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      return rootElements.map((el) => renderElement(el, el.id));
    }
  };

  const handleGlobalClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const elementWithId = target.closest('[data-element-id]');

    if (!elementWithId) return;

    const elementId = elementWithId.getAttribute('data-element-id');
    if (!elementId) return;

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

  // body 요소 확인
  const bodyElement = elements.find(el => el.tag === 'body');
  //const rootElement = bodyElement || { tag: 'div', props: {} as ElementProps };

  // 루트 컨테이너는 항상 div로 렌더링 (실제 body는 HTML 문서의 body)
  const containerProps = {
    className: styles.main,
    id: projectId || 'preview-container',
    "data-element-id": bodyElement?.id,
    onMouseUp: handleGlobalClick,
    //onMouseDown: handleGlobalClick,
    // body 요소의 스타일만 적용 (다른 props는 제외)
    style: bodyElement?.props?.style || {},
    // body였다면 원래 태그 정보 기록
    ...(bodyElement ? { 'data-original-tag': 'body' } : {}),
  };

  return React.createElement(
    'div',
    containerProps,
    elements.length === 0 ? "No elements available" : renderElementsTree()
  );
}


export default Preview;