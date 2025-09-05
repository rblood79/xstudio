import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from "react-router";
import { useStore } from '../stores/elements';
import { ElementProps } from '../../types/supabase';
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
  Column,
  TableHeader,
  Row,
  Cell,
} from '../components/list';
import EventEngine from '../../utils/eventEngine';
import { ElementEvent, EventContext } from '../../types/events';


interface PreviewElement {
  id: string;
  tag: string;
  props: ElementProps;
  text?: string;
  parent_id?: string | null;
  page_id?: string;
  order_num?: number;
}


function Preview() {
  const { projectId } = useParams<{ projectId: string }>();
  const elements = useStore((state) => state.elements) as PreviewElement[];
  const { setElements, updateElementProps } = useStore();
  const [elementsState, setElementsState] = useState<any[]>([]);
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
            setElements(updatedElements);

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
          data.vars.map((v: any) => `  ${v.cssVar}: ${v.value};`).join('\n') +
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
    } catch { }
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

    // body 태그를 div로 대체하는 로직 제거
    // const tag = el.tag === 'body' ? 'div' : el.tag;

    const newProps = {
      ...el.props,
      key: el.id,
      "data-element-id": el.id,
    };

    // 이벤트 핸들러 추가
    const eventHandlers: any = {};

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
    const renderToggleButton = (button: PreviewElement, parentGroup?: PreviewElement) => {
      const isInGroup = parentGroup?.tag === 'ToggleButtonGroup';

      // 하위 children 요소들을 가져옴
      const buttonChildren = elements
        .filter((child) => child.parent_id === button.id)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      return (
        <ToggleButton
          key={button.id}
          id={button.id}
          data-element-id={button.id}
          isSelected={isInGroup ? parentGroup.props.value?.includes(button.id) : button.props.isSelected}
          defaultSelected={button.props.defaultSelected}
          isDisabled={button.props.isDisabled}
          style={button.props.style}
          className={button.props.className}
          onPress={() => {
            if (!isInGroup) {
              // 단독 ToggleButton의 경우 상태 토글
              const updatedProps = {
                ...button.props,
                isSelected: !button.props.isSelected
              };
              updateElementProps(button.id, updatedProps);
            }
          }}
        >
          {typeof button.props.children === 'string' ? button.props.children : null}
          {buttonChildren.map((child) => renderElement(child))}
        </ToggleButton>
      );
    };

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
          value={el.props.value || []}
          onChange={async (selected) => {
            const updatedProps = {
              ...el.props,
              value: selected
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
            parentGroup?.props.value?.includes(el.id) :
            el.props.isSelected
          }
          defaultSelected={el.props.defaultSelected}
          isDisabled={el.props.isDisabled}
          style={el.props.style}
          className={el.props.className}
          onPress={() => {
            if (isInGroup && parentGroup) {
              // 그룹 내 토글버튼인 경우 - 그룹의 value 업데이트
              const currentValue = parentGroup.props.value || [];
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
          isSelected={el.props.isSelected}
          isIndeterminate={el.props.isIndeterminate}
          isDisabled={el.props.isDisabled}
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
          value={el.props.value}
          isDisabled={el.props.isDisabled || false}
          style={el.props.style}
          className={el.props.className}
          onChange={(isSelected) => {
            // Radio의 선택 상태가 변경될 때 부모 RadioGroup의 value 업데이트
            if (isSelected) {
              const parentGroup = elements.find(parent =>
                parent.id === el.parent_id && parent.tag === 'RadioGroup'
              );

              if (parentGroup) {
                updateElementProps(parentGroup.id, {
                  ...parentGroup.props,
                  value: el.props.value
                });

                // 다른 Radio들의 isSelected 상태 업데이트
                const siblingRadios = elements.filter(sibling =>
                  sibling.parent_id === el.parent_id &&
                  sibling.tag === 'Radio' &&
                  sibling.id !== el.id
                );

                siblingRadios.forEach(siblingRadio => {
                  updateElementProps(siblingRadio.id, {
                    ...siblingRadio.props,
                    isSelected: false
                  });
                });

                // 현재 Radio의 isSelected 상태 업데이트
                updateElementProps(el.id, {
                  ...el.props,
                  isSelected: true
                });
              }
            }
          }}
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
          label={el.props.label}
          value={selectedValues} // 동적으로 생성된 value 배열 사용
          orientation={el.props.orientation || 'vertical'}
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
              isIndeterminate={checkbox.props.isIndeterminate}
              isDisabled={checkbox.props.isDisabled}
              style={checkbox.props.style}
              className={checkbox.props.className}
              onChange={(isSelected) => {
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
          label={el.props.label}
          value={el.props.value || ''}
          orientation={el.props.orientation || 'vertical'}
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
          label={el.props.label || ''}
          description={el.props.description || ''}
          errorMessage={el.props.errorMessage || ''}
          isDisabled={el.props.isDisabled || false}
          isRequired={el.props.isRequired || false}
          isReadOnly={el.props.isReadOnly || false}
        />
      );
    }

    // Button 컴포넌트 특별 처리 (디버깅 코드 제거)
    if (el.tag === 'Button') {
      return (
        <Button
          key={el.id}
          data-element-id={el.id}
          isDisabled={el.props.isDisabled as boolean}
          variant={el.props.variant as 'primary' | 'secondary' | 'surface' | 'icon'}
          style={el.props.style}
          className={el.props.className}
          onPress={eventHandlers.onClick}
          onHoverStart={eventHandlers.onMouseEnter}
          onHoverEnd={eventHandlers.onMouseLeave}
          onFocus={eventHandlers.onFocus}
          onBlur={eventHandlers.onBlur}
          onKeyDown={eventHandlers.onKeyDown}
          onKeyUp={eventHandlers.onKeyUp}
          // DOM 이벤트를 직접 연결 (더블클릭)
          ref={(buttonElement) => {
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
          orientation={el.props.orientation || 'vertical'}
          label={el.props.label}
          itemLayout={el.props.itemLayout || 'default'}
          selectionMode={el.props.selectionMode || 'none'}
          selectedKeys={el.props.selectedKeys || []}
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
              value={item.props.value}
              isDisabled={item.props.isDisabled}
            >
              {item.props.label}
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
          orientation={el.props.orientation || 'vertical'}
          label={el.props.label}
          itemLayout={el.props.itemLayout || 'default'}
          selectionMode={el.props.selectionMode || 'none'}
          selectedKeys={el.props.selectedKeys || []}
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
              value={item.props.value}
              isDisabled={item.props.isDisabled}
            >
              {item.props.label}
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

      return (
        <Select
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          label={el.props.label}
          description={el.props.description}
          errorMessage={el.props.errorMessage}
          placeholder={el.props.placeholder}
          selectedKey={el.props.selectedKey}
          defaultSelectedKey={el.props.defaultSelectedKey}
          menuTrigger={el.props.menuTrigger || 'click'}
          disallowEmptySelection={el.props.disallowEmptySelection}
          isDisabled={el.props.isDisabled}
          isRequired={el.props.isRequired}
          isReadOnly={el.props.isReadOnly}
          autoFocus={el.props.autoFocus}
          onSelectionChange={(selectedKey) => {
            const updatedProps = {
              ...el.props,
              selectedKey
            };
            updateElementProps(el.id, updatedProps);
          }}
        >
          {selectItemChildren.map((item) => (
            <SelectItem
              key={item.id}
              value={item.props.value}
              isDisabled={item.props.isDisabled}
              isReadOnly={item.props.isReadOnly}
            >
              {item.props.label}
            </SelectItem>
          ))}
        </Select>
      );
    }

    // ComboBox 컴포넌트 특별 처리
    if (el.tag === 'ComboBox') {
      const itemsData = el.props.children || [];

      return (
        <ComboBox
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          label={el.props.label}
          selectedKey={el.props.selectedKey}
          onSelectionChange={(selectedKey) => {
            const updatedProps = {
              ...el.props,
              selectedKey
            };
            updateElementProps(el.id, updatedProps);
          }}
        >
          {itemsData.map((item: any, index: number) => (
            <ListBoxItem
              key={item.id || `comboitem-${index}`}
              value={item.value}
              isDisabled={item.isDisabled}
            >
              {item.label}
            </ListBoxItem>
          ))}
        </ComboBox>
      );
    }

    // ListBoxItem 컴포넌트 특별 처리 (독립적으로 렌더링될 때)
    if (el.tag === 'ListBoxItem') {
      return (
        <ListBoxItem
          key={el.id}
          data-element-id={el.id}
          value={el.props.value}
          isDisabled={el.props.isDisabled}
          style={el.props.style}
          className={el.props.className}
        >
          {el.props.label}
        </ListBoxItem>
      );
    }

    // SelectItem 컴포넌트 특별 처리 (독립적으로 렌더링될 때)
    if (el.tag === 'SelectItem') {
      return (
        <SelectItem
          key={el.id}
          data-element-id={el.id}
          value={el.props.value}
          isDisabled={el.props.isDisabled}
          isReadOnly={el.props.isReadOnly}
          style={el.props.style}
          className={el.props.className}
        >
          {el.props.label}
        </SelectItem>
      );
    }

    // GridListItem 컴포넌트 특별 처리 (독립적으로 렌더링될 때)
    if (el.tag === 'GridListItem') {
      return (
        <GridListItem
          key={el.id}
          data-element-id={el.id}
          value={el.props.value}
          isDisabled={el.props.isDisabled}
          style={el.props.style}
          className={el.props.className}
        >
          {el.props.label}
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
          label={el.props.label}
          value={el.props.value || [50]}
          minValue={el.props.minValue || 0}
          maxValue={el.props.maxValue || 100}
          step={el.props.step || 1}
          orientation={el.props.orientation as 'horizontal' | 'vertical'}
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
          defaultSelectedKey={el.props.defaultSelectedKey}
          orientation={el.props.orientation as 'horizontal' | 'vertical' || 'horizontal'}
          isDisabled={el.props.isDisabled}
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
      const buildHierarchy = (flatItems: any[]): any[] => {
        const itemMap = new Map();
        const rootItems: any[] = [];

        // 모든 아이템을 맵에 저장
        flatItems.forEach(item => {
          itemMap.set(item.id, { ...item, children: [] });
        });

        // 계층 구조 구축
        flatItems.forEach(item => {
          const itemWithChildren = itemMap.get(item.id);
          if (item.parent_id === null || item.parent_id === undefined) {
            rootItems.push(itemWithChildren);
          } else {
            const parent = itemMap.get(item.parent_id);
            if (parent) {
              parent.children.push(itemWithChildren);
            }
          }
        });

        return rootItems;
      };

      const renderTreeItems = (items: any[]): React.ReactNode => {
        return items.map((item: any) => (
          <TreeItem key={item.id} id={item.id} title={item.title}>
            {item.children && item.children.length > 0 && renderTreeItems(item.children)}
          </TreeItem>
        ));
      };

      const hierarchicalData = buildHierarchy(el.props.children || []);

      return (
        <Tree
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          selectionMode={el.props.selectionMode || 'single'}
          selectionBehavior={el.props.selectionBehavior || 'replace'}
          expandedKeys={el.props.expandedKeys || []}
          selectedKeys={el.props.selectedKeys || []}
          allowsDragging={el.props.allowsDragging || false}
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
          pageBehavior={getPageBehavior()}
          value={el.props.value}
          onChange={(date) => {
            const updatedProps = {
              ...el.props,
              value: date
            };
            updateElementProps(el.id, updatedProps);
          }}
          errorMessage={el.props.errorMessage}
        />
      );
    }

    // DatePicker 컴포넌트 특별 처리 - 안전한 처리
    if (el.tag === 'DatePicker') {
      // granularity 안전 처리
      const getGranularity = () => {
        // includeTime이 true이면 minute로, 아니면 기본값 또는 day
        if (el.props.includeTime) {
          const g = el.props.granularity;
          return ['hour', 'minute', 'second'].includes(g) ? g : 'minute';
        } else {
          const g = el.props.granularity;
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
          label={el.props.label || 'Date Picker'}
          description={el.props.description}
          errorMessage={el.props.errorMessage}
          placeholder={el.props.placeholder}
          isDisabled={Boolean(el.props.isDisabled)}
          isRequired={Boolean(el.props.isRequired)}
          isReadOnly={Boolean(el.props.isReadOnly)}
          isInvalid={Boolean(el.props.isInvalid)}
          value={el.props.value}
          defaultValue={el.props.defaultValue}
          minValue={el.props.minValue}
          maxValue={el.props.maxValue}
          placeholderValue={el.props.placeholderValue}
          granularity={getGranularity()}
          firstDayOfWeek={getFirstDayOfWeek()}
          showCalendarIcon={el.props.showCalendarIcon !== false}
          calendarIconPosition={getCalendarIconPosition()}
          showWeekNumbers={Boolean(el.props.showWeekNumbers)}
          highlightToday={el.props.highlightToday !== false}
          allowClear={el.props.allowClear !== false}
          autoFocus={Boolean(el.props.autoFocus)}
          shouldForceLeadingZeros={el.props.shouldForceLeadingZeros !== false}
          shouldCloseOnSelect={el.props.shouldCloseOnSelect !== false}
          // 새로운 Time 관련 props 추가
          includeTime={Boolean(el.props.includeTime)}
          timeFormat={el.props.timeFormat || '24h'}
          timeLabel={el.props.timeLabel || '시간'}
          onChange={(date) => {
            const updatedProps = {
              ...el.props,
              value: date
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
        const g = el.props.granularity;
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
          label={el.props.label || 'Date Range Picker'}
          description={el.props.description}
          errorMessage={el.props.errorMessage}
          placeholder={el.props.placeholder}
          isDisabled={Boolean(el.props.isDisabled)}
          isRequired={Boolean(el.props.isRequired)}
          isReadOnly={Boolean(el.props.isReadOnly)}
          isInvalid={Boolean(el.props.isInvalid)}
          value={el.props.value}
          defaultValue={el.props.defaultValue}
          minValue={el.props.minValue}
          maxValue={el.props.maxValue}
          placeholderValue={el.props.placeholderValue}
          granularity={getGranularity()}
          firstDayOfWeek={getFirstDayOfWeek()}
          showCalendarIcon={el.props.showCalendarIcon !== false}
          calendarIconPosition={getCalendarIconPosition()}
          showWeekNumbers={Boolean(el.props.showWeekNumbers)}
          highlightToday={el.props.highlightToday !== false}
          allowClear={el.props.allowClear !== false}
          autoFocus={Boolean(el.props.autoFocus)}
          shouldForceLeadingZeros={el.props.shouldForceLeadingZeros !== false}
          shouldCloseOnSelect={el.props.shouldCloseOnSelect !== false}
          allowsNonContiguousRanges={Boolean(el.props.allowsNonContiguousRanges)}
          // 새로운 Time 관련 props 추가
          includeTime={Boolean(el.props.includeTime)}
          timeFormat={el.props.timeFormat || '24h'}
          startTimeLabel={el.props.startTimeLabel || '시작 시간'}
          endTimeLabel={el.props.endTimeLabel || '종료 시간'}
          onChange={(dateRange) => {
            const updatedProps = {
              ...el.props,
              value: dateRange
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
          variant={el.props.variant || 'default'}
          title={el.props.title}
          style={el.props.style}
          className={el.props.className}
        >
          {children.map((child) => renderElement(child))}
        </Panel>
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
          isSelected={el.props.isSelected || false}
          isDisabled={el.props.isDisabled || false}
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
          selectionMode={el.props.selectionMode || 'none'}
          selectionBehavior={el.props.selectionBehavior || 'toggle'}
          allowsDragging={el.props.allowsDragging || false}
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

    // 일반 요소 처리
    const content = [
      el.props.text && String(el.props.text),
      ...children.map((child) => renderElement(child))
    ].filter(Boolean);

    return React.createElement(el.tag, finalProps, content.length > 0 ? content : undefined);
  };

  const renderElementsTree = (): React.ReactNode => {
    const sortedRootElements = elements
      .filter((el) => !el.parent_id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    return sortedRootElements.map((el) => renderElement(el));
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
  const RootTag = rootElement.tag; // body 태그를 div로 변환하지 않음

  return React.createElement(
    RootTag,
    {
      className: styles.main,
      id: projectId || undefined,
      onMouseUp: handleGlobalClick,
      ...rootElement.props,
    },
    elements.length === 0 ? "No elements available" : renderElementsTree()
  );
}

export default Preview;