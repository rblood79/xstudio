/**
 * Preview App - Preview Runtime 메인 컴포넌트
 *
 * srcdoc iframe 내에서 독립적으로 실행되는 Preview 앱입니다.
 * Builder와 완전히 분리된 React 앱으로 동작합니다.
 */

import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { usePreviewStore, getPreviewStore } from './store';
import { PreviewRouter, setGlobalNavigate } from './router';
import { MessageHandler, messageSender } from './messaging';
import type { PreviewElement as StorePreviewElement } from './store/types';
import { useNavigate } from 'react-router-dom';
import { rendererMap } from './renderers';
import type { PreviewElement, RenderContext } from './types';
import { EventEngine } from '../utils/events/eventEngine';

// ============================================
// Preview Content Component
// ============================================

function PreviewContent() {
  const elements = usePreviewStore((s) => s.elements) as PreviewElement[];
  const updateElementProps = usePreviewStore((s) => s.updateElementProps);
  const setElements = usePreviewStore((s) => s.setElements);
  const currentLayoutId = usePreviewStore((s) => s.currentLayoutId);
  const currentPageId = usePreviewStore((s) => s.currentPageId);
  const navigate = useNavigate();

  // EventEngine 인스턴스 (싱글톤)
  const eventEngineRef = useRef<EventEngine | null>(null);
  if (!eventEngineRef.current) {
    eventEngineRef.current = new EventEngine();
  }

  // navigate 함수를 전역으로 설정 (EventEngine에서 사용)
  useEffect(() => {
    setGlobalNavigate(navigate);
  }, [navigate]);

  // ⭐ 이전에 적용된 body 스타일 키들을 추적
  const appliedStyleKeysRef = useRef<Set<string>>(new Set());
  const appliedClassNameRef = useRef<string>('');

  // ⭐ 실제 <body> 태그에 body element의 속성 적용 (가짜 body div 제거)
  useEffect(() => {
    // ⭐ 이전 스타일 제거 (Layout 변경 시 이전 Layout의 스타일 정리)
    appliedStyleKeysRef.current.forEach((key) => {
      document.body.style.removeProperty(key);
    });
    appliedStyleKeysRef.current.clear();

    // ⭐ 이전 className 제거
    if (appliedClassNameRef.current) {
      const currentClasses = document.body.className.split(' ');
      const classesToRemove = appliedClassNameRef.current.split(' ');
      document.body.className = currentClasses
        .filter((cls) => !classesToRemove.includes(cls))
        .join(' ')
        .trim();
      appliedClassNameRef.current = '';
    }

    // body element 찾기 (Layout body 또는 Page body)
    let bodyElement: PreviewElement | undefined;

    if (currentLayoutId && currentPageId) {
      // Layout 모드: Layout의 body 사용
      bodyElement = elements.find((el) => el.tag === 'body' && el.layout_id === currentLayoutId && !el.parent_id);
    } else if (currentLayoutId && !currentPageId) {
      // Layout 편집 모드: Layout의 body 사용
      bodyElement = elements.find((el) => el.tag === 'body' && el.layout_id === currentLayoutId && !el.parent_id);
    } else {
      // Page 모드: Page의 body 사용 (Layout 없음)
      bodyElement = elements.find((el) => el.tag === 'body' && !el.parent_id && !el.layout_id);
    }

    if (bodyElement) {
      // 실제 <body> 태그에 data-element-id 설정
      document.body.setAttribute('data-element-id', bodyElement.id);
      document.body.setAttribute('data-original-tag', 'body');

      // body element의 style 적용 및 추적
      if (bodyElement.props?.style) {
        const style = bodyElement.props.style as Record<string, string>;
        Object.entries(style).forEach(([key, value]) => {
          const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase(); // camelCase → kebab-case
          document.body.style.setProperty(cssKey, value);
          appliedStyleKeysRef.current.add(cssKey);
        });
      }

      // body element의 className 적용 및 추적
      if (bodyElement.props?.className) {
        const newClassName = bodyElement.props.className as string;
        document.body.className = `${document.body.className} ${newClassName}`.trim();
        appliedClassNameRef.current = newClassName;
      }
    } else {
      // body element가 없으면 data-element-id 제거
      document.body.removeAttribute('data-element-id');
      document.body.removeAttribute('data-original-tag');
    }

    // Cleanup: 컴포넌트 언마운트 시 정리
    return () => {
      document.body.removeAttribute('data-element-id');
      document.body.removeAttribute('data-original-tag');
      // ⭐ 스타일과 className도 정리
      appliedStyleKeysRef.current.forEach((key) => {
        document.body.style.removeProperty(key);
      });
      appliedStyleKeysRef.current.clear();
      if (appliedClassNameRef.current) {
        const currentClasses = document.body.className.split(' ');
        const classesToRemove = appliedClassNameRef.current.split(' ');
        document.body.className = currentClasses
          .filter((cls) => !classesToRemove.includes(cls))
          .join(' ')
          .trim();
        appliedClassNameRef.current = '';
      }
    };
  }, [elements, currentLayoutId, currentPageId]);

  // Computed style 수집
  const collectComputedStyle = useCallback((domElement: Element): Record<string, string> => {
    const computed = window.getComputedStyle(domElement);
    return {
      display: computed.display,
      width: computed.width,
      height: computed.height,
      position: computed.position,
      flexDirection: computed.flexDirection,
      justifyContent: computed.justifyContent,
      alignItems: computed.alignItems,
      gap: computed.gap,
      padding: computed.padding,
      paddingTop: computed.paddingTop,
      paddingRight: computed.paddingRight,
      paddingBottom: computed.paddingBottom,
      paddingLeft: computed.paddingLeft,
      margin: computed.margin,
      marginTop: computed.marginTop,
      marginRight: computed.marginRight,
      marginBottom: computed.marginBottom,
      marginLeft: computed.marginLeft,
      backgroundColor: computed.backgroundColor,
      color: computed.color,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      borderRadius: computed.borderRadius,
    };
  }, []);

  // 클릭 핸들러 (capture 단계에서 실행)
  // ⭐ 실제 <body> 태그 클릭도 처리
  const handleElementSelection = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // ⭐ body 클릭 처리: target이 body이거나 closest로 body를 찾음
    let elementWithId = target.closest('[data-element-id]');

    // target이 body인 경우 (body의 빈 영역 클릭)
    if (!elementWithId && target === document.body && document.body.hasAttribute('data-element-id')) {
      elementWithId = document.body;
    }

    if (!elementWithId) return;

    const elementId = elementWithId.getAttribute('data-element-id');
    if (!elementId) return;

    const element = elements.find((el) => el.id === elementId);
    if (!element) return;

    const isMultiSelect = e.metaKey || e.ctrlKey;
    const rect = elementWithId.getBoundingClientRect();

    // 선택 알림 전송
    messageSender.sendElementSelected(
      elementId,
      {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      {
        isMultiSelect,
        props: element.props,
        style: element.props?.style as Record<string, unknown>,
      }
    );

    // Computed style 전송 (RAF로 지연)
    requestAnimationFrame(() => {
      const computedStyle = collectComputedStyle(elementWithId!);
      messageSender.sendComputedStyle(elementId, computedStyle);
    });
  }, [elements, collectComputedStyle]);

  // 요소 선택을 위한 capture 단계 클릭 리스너
  // ⭐ document에 등록하여 body 클릭도 캡처
  // React Aria 컴포넌트가 이벤트를 가로채기 전에 선택을 처리
  useEffect(() => {
    // document에 등록하여 body 클릭도 캡처 가능
    document.addEventListener('click', handleElementSelection, true); // capture: true
    return () => {
      document.removeEventListener('click', handleElementSelection, true);
    };
  }, [handleElementSelection]);

  // 링크 클릭 가로채기
  const handleLinkClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');

    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // target="_blank"는 기본 동작 허용
    if (anchor.getAttribute('target') === '_blank') return;

    // 앵커 링크는 기본 동작 허용
    if (href.startsWith('#')) return;

    // 외부 URL 패턴
    const externalUrlPattern = /^(https?:\/\/|\/\/|mailto:|tel:|javascript:)/i;
    const isExternal = externalUrlPattern.test(href);

    e.preventDefault();
    e.stopPropagation();

    if (isExternal) {
      // 외부 링크: 새 탭에서 열기
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      // 내부 링크: MemoryRouter로 직접 네비게이션
      navigate(href);
    }
  }, [navigate]);

  // 링크 클릭 리스너 등록
  useEffect(() => {
    document.addEventListener('click', handleLinkClick, true);
    return () => {
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [handleLinkClick]);

  // RenderContext 생성
  const renderContext: RenderContext = useMemo(() => ({
    elements,
    updateElementProps,
    setElements: (newElements: PreviewElement[]) => {
      setElements(newElements as StorePreviewElement[]);
    },
    eventEngine: eventEngineRef.current!,
    renderElement: (el: PreviewElement, key?: string) => renderElementInternal(el, key),
  }), [elements, updateElementProps, setElements]);

  // Element 렌더링 함수 (내부)
  const renderElementInternal = useCallback((el: PreviewElement, key?: string): React.ReactNode => {
    // ⭐ body 태그는 실제 <body>에서 처리되므로 여기에 도달하면 일반 요소임
    // (body는 renderElementsTree에서 자식만 렌더링하도록 처리됨)

    // rendererMap에서 해당 태그의 렌더러 찾기
    const renderer = rendererMap[el.tag];
    if (renderer) {
      return renderer(el, renderContext);
    }

    // 렌더러가 없으면 기본 HTML 렌더링

    // 자식 요소 찾기
    const children = elements
      .filter((child) => child.parent_id === el.id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    // Props 정리
    const cleanProps: Record<string, unknown> = {
      key: key || el.id,
      'data-element-id': el.id,
      style: el.props?.style,
      className: el.props?.className,
    };

    // 자식 콘텐츠
    const content = children.length > 0
      ? children.map((child) => renderElementInternal(child, child.id))
      : el.props?.children;

    // HTML 요소로 렌더링
    return React.createElement(
      el.tag.toLowerCase(),
      cleanProps,
      content
    );
  }, [elements, renderContext]);

  // 외부에서 사용할 renderElement (context 포함)
  const renderElement = useCallback((el: PreviewElement, key?: string): React.ReactNode => {
    return renderElementInternal(el, key);
  }, [renderElementInternal]);

  // ⭐ Layout 기반 렌더링: Slot을 Page elements로 교체
  const renderLayoutElement = useCallback((el: PreviewElement, layoutElements: PreviewElement[], pageElements: PreviewElement[]): React.ReactNode => {
    // Slot인 경우: Page elements로 교체
    if (el.tag === 'Slot') {
      const slotName = (el.props as { name?: string })?.name || 'content';

      // ⭐ Page의 body 찾기 (body는 렌더링하지 않고 자식만 사용)
      const pageBody = pageElements.find((pe) => pe.tag === 'body' && !pe.parent_id);

      // ⭐ Slot에 들어갈 실제 콘텐츠: body의 자식들
      // body는 렌더링하지 않음 - body 스타일은 Layout의 body가 document.body에 적용됨
      let slotContent: PreviewElement[] = [];

      if (pageBody) {
        // Page body의 자식들을 Slot에 배치
        slotContent = pageElements
          .filter((pe) => pe.parent_id === pageBody.id)
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
      } else {
        // body가 없으면 기존 로직 (slot_name으로 찾기, body 제외)
        slotContent = pageElements.filter((pe) => {
          if (pe.tag === 'body') return false; // body는 제외
          const peSlotName = (pe.props as { slot_name?: string })?.slot_name || 'content';
          return peSlotName === slotName && !pe.parent_id;
        }).sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
      }

      // Slot 자체를 div로 렌더링하고 내부에 Page elements 배치
      return (
        <div
          key={el.id}
          data-element-id={el.id}
          data-slot-name={slotName}
          style={el.props?.style as React.CSSProperties}
          className="preview-slot"
        >
          {slotContent.length > 0
            ? slotContent.map((child) => renderPageElementWithChildren(child, pageElements))
            : null}
        </div>
      );
    }

    // ⭐ body 태그는 실제 <body>에서 처리되므로 자식만 렌더링 (이미 renderElementsTree에서 처리됨)
    // 여기에 도달하면 body가 아닌 일반 요소임

    // 일반 Layout element: 자식 재귀 렌더링
    const children = layoutElements
      .filter((child) => child.parent_id === el.id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    // rendererMap에서 렌더러가 있으면 사용
    const renderer = rendererMap[el.tag];
    if (renderer) {
      return renderer(el, renderContext);
    }

    return React.createElement(
      el.tag.toLowerCase(),
      {
        key: el.id,
        'data-element-id': el.id,
        style: el.props?.style as React.CSSProperties,
        className: el.props?.className,
      },
      children.length > 0
        ? children.map((child) => renderLayoutElement(child, layoutElements, pageElements))
        : el.props?.children
    );
  }, [renderContext]);

  // Page element와 자식들 렌더링 (Layout 모드용)
  // ⭐ 주의: body 요소는 이 함수에 전달되지 않음 (renderLayoutElement에서 body의 자식만 전달)
  const renderPageElementWithChildren = useCallback((el: PreviewElement, allPageElements: PreviewElement[]): React.ReactNode => {
    const children = allPageElements
      .filter((child) => child.parent_id === el.id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    // rendererMap에서 렌더러가 있으면 사용
    const renderer = rendererMap[el.tag];
    if (renderer) {
      return renderer(el, renderContext);
    }

    return React.createElement(
      el.tag.toLowerCase(),
      {
        key: el.id,
        'data-element-id': el.id,
        style: el.props?.style as React.CSSProperties,
        className: el.props?.className,
      },
      children.length > 0
        ? children.map((child) => renderPageElementWithChildren(child, allPageElements))
        : el.props?.children
    );
  }, [renderContext]);

  // Elements 트리 렌더링
  // ⭐ 실제 <body> 태그를 사용하므로 body element를 div로 렌더링하지 않고 자식만 렌더링
  const renderElementsTree = useCallback(() => {
    // ⭐ Page 모드에서 Layout이 적용된 경우: Layout 기반 렌더링
    // (currentPageId가 있고 currentLayoutId가 있을 때만 - Layout 모드에서는 currentPageId가 null)
    if (currentLayoutId && currentPageId) {
      const layoutElements = elements.filter((el) => el.layout_id === currentLayoutId);
      const pageElements = elements.filter((el) => el.page_id === currentPageId && !el.layout_id);

      // Layout의 root element (body) 찾기
      const layoutBody = layoutElements.find((el) => el.tag === 'body' && !el.parent_id);

      if (layoutBody) {
        // ⭐ body를 div로 렌더링하지 않고 자식들만 직접 렌더링
        // body의 속성은 useEffect에서 실제 <body> 태그에 적용됨
        const bodyChildren = layoutElements
          .filter((el) => el.parent_id === layoutBody.id)
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

        return (
          <>
            {bodyChildren.map((el) => renderLayoutElement(el, layoutElements, pageElements))}
          </>
        );
      }
    }

    // ⭐ Layout 편집 모드 (currentLayoutId만 있고 currentPageId 없음)
    if (currentLayoutId && !currentPageId) {
      const layoutElements = elements.filter((el) => el.layout_id === currentLayoutId);
      const layoutBody = layoutElements.find((el) => el.tag === 'body' && !el.parent_id);

      if (layoutBody) {
        const bodyChildren = layoutElements
          .filter((el) => el.parent_id === layoutBody.id)
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

        return (
          <>
            {bodyChildren.map((el) => renderElement(el, el.id))}
          </>
        );
      }
    }

    // ⭐ Layout이 없는 경우 (Page만 있음)
    const bodyElement = elements.find((el) => el.tag === 'body' && !el.parent_id);

    if (bodyElement) {
      // ⭐ body를 div로 렌더링하지 않고 자식들만 직접 렌더링
      // body의 속성은 useEffect에서 실제 <body> 태그에 적용됨
      const bodyChildren = elements
        .filter((el) => el.parent_id === bodyElement.id)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      return (
        <>
          {bodyChildren.map((el) => renderElement(el, el.id))}
        </>
      );
    }

    // body가 없으면 루트 요소들 렌더링
    const rootElements = elements
      .filter((el) => !el.parent_id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    return rootElements.map((el) => renderElement(el, el.id));
  }, [elements, renderElement, currentLayoutId, currentPageId, renderLayoutElement]);

  // ⭐ React가 document.body에 직접 마운트되므로 preview-container 불필요
  // body element의 자식들이 직접 <body> 안에 렌더링됨
  return (
    <>
      {elements.length === 0 ? (
        <div className="preview-empty">No elements available</div>
      ) : (
        renderElementsTree()
      )}
    </>
  );
}

// ============================================
// Preview App Component
// ============================================

export function PreviewApp() {
  const [isInitialized, setIsInitialized] = useState(false);
  const messageHandlerRef = useRef<MessageHandler | null>(null);

  // 스토어에서 필요한 함수들 가져오기
  const store = getPreviewStore();

  // MessageHandler 초기화
  useEffect(() => {
    const storeState = store.getState();

    messageHandlerRef.current = new MessageHandler({
      setElements: storeState.setElements,
      updateElementProps: storeState.updateElementProps,
      setThemeVars: storeState.setThemeVars,
      setDarkMode: storeState.setDarkMode,
      setCurrentPageId: storeState.setCurrentPageId,
      setCurrentLayoutId: storeState.setCurrentLayoutId,
      setPages: storeState.setPages,
      setDataSources: storeState.setDataSources,
      setAuthToken: storeState.setAuthToken,
      setReady: storeState.setReady,
    });

    // postMessage 리스너 등록
    const handleMessage = (event: MessageEvent) => {
      messageHandlerRef.current?.handle(event);
    };

    window.addEventListener('message', handleMessage);

    // Preview 준비 완료 알림
    messageSender.sendReady();
    setIsInitialized(true);

    console.log('[PreviewApp] Initialized and ready');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [store]);

  // 렌더링 함수 (PreviewRouter에 전달)
  const renderElements = useCallback(() => {
    return <PreviewContent />;
  }, []);

  if (!isInitialized) {
    return (
      <div className="preview-loading">
        Initializing Preview...
      </div>
    );
  }

  return (
    <PreviewRouter renderElements={renderElements}>
      {/* 추가 오버레이나 UI 요소는 여기에 */}
    </PreviewRouter>
  );
}

export default PreviewApp;
