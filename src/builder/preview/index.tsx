import React, { useEffect, useCallback, useState, useRef } from "react";
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
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);

  // 문서의 특정 요소가 마우스 아래에 있는지 확인
  const isElementUnderMouse = useCallback((e: MouseEvent, element: Element) => {
    const rect = element.getBoundingClientRect();
    return (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    );
  }, []);

  // 마우스 이동 이벤트 핸들러
  const handleDocumentMouseMove = useCallback((e: MouseEvent) => {
    if (!mainRef.current) return;

    let targetElement: Element | null = null;
    const elementsWithId = mainRef.current.querySelectorAll('[data-element-id]');

    // 마우스 아래에 있는 요소 중 가장 깊은 요소를 찾음
    elementsWithId.forEach(el => {
      if (isElementUnderMouse(e, el)) {
        // 이미 찾은 요소가 없거나, 현재 요소가 더 깊은 경우
        if (!targetElement || (targetElement && el.contains(targetElement))) {
          targetElement = el;
        }
      }
    });

    if (targetElement) {
      const htmlElement = targetElement as HTMLElement;
      const elementId = htmlElement.getAttribute('data-element-id') || null;
      setHoveredElementId(elementId);
    } else {
      setHoveredElementId(null);
    }
  }, [isElementUnderMouse]);

  // 클릭 이벤트 핸들러
  const handleDocumentClick = useCallback((e: MouseEvent) => {
    if (hoveredElementId) {
      const element = elements.find(el => el.id === hoveredElementId);
      if (!element) return;

      const targetElement = mainRef.current?.querySelector(`[data-element-id="${hoveredElementId}"]`);
      if (!targetElement) return;

      const rect = targetElement.getBoundingClientRect();

      e.stopPropagation();
      window.parent.postMessage({
        type: "ELEMENT_SELECTED",
        elementId: hoveredElementId,
        payload: { rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }, props: element.props, tag: element.tag },
      }, window.location.origin);
    }
  }, [hoveredElementId, elements]);

  // 이벤트 리스너 설정
  useEffect(() => {
    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('click', handleDocumentClick);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [handleDocumentMouseMove, handleDocumentClick]);

  // 메시지 핸들러 (기존 코드 유지)
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

  // 기존 렌더 요소 함수 유지 (onClick 제거)
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

      return children.map((child) => renderElement(child));
    }

    const children = elements
      .filter((child) => child.parent_id === el.id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    const newProps = {
      ...el.props,
      key: el.id,
      "data-element-id": el.id,
    };

    const content = [
      el.props.text && String(el.props.text),
      ...children.map((child) => renderElement(child))
    ].filter(Boolean);

    // ToggleButtonGroup 컴포넌트 처리
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

    // ToggleButton 컴포넌트 처리
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

    // Button 컴포넌트 처리
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

    // TextField 컴포넌트 처리
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

  // 오버레이 렌더링 함수
  const renderOverlay = () => {
    if (!hoveredElementId || !mainRef.current) {
      return null;
    }

    const element = mainRef.current.querySelector(`[data-element-id="${hoveredElementId}"]`);
    if (!element) {
      return null;
    }

    const rect = element.getBoundingClientRect();

    return (
      <div
        style={{
          position: 'absolute',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          border: '2px solid #60a5fa',
          pointerEvents: 'none',
          zIndex: 10000
        }}
      />
    );
  };

  const renderElementsTree = (): React.ReactNode => {
    const sortedRootElements = elements
      .filter((el) => !el.parent_id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    return sortedRootElements.map((el) => renderElement(el));
  };

  return (
    <div
      className={styles.main}
      id={projectId || undefined}
      ref={mainRef}
    >
      {elements.length === 0 ? "No elements available" : renderElementsTree()}
      {renderOverlay()}
    </div>
  );
}

export default Preview;