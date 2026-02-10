/**
 * workflowEdges Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeSlug,
  computeWorkflowEdges,
  type WorkflowPageInput,
  type WorkflowElementInput,
} from '../workflowEdges';

// ============================================
// normalizeSlug
// ============================================

describe('normalizeSlug', () => {
  it('쿼리 파라미터와 해시를 제거한다', () => {
    expect(normalizeSlug('/home?q=1#section')).toBe('home');
  });

  it('후행 슬래시를 제거한다', () => {
    expect(normalizeSlug('/about/')).toBe('about');
  });

  it('슬래시 없는 일반 문자열을 그대로 반환한다', () => {
    expect(normalizeSlug('contact')).toBe('contact');
  });

  it('null이면 빈 문자열을 반환한다', () => {
    expect(normalizeSlug(null)).toBe('');
  });

  it('undefined이면 빈 문자열을 반환한다', () => {
    expect(normalizeSlug(undefined)).toBe('');
  });

  it('빈 문자열이면 빈 문자열을 반환한다', () => {
    expect(normalizeSlug('')).toBe('');
  });

  it('선행 슬래시만 있으면 빈 문자열을 반환한다', () => {
    expect(normalizeSlug('/')).toBe('');
  });

  it('중첩 경로를 정규화한다', () => {
    expect(normalizeSlug('/docs/api/?v=2')).toBe('docs/api');
  });
});

// ============================================
// computeWorkflowEdges
// ============================================

describe('computeWorkflowEdges', () => {
  const pages: WorkflowPageInput[] = [
    { id: 'page-home', title: 'Home', slug: 'home' },
    { id: 'page-about', title: 'About', slug: 'about' },
    { id: 'page-contact', title: 'Contact', slug: 'contact' },
  ];

  it('Link 요소의 href에서 navigation 엣지를 추출한다', () => {
    const elements: WorkflowElementInput[] = [
      {
        id: 'el-1',
        tag: 'Link',
        props: { href: '/about' },
        page_id: 'page-home',
      },
    ];

    const edges = computeWorkflowEdges(pages, elements);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      type: 'navigation',
      sourcePageId: 'page-home',
      targetPageId: 'page-about',
      sourceElementId: 'el-1',
    });
  });

  it('a 태그의 href에서 navigation 엣지를 추출한다', () => {
    const elements: WorkflowElementInput[] = [
      {
        id: 'el-a',
        tag: 'a',
        props: { href: '/contact/' },
        page_id: 'page-home',
      },
    ];

    const edges = computeWorkflowEdges(pages, elements);
    expect(edges).toHaveLength(1);
    expect(edges[0].targetPageId).toBe('page-contact');
  });

  it('http로 시작하는 외부 링크를 무시한다', () => {
    const elements: WorkflowElementInput[] = [
      {
        id: 'el-ext',
        tag: 'Link',
        props: { href: 'https://google.com' },
        page_id: 'page-home',
      },
    ];

    const edges = computeWorkflowEdges(pages, elements);
    expect(edges).toHaveLength(0);
  });

  it('#으로 시작하는 앵커 링크를 무시한다', () => {
    const elements: WorkflowElementInput[] = [
      {
        id: 'el-anchor',
        tag: 'a',
        props: { href: '#section-2' },
        page_id: 'page-home',
      },
    ];

    const edges = computeWorkflowEdges(pages, elements);
    expect(edges).toHaveLength(0);
  });

  it('event navigate action에서 경로를 추출한다', () => {
    const elements: WorkflowElementInput[] = [
      {
        id: 'el-btn',
        tag: 'Button',
        props: {
          events: [
            {
              enabled: true,
              event_type: 'click',
              actions: [
                {
                  type: 'navigate',
                  enabled: true,
                  config: { path: '/contact' },
                },
              ],
            },
          ],
        },
        page_id: 'page-home',
      },
    ];

    const edges = computeWorkflowEdges(pages, elements);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      type: 'event-navigation',
      sourcePageId: 'page-home',
      targetPageId: 'page-contact',
      sourceElementId: 'el-btn',
    });
  });

  it('중복 엣지를 방지한다', () => {
    const elements: WorkflowElementInput[] = [
      {
        id: 'el-dup1',
        tag: 'Link',
        props: { href: '/about' },
        page_id: 'page-home',
      },
      {
        id: 'el-dup1',
        tag: 'Link',
        props: { href: '/about' },
        page_id: 'page-home',
      },
    ];

    const edges = computeWorkflowEdges(pages, elements);
    // 동일 element id이므로 동일한 edge id가 생성되어 중복 방지됨
    expect(edges).toHaveLength(1);
  });

  it('page_id가 없는 요소를 무시한다', () => {
    const elements: WorkflowElementInput[] = [
      {
        id: 'el-orphan',
        tag: 'Link',
        props: { href: '/about' },
        page_id: null,
      },
    ];

    const edges = computeWorkflowEdges(pages, elements);
    expect(edges).toHaveLength(0);
  });

  it('자기 자신 페이지로의 링크를 무시한다', () => {
    const elements: WorkflowElementInput[] = [
      {
        id: 'el-self',
        tag: 'Link',
        props: { href: '/home' },
        page_id: 'page-home',
      },
    ];

    const edges = computeWorkflowEdges(pages, elements);
    expect(edges).toHaveLength(0);
  });

  it('존재하지 않는 페이지로의 링크를 무시한다', () => {
    const elements: WorkflowElementInput[] = [
      {
        id: 'el-missing',
        tag: 'Link',
        props: { href: '/nonexistent' },
        page_id: 'page-home',
      },
    ];

    const edges = computeWorkflowEdges(pages, elements);
    expect(edges).toHaveLength(0);
  });

  it('disabled 이벤트를 무시한다', () => {
    const elements: WorkflowElementInput[] = [
      {
        id: 'el-disabled',
        tag: 'Button',
        props: {
          events: [
            {
              enabled: false,
              event_type: 'click',
              actions: [
                {
                  type: 'navigate',
                  config: { path: '/about' },
                },
              ],
            },
          ],
        },
        page_id: 'page-home',
      },
    ];

    const edges = computeWorkflowEdges(pages, elements);
    expect(edges).toHaveLength(0);
  });

  it('action의 value에서도 경로를 추출한다', () => {
    const elements: WorkflowElementInput[] = [
      {
        id: 'el-val',
        tag: 'Button',
        props: {
          events: [
            {
              enabled: true,
              event_type: 'click',
              actions: [
                {
                  type: 'navigate',
                  enabled: true,
                  value: { path: '/about' },
                },
              ],
            },
          ],
        },
        page_id: 'page-home',
      },
    ];

    const edges = computeWorkflowEdges(pages, elements);
    expect(edges).toHaveLength(1);
    expect(edges[0].targetPageId).toBe('page-about');
  });

  it('navigation과 event-navigation 엣지를 모두 추출한다', () => {
    const elements: WorkflowElementInput[] = [
      {
        id: 'el-both',
        tag: 'Link',
        props: {
          href: '/about',
          events: [
            {
              enabled: true,
              event_type: 'click',
              actions: [
                {
                  type: 'navigate',
                  enabled: true,
                  config: { path: '/contact' },
                },
              ],
            },
          ],
        },
        page_id: 'page-home',
      },
    ];

    const edges = computeWorkflowEdges(pages, elements);
    expect(edges).toHaveLength(2);
    expect(edges.map((e) => e.type).sort()).toEqual(['event-navigation', 'navigation']);
  });

  it('빈 요소 배열은 빈 엣지를 반환한다', () => {
    const edges = computeWorkflowEdges(pages, []);
    expect(edges).toHaveLength(0);
  });

  it('빈 페이지 배열은 빈 엣지를 반환한다', () => {
    const elements: WorkflowElementInput[] = [
      {
        id: 'el-no-pages',
        tag: 'Link',
        props: { href: '/about' },
        page_id: 'page-home',
      },
    ];

    const edges = computeWorkflowEdges([], elements);
    expect(edges).toHaveLength(0);
  });
});
