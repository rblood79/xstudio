/**
 * Workflow Page Summary
 *
 * 워크플로우 오버레이에서 페이지가 포커스되면 우상단에 요약 정보를 표시한다.
 * - 페이지 이름, slug
 * - 요소 수
 * - 나가는 링크 (navigation targets)
 * - 레이아웃 이름
 * - 데이터 소스
 */

import React, { useMemo } from 'react';
import { useStore } from '../../stores';
import { useLayoutsStore } from '../../stores/layouts';

// ============================================
// Styles
// ============================================

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 48,
  right: 16,
  zIndex: 10,
  width: 240,
  padding: 12,
  background: 'rgba(17, 24, 39, 0.80)',
  backdropFilter: 'blur(8px)',
  borderRadius: 10,
  border: '1px solid rgba(75, 85, 99, 0.3)',
  pointerEvents: 'auto',
  fontSize: 11,
  color: '#e5e7eb',
};

const titleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#f9fafb',
  marginBottom: 4,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const slugStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#9ca3af',
  marginBottom: 10,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '3px 0',
};

const labelStyle: React.CSSProperties = {
  color: '#9ca3af',
  flexShrink: 0,
};

const valueStyle: React.CSSProperties = {
  color: '#e5e7eb',
  textAlign: 'right',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 140,
};

const linkListStyle: React.CSSProperties = {
  color: '#93c5fd',
  textAlign: 'right',
  fontSize: 10,
  maxWidth: 140,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const dividerStyle: React.CSSProperties = {
  borderTop: '1px solid rgba(75, 85, 99, 0.3)',
  margin: '6px 0',
};

// ============================================
// SummaryRow
// ============================================

interface SummaryRowProps {
  label: string;
  value: React.ReactNode;
}

const SummaryRow: React.FC<SummaryRowProps> = ({ label, value }) => (
  <div style={rowStyle}>
    <span style={labelStyle}>{label}</span>
    <span style={valueStyle}>{value}</span>
  </div>
);

// ============================================
// Helpers
// ============================================

/** slug 정규화 (workflowEdges.ts 패턴 참조) */
function normalizeSlug(slug?: string | null): string {
  if (!slug) return '';
  return slug
    .split(/[?#]/)[0]
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

/** navigable 태그인지 확인 */
function isNavigableTag(tag: string): boolean {
  const lower = tag.toLowerCase();
  return lower === 'link' || lower === 'a' || lower === 'button';
}

// ============================================
// Component
// ============================================

export const WorkflowPageSummary: React.FC = () => {
  const showOverlay = useStore((s) => s.showWorkflowOverlay);
  const focusedPageId = useStore((s) => s.workflowFocusedPageId);
  const pages = useStore((s) => s.pages);
  const elements = useStore((s) => s.elements);
  const layouts = useLayoutsStore((s) => s.layouts);

  // Page lookup (before hooks — used by useMemo below)
  const focusedPage = focusedPageId ? pages.find((p) => p.id === focusedPageId) : undefined;

  // All hooks MUST be called unconditionally (React Rules of Hooks)
  const pageElements = useMemo(
    () => focusedPageId
      ? elements.filter((el) => el.page_id === focusedPageId && !el.deleted)
      : [],
    [elements, focusedPageId],
  );

  const outgoingLinks = useMemo(() => {
    if (pageElements.length === 0) return [];

    const slugMap = new Map<string, string>();
    for (const page of pages) {
      const normalized = normalizeSlug(page.slug);
      if (normalized) slugMap.set(normalized, page.title);
    }

    const targetNames = new Set<string>();

    for (const el of pageElements) {
      // 1) tag 기반 navigation (Link, a, Button)
      if (isNavigableTag(el.tag)) {
        const props = el.props as Record<string, unknown>;
        const href =
          (props.href as string | undefined) ||
          (props.to as string | undefined) ||
          (props.path as string | undefined) ||
          (props.url as string | undefined);

        if (href && !href.startsWith('http') && !href.startsWith('#')) {
          const name = slugMap.get(normalizeSlug(href));
          if (name) targetNames.add(name);
        }
      }

      // 2) event 기반 navigation
      const events = (
        Array.isArray((el.props as Record<string, unknown>).events)
          ? (el.props as Record<string, unknown>).events
          : el.events
      ) as Array<{
        enabled?: boolean;
        actions?: Array<{
          type?: string;
          enabled?: boolean;
          config?: Record<string, unknown>;
          value?: Record<string, unknown>;
        }>;
      }> | undefined;

      if (!Array.isArray(events)) continue;

      for (const event of events) {
        if (!event || event.enabled === false) continue;
        const actions = Array.isArray(event.actions) ? event.actions : [];
        for (const action of actions) {
          if (!action || action.enabled === false) continue;
          const actionType = (action.type || '').toLowerCase();
          if (actionType !== 'navigate' && actionType !== 'link' && !actionType.includes('navigate')) continue;

          const path =
            action.config?.path || action.config?.href || action.config?.to || action.config?.url ||
            action.value?.path || action.value?.href || action.value?.to || action.value?.url;

          if (typeof path === 'string' && !path.startsWith('http') && !path.startsWith('#')) {
            const name = slugMap.get(normalizeSlug(path));
            if (name) targetNames.add(name);
          }
        }
      }
    }

    return Array.from(targetNames);
  }, [pageElements, pages]);

  const layoutName = useMemo(() => {
    if (!focusedPage) return 'None';
    const layoutId = (focusedPage as Record<string, unknown>).layout_id as string | null | undefined;
    if (!layoutId) return 'None';
    const layout = layouts.find((l) => l.id === layoutId);
    return layout?.name || layoutId.slice(0, 8);
  }, [focusedPage, layouts]);

  const dataSources = useMemo(() => {
    if (pageElements.length === 0) return [];

    const sources: Array<{ name: string; type: string }> = [];
    const seen = new Set<string>();

    for (const el of pageElements) {
      const binding = (el.dataBinding || el.props.dataBinding) as Record<string, unknown> | undefined;
      if (!binding || typeof binding !== 'object') continue;

      let name = '';
      let type = '';

      if ('source' in binding && 'name' in binding && binding.name) {
        name = binding.name as string;
        type = binding.source as string;
      } else if ('type' in binding && binding.config) {
        const config = binding.config as Record<string, unknown>;
        if (config.baseUrl === 'MOCK_DATA') {
          name = (config.endpoint as string) || 'Mock';
          type = 'mock';
        } else if (binding.source === 'supabase' && config.tableName) {
          name = config.tableName as string;
          type = 'supabase';
        } else if (binding.source === 'api' && config.endpoint) {
          name = config.endpoint as string;
          type = 'api';
        }
      }

      if (name && !seen.has(name)) {
        seen.add(name);
        sources.push({ name, type });
      }
    }

    return sources;
  }, [pageElements]);

  // Early return AFTER all hooks
  if (!showOverlay || !focusedPageId || !focusedPage) return null;

  return (
    <div style={containerStyle}>
      {/* Page Title & Slug */}
      <div style={titleStyle}>{focusedPage.title}</div>
      <div style={slugStyle}>/{focusedPage.slug}</div>

      <div style={dividerStyle} />

      {/* Summary Rows */}
      <SummaryRow label="Elements" value={pageElements.length} />
      <SummaryRow label="Layout" value={layoutName} />

      {/* Outgoing Links */}
      {outgoingLinks.length > 0 && (
        <>
          <div style={dividerStyle} />
          <div style={{ ...labelStyle, marginBottom: 2 }}>
            Outgoing Links ({outgoingLinks.length})
          </div>
          {outgoingLinks.map((name) => (
            <div key={name} style={linkListStyle}>
              {name}
            </div>
          ))}
        </>
      )}

      {/* Data Sources */}
      {dataSources.length > 0 && (
        <>
          <div style={dividerStyle} />
          <div style={{ ...labelStyle, marginBottom: 2 }}>
            Data Sources ({dataSources.length})
          </div>
          {dataSources.map((ds) => (
            <div key={ds.name} style={linkListStyle}>
              {ds.name} <span style={{ color: '#6b7280' }}>({ds.type})</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default WorkflowPageSummary;
