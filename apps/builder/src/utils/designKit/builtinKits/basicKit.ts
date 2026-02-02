/**
 * 기본 내장 디자인 킷
 *
 * 5개 색상 변수 + 기본 테마 토큰 + 2개 마스터 컴포넌트 (Card, Badge)
 *
 * @see docs/WASM_DOC_IMPACT_ANALYSIS.md §G.4
 */

import type { DesignKit } from '../../../types/builder/designKit.types';

export const BASIC_KIT: DesignKit = {
  formatVersion: '1.0',
  meta: {
    id: 'builtin-basic-kit-v1',
    name: 'Basic Kit',
    version: '1.0.0',
    description: '기본 색상 변수와 Card/Badge 컴포넌트를 포함한 스타터 킷',
    author: 'XStudio',
    tags: ['starter', 'basic', 'components'],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  variables: [
    {
      name: 'primary',
      type: 'color',
      defaultValue: '#3B82F6',
      description: '메인 브랜드 색상',
      group: 'colors',
      themeOverrides: {
        dark: '#60A5FA',
      },
    },
    {
      name: 'secondary',
      type: 'color',
      defaultValue: '#6366F1',
      description: '보조 브랜드 색상',
      group: 'colors',
      themeOverrides: {
        dark: '#818CF8',
      },
    },
    {
      name: 'background',
      type: 'color',
      defaultValue: '#FFFFFF',
      description: '배경 색상',
      group: 'colors',
      themeOverrides: {
        dark: '#1F2937',
      },
    },
    {
      name: 'surface',
      type: 'color',
      defaultValue: '#F9FAFB',
      description: '표면(카드, 패널) 색상',
      group: 'colors',
      themeOverrides: {
        dark: '#374151',
      },
    },
    {
      name: 'text',
      type: 'color',
      defaultValue: '#111827',
      description: '텍스트 색상',
      group: 'colors',
      themeOverrides: {
        dark: '#F9FAFB',
      },
    },
  ],
  themes: [
    {
      name: 'Default',
      status: 'active',
      supportsDarkMode: false,
      tokens: [
        { name: 'color-primary', type: 'color', value: '#3B82F6', scope: 'semantic' },
        { name: 'color-secondary', type: 'color', value: '#6366F1', scope: 'semantic' },
        { name: 'color-bg', type: 'color', value: '#FFFFFF', scope: 'semantic' },
        { name: 'color-surface', type: 'color', value: '#F9FAFB', scope: 'semantic' },
        { name: 'color-text', type: 'color', value: '#111827', scope: 'semantic' },
        { name: 'radius-sm', type: 'radius', value: 4, scope: 'raw' },
        { name: 'radius-md', type: 'radius', value: 8, scope: 'raw' },
        { name: 'radius-lg', type: 'radius', value: 12, scope: 'raw' },
        { name: 'spacing-xs', type: 'spacing', value: 4, scope: 'raw' },
        { name: 'spacing-sm', type: 'spacing', value: 8, scope: 'raw' },
        { name: 'spacing-md', type: 'spacing', value: 16, scope: 'raw' },
        { name: 'spacing-lg', type: 'spacing', value: 24, scope: 'raw' },
      ],
    },
  ],
  components: [
    {
      master: {
        localId: 'card-master',
        tag: 'Box',
        props: {
          style: {
            width: 320,
            height: 200,
            backgroundColor: '$--surface',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderStyle: 'solid',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          },
        },
        parentLocalId: null,
        orderNum: 0,
        componentRole: 'master',
        componentName: 'Card',
        variableBindings: ['$--surface'],
      },
      descendants: [
        {
          localId: 'card-title',
          tag: 'Text',
          props: {
            children: 'Card Title',
            style: {
              fontSize: 18,
              fontWeight: '600',
              color: '$--text',
            },
          },
          parentLocalId: 'card-master',
          orderNum: 0,
          variableBindings: ['$--text'],
        },
        {
          localId: 'card-body',
          tag: 'Text',
          props: {
            children: 'Card description text goes here.',
            style: {
              fontSize: 14,
              fontWeight: '400',
              color: '#6B7280',
            },
          },
          parentLocalId: 'card-master',
          orderNum: 1,
        },
      ],
      category: 'layout',
    },
    {
      master: {
        localId: 'badge-master',
        tag: 'Box',
        props: {
          style: {
            height: 24,
            backgroundColor: '$--primary',
            borderRadius: 12,
            paddingLeft: 10,
            paddingRight: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
          children: 'Badge',
        },
        parentLocalId: null,
        orderNum: 0,
        componentRole: 'master',
        componentName: 'Badge',
        variableBindings: ['$--primary'],
      },
      descendants: [
        {
          localId: 'badge-label',
          tag: 'Text',
          props: {
            children: 'Badge',
            style: {
              fontSize: 12,
              fontWeight: '500',
              color: '#FFFFFF',
            },
          },
          parentLocalId: 'badge-master',
          orderNum: 0,
        },
      ],
      category: 'data-display',
    },
  ],
};
