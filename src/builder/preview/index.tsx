import React, { useEffect, useCallback } from "react";
import { useParams } from "react-router";
import { useStore } from '../stores/elements';
import { ElementProps } from '../../types/supabase';
import styles from "./index.module.css";
import { ToggleButton } from '../components/ToggleButton';
import { ToggleButtonGroup } from '../components/ToggleButtonGroup';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
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

  const handlePreviewClick = useCallback((e: React.MouseEvent) => {
    // 클릭된 요소와 그 부모 요소들을 확인하여 data-element-id 속성을 가진 가장 가까운 요소를 찾습니다
    let target = e.target as HTMLElement;
    let elementId = null;
    let elementTag = null;
    let elementProps = null;

    // 최대 10번의 부모 요소까지 확인 (무한 루프 방지)
    for (let i = 0; i < 10 && target && !elementId; i++) {
      const id = target.getAttribute('data-element-id');
      if (id) {
        elementId = id;
        elementTag = target.tagName.toLowerCase();

        // 해당 요소의 props 찾기
        const element = elements.find(el => el.id === id);
        if (element) {
          elementProps = element.props;
          elementTag = element.tag;
        }

        break;
      }

      if (target.parentElement) {
        target = target.parentElement;
      } else {
        break;
      }
    }

    if (elementId && elementProps && elementTag) {
      e.stopPropagation();
      const rect = target.getBoundingClientRect();
      window.parent.postMessage({
        type: "ELEMENT_SELECTED",
        elementId: elementId,
        payload: { rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }, props: elementProps, tag: elementTag },
      }, window.location.origin);
    }
  }, [elements]);

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
          isDisabled={el.props.isDisabled as boolean}
        >
          {childButtons.map((child) => (
            <ToggleButton
              key={child.id}
              id={child.id}
              data-element-id={child.id}
              style={child.props.style}
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
          variant={el.props.variant as 'primary' | 'secondary' | 'surface' | 'icon'}
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
          {typeof el.props.children === 'string' ? el.props.children : 'Button'}
        </Button>
      );
    }

    // TextField 컴포넌트 특별 처리
    if (el.tag === 'TextField') {
      return (
        <TextField
          key={el.id}
          data-element-id={el.id}
          isDisabled={el.props.isDisabled as boolean}
          style={el.props.style}
          className={el.props.className}
          label={el.props.label as string}
          description={el.props.description as string}
          errorMessage={el.props.errorMessage as string}
          value={el.props.value as string}
          onChange={(value) => {
            console.log(`TextField onChange called for ${el.id}. New value:`, value);

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
        />
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
    <div className={styles.main} id={projectId || undefined} onClick={handlePreviewClick}>
      {elements.length === 0 ? "No elements available" : renderElementsTree()}
    </div>
  );
}

export default Preview;