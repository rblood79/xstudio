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
import type { PreviewElement } from './store/types';
import { useNavigate } from 'react-router-dom';

// ============================================
// Element Renderer (기존 Preview 로직 재사용)
// ============================================

interface RenderContext {
  elements: PreviewElement[];
  renderElement: (el: PreviewElement, key?: string) => React.ReactNode;
}

// ============================================
// Preview Content Component
// ============================================

function PreviewContent() {
  const elements = usePreviewStore((s) => s.elements);
  const navigate = useNavigate();

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

  // 클릭 핸들러
  const handleClick = useCallback((e: React.MouseEvent) => {
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

  // Element 렌더링 함수
  const renderElement = useCallback((el: PreviewElement, key?: string): React.ReactNode => {
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
      ? children.map((child) => renderElement(child, child.id))
      : el.props?.children;

    // HTML 요소로 렌더링
    return React.createElement(
      effectiveTag.toLowerCase(),
      cleanProps,
      content
    );
  }, [elements]);

  // Elements 트리 렌더링
  const renderElementsTree = useCallback(() => {
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
  }, [elements, renderElement]);

  return (
    <div
      className="preview-container"
      onClick={handleClick}
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
