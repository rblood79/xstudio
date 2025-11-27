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
  const handleElementSelection = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const elementWithId = target.closest('[data-element-id]');

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
      const computedStyle = collectComputedStyle(elementWithId);
      messageSender.sendComputedStyle(elementId, computedStyle);
    });
  }, [elements, collectComputedStyle]);

  // 요소 선택을 위한 capture 단계 클릭 리스너
  // React Aria 컴포넌트가 이벤트를 가로채기 전에 선택을 처리
  useEffect(() => {
    const container = document.querySelector('.preview-container');
    if (!container) return;

    container.addEventListener('click', handleElementSelection, true); // capture: true
    return () => {
      container.removeEventListener('click', handleElementSelection, true);
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
    // rendererMap에서 해당 태그의 렌더러 찾기
    const renderer = rendererMap[el.tag];
    if (renderer) {
      return renderer(el, renderContext);
    }

    // 렌더러가 없으면 기본 HTML 렌더링
    const effectiveTag = el.tag === 'body' ? 'div' : el.tag;

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

    if (el.tag === 'body') {
      cleanProps['data-original-tag'] = 'body';
    }

    // 자식 콘텐츠
    const content = children.length > 0
      ? children.map((child) => renderElementInternal(child, child.id))
      : el.props?.children;

    // HTML 요소로 렌더링
    return React.createElement(
      effectiveTag.toLowerCase(),
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

      // 해당 Slot에 속하는 Page elements 찾기
      const slotChildren = pageElements.filter((pe) => {
        const peSlotName = (pe.props as { slot_name?: string })?.slot_name || 'content';
        return peSlotName === slotName && !pe.parent_id;
      }).sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      // Slot 자체를 div로 렌더링하고 내부에 Page elements 배치
      return (
        <div
          key={el.id}
          data-element-id={el.id}
          data-slot-name={slotName}
          style={el.props?.style as React.CSSProperties}
          className="preview-slot"
        >
          {slotChildren.length > 0
            ? slotChildren.map((child) => renderPageElementWithChildren(child, pageElements))
            : null}
        </div>
      );
    }

    // 일반 Layout element: 자식 재귀 렌더링
    const children = layoutElements
      .filter((child) => child.parent_id === el.id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    // body 태그는 div로 변환
    const effectiveTag = el.tag === 'body' ? 'div' : el.tag;

    // rendererMap에서 렌더러가 있으면 사용
    const renderer = rendererMap[el.tag];
    if (renderer && el.tag !== 'body') {
      return renderer(el, renderContext);
    }

    return React.createElement(
      effectiveTag.toLowerCase(),
      {
        key: el.id,
        'data-element-id': el.id,
        style: el.props?.style as React.CSSProperties,
        className: el.props?.className,
        ...(el.tag === 'body' ? { 'data-original-tag': 'body' } : {}),
      },
      children.length > 0
        ? children.map((child) => renderLayoutElement(child, layoutElements, pageElements))
        : el.props?.children
    );
  }, [renderContext]);

  // Page element와 자식들 렌더링 (Layout 모드용)
  const renderPageElementWithChildren = useCallback((el: PreviewElement, allPageElements: PreviewElement[]): React.ReactNode => {
    const children = allPageElements
      .filter((child) => child.parent_id === el.id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    // rendererMap에서 렌더러가 있으면 사용
    const renderer = rendererMap[el.tag];
    if (renderer) {
      return renderer(el, renderContext);
    }

    const effectiveTag = el.tag === 'body' ? 'div' : el.tag;

    return React.createElement(
      effectiveTag.toLowerCase(),
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
  const renderElementsTree = useCallback(() => {
    // ⭐ Page 모드에서 Layout이 적용된 경우: Layout 기반 렌더링
    // (currentPageId가 있고 currentLayoutId가 있을 때만 - Layout 모드에서는 currentPageId가 null)
    if (currentLayoutId && currentPageId) {
      const layoutElements = elements.filter((el) => el.layout_id === currentLayoutId);
      const pageElements = elements.filter((el) => el.page_id === currentPageId && !el.layout_id);

      // Layout의 root element (body) 찾기
      const layoutBody = layoutElements.find((el) => el.tag === 'body' && !el.parent_id);

      if (layoutBody) {
        const bodyChildren = layoutElements
          .filter((el) => el.parent_id === layoutBody.id)
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

        return (
          <div
            key={layoutBody.id}
            data-element-id={layoutBody.id}
            data-original-tag="body"
            style={layoutBody.props?.style as React.CSSProperties}
            className="preview-body preview-layout-body"
          >
            {bodyChildren.map((el) => renderLayoutElement(el, layoutElements, pageElements))}
          </div>
        );
      }
    }

    // ⭐ Layout이 없는 경우: 기존 방식
    const bodyElement = elements.find((el) => el.tag === 'body');

    if (bodyElement) {
      const bodyChildren = elements
        .filter((el) => el.parent_id === bodyElement.id)
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      return (
        <div
          key={bodyElement.id}
          data-element-id={bodyElement.id}
          data-original-tag="body"
          style={bodyElement.props?.style as React.CSSProperties}
          className="preview-body"
        >
          {bodyChildren.map((el) => renderElement(el, el.id))}
        </div>
      );
    }

    // body가 없으면 루트 요소들 렌더링
    const rootElements = elements
      .filter((el) => !el.parent_id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    return rootElements.map((el) => renderElement(el, el.id));
  }, [elements, renderElement, currentLayoutId, currentPageId, renderLayoutElement]);

  return (
    <div
      className="preview-container"
      style={{ width: '100%', height: '100%' }}
    >
      {elements.length === 0 ? (
        <div className="preview-empty">No elements available</div>
      ) : (
        renderElementsTree()
      )}
    </div>
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
