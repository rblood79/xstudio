import React, { useEffect, useCallback } from "react";
import { useParams } from "react-router";
import { useStore } from '../stores/elements';
import { ElementProps } from '../../types/supabase';
import styles from "./index.module.css";
import { ToggleButton, ToggleButtonGroup, Button, TextField, Label, Input, Description, FieldError } from '../components/list';

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
  const { setElements } = useStore();

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
    const children = elements
      .filter((child) => child.parent_id === el.id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    // body 태그를 div로 대체
    const tag = el.tag === 'body' ? 'div' : el.tag;

    // 요소 클릭 핸들러를 직접 추가
    // const handleElementClick = (e: React.MouseEvent) => {
    //   e.stopPropagation();
    //   e.preventDefault();

    //   const target = e.currentTarget as HTMLElement;
    //   const elementId = target.getAttribute('data-element-id');
    //   if (!elementId) return;

    //   const rect = target.getBoundingClientRect();
    //   window.parent.postMessage({
    //     type: "ELEMENT_SELECTED",
    //     elementId: elementId,
    //     payload: {
    //       rect: {
    //         top: rect.top,
    //         left: rect.left,
    //         width: rect.width,
    //         height: rect.height
    //       },
    //       props: el.props,
    //       tag: el.tag
    //     },
    //   }, window.location.origin);
    // };

    const newProps = {
      ...el.props,
      key: el.id,
      "data-element-id": el.id,
      //onClick: handleElementClick,
    };

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



    // TextField 컴포넌트 특별 처리
    if (el.tag === 'TextField') {
      const childElements = children.filter(child =>
        ['Label', 'Input', 'Description', 'FieldError'].includes(child.tag)
      );

      // Find specific child elements by tag
      const labelElement = childElements.find(child => child.tag === 'Label');
      // const inputElement = childElements.find(child => child.tag === 'Input');
      const descriptionElement = childElements.find(child => child.tag === 'Description');
      const errorElement = childElements.find(child => child.tag === 'FieldError');

      return (
        <TextField
          key={el.id}
          data-element-id={el.id}
          style={el.props.style}
          className={el.props.className}
          label={labelElement ? `${labelElement.props.text as string}` : ''}
          description={descriptionElement ? `${descriptionElement.props.text as string}` : ''}
          errorMessage={errorElement ? `${errorElement.props.text as string}` : ''}
          isDisabled={el.props.isDisabled as boolean}
          children={childElements.map((child) => renderElement(child))}
        >
        </TextField>
      );
    }

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
        >
          {childButtons.map((child) => renderElement(child))}
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
          defaultSelected={false}
          isDisabled={el.props.isDisabled as boolean}
          style={el.props.style}
          className={el.props.className}
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
        >
          {typeof el.props.children === 'string' ? el.props.children : 'Button'}
        </Button>
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