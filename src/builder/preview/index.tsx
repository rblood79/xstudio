import React, { useEffect, useCallback } from "react";
import { useParams } from "react-router";
import { useStore } from '../stores/elements';
import { ElementProps } from '../../types/supabase';
import styles from "./index.module.css";
import ToggleButton from '../components/ToggleButton';
import ToggleButtonGroup from '../components/ToggleButtonGroup';
import Button from '../components/Button';
//import "./index.css";

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

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.data.type === "UPDATE_ELEMENTS") {
        setElements(event.data.elements || []);
      }
      if (event.data.type === "REQUEST_UPDATE") {
        window.parent.postMessage({ type: "UPDATE_ELEMENTS", elements }, "*");
      }
      if (event.data.type === "UPDATE_THEME_TOKENS") {
        // Create or update style element
        let styleElement = document.getElementById('theme-tokens');
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'theme-tokens';
          document.head.appendChild(styleElement);
        }

        // Convert style object to CSS string
        const cssString = `:root {\n${Object.entries(event.data.styles)
          .map(([key, value]) => `  ${key}: ${value};`)
          .join('\n')}\n}`;

        styleElement.textContent = cssString;
      }
    },
    [elements, setElements]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  document.documentElement.classList.add(styles.root);

  const renderElement = (el: PreviewElement): React.ReactNode => {
    // body 태그인 경우 자식 요소들만 렌더링하고 실제 body에 속성들 추가
    if (el.tag === "body") {
      const children = elements
        .filter((child) => child.parent_id === el.id)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      // 실제 body 태그에 data-element-id, props, onClick 이벤트 추가
      document.body.setAttribute("data-element-id", el.id);

      // props 적용
      if (el.props.style) {
        Object.assign(document.body.style, el.props.style);
      }

      // 다른 props들도 적용 (style 제외)
      Object.entries(el.props).forEach(([key, value]) => {
        if (key !== 'style' && key !== 'text' && value !== undefined && value !== null) {
          document.body.setAttribute(key, String(value));
        }
      });

      document.body.onclick = (e: MouseEvent) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        window.parent.postMessage({
          type: "ELEMENT_SELECTED",
          elementId: el.id,
          payload: { rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }, props: el.props, tag: el.tag },
        }, window.location.origin);
      };

      return children.map((child) => renderElement(child));
    }

    const children = elements
      .filter((child) => child.parent_id === el.id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    const newProps = {
      ...el.props,
      key: el.id,
      "data-element-id": el.id,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        window.parent.postMessage({
          type: "ELEMENT_SELECTED",
          elementId: el.id,
          payload: { rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }, props: el.props, tag: el.tag },
        }, window.location.origin);
      },
    };

    const content = [
      el.props.text && String(el.props.text),
      ...children.map((child) => renderElement(child))
    ].filter(Boolean);

    // ToggleButtonGroup 컴포넌트 특별 처리
    if (el.tag === 'ToggleButtonGroup') {
      const currentValue = el.props.value as string[] || [];
      const childButtons = children.filter(child => child.tag === 'ToggleButton');
      const orientation = el.props.orientation as 'horizontal' | 'vertical';

      return (
        <ToggleButtonGroup
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          orientation={orientation}
          selectionMode={el.props.selectionMode as 'single' | 'multiple'}
          value={currentValue}
          defaultValue={el.props.defaultValue as string[]}
          isDisabled={el.props.isDisabled as boolean}
          onChange={(value) => {
            console.log(`ToggleButtonGroup onChange called for ${el.id}. New value:`, value);

            window.parent.postMessage(
              {
                type: 'element-props-update',
                elementId: el.id,
                props: {
                  ...el.props,
                  value
                }
              },
              '*'
            );
          }}
        >
          {childButtons.map((child, index) => (
            <ToggleButton
              key={child.id}
              id={child.id}
              data-element-id={child.id}
              style={child.props.style}
              className={`
                ${child.props.className || ''} 
                rounded-none 
                ${index === 0 && orientation === 'horizontal' ? 'rounded-l-md' : ''}
                ${index === childButtons.length - 1 && orientation === 'horizontal' ? 'rounded-r-md' : ''}
                ${index === 0 && orientation === 'vertical' ? 'rounded-t-md' : ''}
                ${index === childButtons.length - 1 && orientation === 'vertical' ? 'rounded-b-md' : ''}
                ${index !== 0 && orientation === 'horizontal' ? '-ml-[1px]' : ''}
                ${index !== 0 && orientation === 'vertical' ? '-mt-[1px]' : ''}
              `}
            >
              {typeof child.props.text === 'string' ? child.props.text : ''}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      );
    }

    // ToggleButton 컴포넌트 특별 처리 (ToggleButtonGroup 외부에 있는 경우)
    if (el.tag === 'ToggleButton') {
      const currentIsSelected = el.props.isSelected as boolean;

      return (
        <ToggleButton
          key={el.id}
          id={el.id}
          data-element-id={el.id}
          isSelected={currentIsSelected}
          defaultSelected={el.props.defaultSelected as boolean}
          style={el.props.style}
          className={el.props.className}
          onChange={(isSelected) => {
            console.log(`ToggleButton onChange called for ${el.id}. New isSelected: ${isSelected}`);

            const updatedProps = {
              ...el.props,
              isSelected: isSelected
            };

            // Store 업데이트
            updateElementProps(el.id, updatedProps);

            // 부모 창에 메시지 전송
            window.parent.postMessage(
              {
                type: 'element-props-update',
                elementId: el.id,
                props: updatedProps
              },
              '*'
            );
          }}
        >
          {typeof el.props.text === 'string' ? el.props.text : ''}
        </ToggleButton>
      );
    }

    // Button 컴포넌트 특별 처리
    if (el.tag === 'Button') {
      return (
        <Button
          key={el.id}
          data-element-id={el.id}
          isDisabled={el.props.isDisabled as boolean}
          style={el.props.style}
          className={el.props.className}
          onPress={() => {
            console.log(`Button onPress called for ${el.id}`);

            window.parent.postMessage(
              {
                type: 'element-click',
                elementId: el.id,
              },
              '*'
            );
          }}
        >
          {typeof el.props.text === 'string' ? el.props.text : 'Button'}
        </Button>
      );
    }

    return React.createElement(el.tag, newProps, content.length > 0 ? content : undefined);
  };

  const renderElementsTree = (): React.ReactNode => {
    const sortedRootElements = elements
      .filter((el) => !el.parent_id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    return sortedRootElements.map((el) => renderElement(el));
  };

  return (
    <div className={styles.main} id={projectId || undefined}>
      {elements.length === 0 ? "No elements available" : renderElementsTree()}
    </div>
  );
}

export default Preview;