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
} from '../components/list';


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

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object' || !data.type) return;

      if (data.type === 'UPDATE_ELEMENTS') {
        setElements(data.elements || []);
      }

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
    []
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

  const renderElement = (el: PreviewElement): React.ReactNode => {
    const children = elements
      .filter((child) => child.parent_id === el.id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    // body 태그를 div로 대체
    const tag = el.tag === 'body' ? 'div' : el.tag;

    const newProps = {
      ...el.props,
      key: el.id,
      "data-element-id": el.id,
    };

    // ToggleButton 렌더링 함수
    const renderToggleButton = (button: PreviewElement, parentGroup?: PreviewElement) => {
      const isInGroup = parentGroup?.tag === 'ToggleButtonGroup';

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
          {typeof button.props.children === 'string' ? button.props.children : ''}
        </ToggleButton>
      );
    };

    // ToggleButtonGroup 컴포넌트 특별 처리
    if (el.tag === 'ToggleButtonGroup') {
      const orientation = el.props.orientation as 'horizontal' | 'vertical';
      const buttonsData = el.props.children || []; // children 배열 사용

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
          {buttonsData.map((buttonData: any, index: number) => (
            <ToggleButton
              key={buttonData.id || `toggle-${index}`}
              data-element-id={`${el.id}-toggle-${index}`}
              isSelected={buttonData.isSelected || false}
              onPress={() => {
                const updatedChildren = [...buttonsData];

                if (el.props.selectionMode === 'multiple') {
                  updatedChildren[index] = {
                    ...updatedChildren[index],
                    isSelected: !updatedChildren[index].isSelected
                  };
                } else {
                  updatedChildren.forEach((btn, i) => {
                    updatedChildren[i] = {
                      ...btn,
                      isSelected: i === index ? !btn.isSelected : false
                    };
                  });
                }

                const updatedProps = {
                  ...el.props,
                  children: updatedChildren
                };
                updateElementProps(el.id, updatedProps);
              }}
            >
              {buttonData.title || `Option ${index + 1}`}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      );
    }

    // 단독 ToggleButton 컴포넌트 특별 처리
    if (el.tag === 'ToggleButton') {
      return renderToggleButton(el);
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
          {typeof el.props.children === 'string' ? el.props.children : 'Checkbox'}
        </Checkbox>
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
          {typeof el.props.text === 'string' ? el.props.text : 'Label'}
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
          {typeof el.props.text === 'string' ? el.props.text : 'Description'}
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
          {typeof el.props.text === 'string' ? el.props.text : 'FieldError'}
        </FieldError>
      );
    }

    // CheckboxGroup 컴포넌트 특별 처리
    if (el.tag === 'CheckboxGroup') {
      const checkboxesData = el.props.children || [];

      // isSelected: true인 체크박스들의 ID를 value 배열로 생성
      const selectedValues = checkboxesData
        .filter((checkbox: any) => checkbox.isSelected)
        .map((checkbox: any) => checkbox.id);

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
            // 동시에 개별 체크박스의 isSelected도 동기화
            const updatedChildren = checkboxesData.map((checkbox: any) => ({
              ...checkbox,
              isSelected: newSelectedValues.includes(checkbox.id)
            }));

            const updatedProps = {
              ...el.props,
              value: newSelectedValues, // value 배열도 저장
              children: updatedChildren
            };
            updateElementProps(el.id, updatedProps);
          }}
        >
          {checkboxesData.map((checkboxData: any, index: number) => (
            <Checkbox
              key={checkboxData.id || `checkbox-${index}`}
              data-element-id={`${el.id}-checkbox-${index}`}
              value={checkboxData.id} // CheckboxGroup이 어떤 체크박스인지 식별할 수 있도록
            >
              {checkboxData.label || `Option ${index + 1}`}
            </Checkbox>
          ))}
        </CheckboxGroup>
      );
    }

    // RadioGroup 컴포넌트 특별 처리
    if (el.tag === 'RadioGroup') {
      const radiosData = el.props.children || [];

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
          }}
        >
          {radiosData.map((radioData: any, index: number) => (
            <Radio
              key={radioData.id || `radio-${index}`}
              data-element-id={`${el.id}-radio-${index}`}
              value={radioData.value}
            >
              {radioData.label || `Option ${index + 1}`}
            </Radio>
          ))}
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

    // Button 컴포넌트 특별 처리
    if (el.tag === 'Button') {
      return (
        <Button
          key={el.id}
          data-element-id={el.id}
          isDisabled={el.props.isDisabled as boolean}
          variant={el.props.variant as 'primary' | 'secondary' | 'surface' | 'icon'}
          style={el.props.style}
          className={el.props.className}
        >
          {typeof el.props.children === 'string' ? el.props.children : 'Button'}
        </Button>
      );
    }

    // GridList 컴포넌트 특별 처리
    if (el.tag === 'GridList') {
      const itemsData = el.props.children || [];

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
          {itemsData.map((item: any, index: number) => (
            <GridListItem
              key={item.id || `griditem-${index}`}
              value={item.value}
              isDisabled={item.isDisabled}
            >
              {item.label}
            </GridListItem>
          ))}
        </GridList>
      );
    }

    // ListBox 컴포넌트 특별 처리
    if (el.tag === 'ListBox') {
      const itemsData = el.props.children || [];

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
          {itemsData.map((item: any, index: number) => (
            <ListBoxItem
              key={item.id || `listitem-${index}`}
              value={item.value}
              isDisabled={item.isDisabled}
            >
              {item.label}
            </ListBoxItem>
          ))}
        </ListBox>
      );
    }

    // Select 컴포넌트 특별 처리
    if (el.tag === 'Select') {
      const itemsData = el.props.children || [];

      return (
        <Select
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
              key={item.id || `selectitem-${index}`}
              value={item.value}
              isDisabled={item.isDisabled}
            >
              {item.label}
            </ListBoxItem>
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
      // Tabs의 실제 Panel 자식들을 찾기
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
            {el.props.children?.map((tab: any) => (
              <Tab key={tab.id} id={tab.id}>
                {tab.title}
              </Tab>
            ))}
          </TabList>

          {/* 실제 Panel 컴포넌트들을 TabPanel로 래핑하여 렌더링 */}
          {panelChildren.map((panel) => {
            const correspondingTab = el.props.children?.[panel.props.tabIndex || 0];
            return (
              <TabPanel key={panel.id} id={correspondingTab?.id || `tab-${panel.props.tabIndex || 0}`}>
                {renderElement(panel)} {/* Panel 컴포넌트와 그 하위 요소들 렌더링 */}
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
        </Tag>
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

    // 일반 요소 처리
    const content = [
      el.props.text && String(el.props.text),
      ...children.map((child) => renderElement(child))
    ].filter(Boolean);

    return React.createElement(tag, newProps, content.length > 0 ? content : undefined);
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
  const RootTag = rootElement.tag === 'body' ? 'div' : rootElement.tag;

  return React.createElement(
    RootTag,
    {
      className: styles.main,
      id: projectId || undefined,
      onMouseUp: handleGlobalClick,
      ...rootElement.props,
      // If the root element was a body tag, apply its props to the actual body element
      ...(rootElement.tag === 'body' ? {
        //style: { ...document.body.style, ...(rootElement.props.style || {}) },
        className: `${styles.main} ${rootElement.props.className || ''}`,
      } : {}),
    },
    elements.length === 0 ? "No elements available" : renderElementsTree()
  );
}

export default Preview;