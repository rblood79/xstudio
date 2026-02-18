/**
 * computedStyleService 유닛 테스트
 *
 * Skia 렌더링과 StylePanel 간 computedStyle 동기화 서비스 검증.
 *
 * [테스트 환경 설계]
 * - 테스트 환경(Node.js)에는 DOM이 없어 getComputedStyle()이 존재하지 않는다.
 * - getCSSVariable()은 getComputedStyle을 사용하므로 stub 처리가 필요하다.
 * - vi.stubGlobal로 getComputedStyle을 stub하여 항상 빈 문자열을 반환하게 한다.
 * - parseCSSValue()는 빈 문자열 수신 시 fallback 값을 반환하므로,
 *   결과적으로 모든 preset 계산은 SIZE_FALLBACKS 기반 fallback 값을 사용한다.
 * - 또한 document를 stub하여 document.documentElement 접근을 허용한다.
 *
 * @since 2026-02-19 W5-4 유닛 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  computeSyntheticStyle,
  resolveStyleValue,
  invalidateStyleCache,
  type SyntheticComputedStyle,
} from '../computedStyleService';
import type { SelectedElement } from '../../builder/inspector/types';

// ============================================
// DOM Stub 설정
// getCSSVariable()이 항상 빈 문자열을 반환하도록 설정
// → parseCSSValue('', fallback) → fallback 값 사용
// ============================================

vi.stubGlobal('document', {
  documentElement: {},
});

vi.stubGlobal('getComputedStyle', () => ({
  getPropertyValue: () => '',
}));

// ============================================
// 테스트 헬퍼
// ============================================

/**
 * SelectedElement Mock 생성 헬퍼
 */
function createMockElement(
  type: string,
  properties: Record<string, unknown> = {},
  style: React.CSSProperties = {}
): SelectedElement {
  return {
    id: `test-${type.toLowerCase()}`,
    type,
    properties,
    style,
  };
}

// ============================================
// SIZE_FALLBACKS 참조값 (cssVariableReader와 동기화)
// 테스트 환경에서 DOM이 없으므로 fallback 값이 자동 사용됨
// ============================================

/**
 * Button fallback 값 (SIZE_FALLBACKS)
 * xs={fontSize:10, paddingX:8,  paddingY:2,  borderRadius:4}
 * sm={fontSize:14, paddingX:12, paddingY:4,  borderRadius:4}
 * md={fontSize:16, paddingX:24, paddingY:8,  borderRadius:6}
 * lg={fontSize:18, paddingX:32, paddingY:12, borderRadius:8}
 * xl={fontSize:20, paddingX:40, paddingY:16, borderRadius:8}
 */
const BUTTON_FALLBACKS = {
  xs: { fontSize: '10px', paddingTop: '2px',  paddingRight: '8px',  paddingBottom: '2px',  paddingLeft: '8px',  borderRadius: '4px' },
  sm: { fontSize: '14px', paddingTop: '4px',  paddingRight: '12px', paddingBottom: '4px',  paddingLeft: '12px', borderRadius: '4px' },
  md: { fontSize: '16px', paddingTop: '8px',  paddingRight: '24px', paddingBottom: '8px',  paddingLeft: '24px', borderRadius: '6px' },
  lg: { fontSize: '18px', paddingTop: '12px', paddingRight: '32px', paddingBottom: '12px', paddingLeft: '32px', borderRadius: '8px' },
  xl: { fontSize: '20px', paddingTop: '16px', paddingRight: '40px', paddingBottom: '16px', paddingLeft: '40px', borderRadius: '8px' },
};

/**
 * Checkbox fallback 값 (CHECKBOX_FALLBACKS)
 * sm={boxSize:16, fontSize:14, gap:8}
 * md={boxSize:20, fontSize:14, gap:8}
 * lg={boxSize:24, fontSize:16, gap:8}
 */
const CHECKBOX_FONT_SIZE_FALLBACKS = {
  sm: '14px',
  md: '14px',
  lg: '16px',
};

/**
 * Radio fallback 값 (RADIO_FALLBACKS)
 * sm={radioSize:18, fontSize:14, ...}
 * md={radioSize:20, fontSize:16, ...}
 * lg={radioSize:24, fontSize:18, ...}
 */
const RADIO_FONT_SIZE_FALLBACKS = {
  sm: '14px',
  md: '16px',
  lg: '18px',
};

/**
 * ProgressBar fallback 값 (PROGRESSBAR_FALLBACKS)
 * sm={fontSize:14, borderRadius:4}
 * md={fontSize:16, borderRadius:6}
 * lg={fontSize:18, borderRadius:8}
 */
const PROGRESSBAR_FALLBACKS = {
  sm: { fontSize: '14px', borderRadius: '4px' },
  md: { fontSize: '16px', borderRadius: '6px' },
  lg: { fontSize: '18px', borderRadius: '8px' },
};

/**
 * Input fallback 값 (INPUT_FALLBACKS)
 * sm={fontSize:12, paddingX:8,  paddingY:6,  borderRadius:6}
 * md={fontSize:14, paddingX:12, paddingY:8,  borderRadius:6}
 * lg={fontSize:16, paddingX:16, paddingY:12, borderRadius:6}
 */
const INPUT_FALLBACKS = {
  sm: { fontSize: '12px', paddingTop: '6px',  paddingRight: '8px'  },
  md: { fontSize: '14px', paddingTop: '8px',  paddingRight: '12px' },
  lg: { fontSize: '16px', paddingTop: '12px', paddingRight: '16px' },
};

// ============================================
// 1. computeSyntheticStyle() 기본 동작
// ============================================

describe('computeSyntheticStyle() 기본 동작', () => {
  beforeEach(() => {
    // 각 테스트 전 캐시 초기화로 독립성 보장
    invalidateStyleCache();
  });

  it('null element를 전달하면 빈 객체를 반환한다', () => {
    // Arrange & Act
    const result = computeSyntheticStyle(null);

    // Assert
    expect(result).toEqual({});
  });

  it('미지원 tag이면 빈 객체를 반환한다', () => {
    // Arrange
    const element = createMockElement('UnknownTag', { size: 'md' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert
    expect(result).toEqual({});
  });

  it('div tag이면 빈 객체를 반환한다', () => {
    // Arrange
    const element = createMockElement('div', { size: 'md' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert
    expect(result).toEqual({});
  });

  it('Button size="sm"이면 sm preset 값을 반환한다', () => {
    // Arrange
    const element = createMockElement('Button', { size: 'sm' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert
    expect(result).toEqual(BUTTON_FALLBACKS.sm);
  });

  it('Button size="md"이면 md preset 값을 반환한다', () => {
    // Arrange
    const element = createMockElement('Button', { size: 'md' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert
    expect(result).toEqual(BUTTON_FALLBACKS.md);
  });

  it('Button size="lg"이면 lg preset 값을 반환한다', () => {
    // Arrange
    const element = createMockElement('Button', { size: 'lg' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert
    expect(result).toEqual(BUTTON_FALLBACKS.lg);
  });

  it('Checkbox size="md"이면 fontSize: "14px"를 반환한다', () => {
    // Arrange
    const element = createMockElement('Checkbox', { size: 'md' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert
    expect(result.fontSize).toBe(CHECKBOX_FONT_SIZE_FALLBACKS.md);
  });

  it('Radio size="sm"이면 fontSize: "14px"를 반환한다', () => {
    // Arrange
    const element = createMockElement('Radio', { size: 'sm' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert
    expect(result.fontSize).toBe(RADIO_FONT_SIZE_FALLBACKS.sm);
  });

  it('ProgressBar size="md"이면 fontSize와 borderRadius를 반환한다', () => {
    // Arrange
    const element = createMockElement('ProgressBar', { size: 'md' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert
    expect(result.fontSize).toBe(PROGRESSBAR_FALLBACKS.md.fontSize);
    expect(result.borderRadius).toBe(PROGRESSBAR_FALLBACKS.md.borderRadius);
  });

  it('Input size="md"이면 fontSize, paddingTop, paddingRight를 반환한다', () => {
    // Arrange
    const element = createMockElement('Input', { size: 'md' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert
    expect(result.fontSize).toBe(INPUT_FALLBACKS.md.fontSize);
    expect(result.paddingTop).toBe(INPUT_FALLBACKS.md.paddingTop);
    expect(result.paddingRight).toBe(INPUT_FALLBACKS.md.paddingRight);
  });
});

// ============================================
// 2. size 기본값 동작 (size prop 미지정)
// ============================================

describe('size 기본값 동작', () => {
  beforeEach(() => {
    invalidateStyleCache();
  });

  it('Button에 size prop이 없으면 md preset을 기본값으로 사용한다', () => {
    // Arrange - size 미지정
    const element = createMockElement('Button', { variant: 'primary' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert: md preset과 동일해야 함
    expect(result).toEqual(BUTTON_FALLBACKS.md);
  });

  it('Button에 size prop이 undefined이면 md preset을 기본값으로 사용한다', () => {
    // Arrange
    const element = createMockElement('Button', { size: undefined });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert
    expect(result).toEqual(BUTTON_FALLBACKS.md);
  });

  it('Checkbox에 size prop이 없으면 md preset을 기본값으로 사용한다', () => {
    // Arrange
    const element = createMockElement('Checkbox', {});

    // Act
    const result = computeSyntheticStyle(element);

    // Assert: md fallback
    expect(result.fontSize).toBe(CHECKBOX_FONT_SIZE_FALLBACKS.md);
  });

  it('Radio에 size prop이 없으면 md preset을 기본값으로 사용한다', () => {
    // Arrange
    const element = createMockElement('Radio', {});

    // Act
    const result = computeSyntheticStyle(element);

    // Assert: md fallback
    expect(result.fontSize).toBe(RADIO_FONT_SIZE_FALLBACKS.md);
  });
});

// ============================================
// 3. 캐시 동작
// ============================================

describe('캐시 동작', () => {
  beforeEach(() => {
    invalidateStyleCache();
  });

  it('동일 element를 2회 호출하면 동일한 결과를 반환한다 (캐시 hit)', () => {
    // Arrange
    const element = createMockElement('Button', { size: 'md', variant: 'primary' });

    // Act
    const firstResult = computeSyntheticStyle(element);
    const secondResult = computeSyntheticStyle(element);

    // Assert: 동일 객체 참조 (캐시에서 반환)
    expect(firstResult).toBe(secondResult);
  });

  it('동일 type + size + variant 조합이면 다른 element 객체라도 캐시된 결과를 반환한다', () => {
    // Arrange
    const element1 = createMockElement('Button', { size: 'sm', variant: 'primary' });
    const element2 = { ...createMockElement('Button', { size: 'sm', variant: 'primary' }), id: 'different-id' };

    // Act
    const result1 = computeSyntheticStyle(element1);
    const result2 = computeSyntheticStyle(element2);

    // Assert: 동일 캐시 키이므로 같은 객체 참조
    expect(result1).toBe(result2);
  });

  it('invalidateStyleCache() 호출 후에는 캐시가 초기화되어 새로 계산한다', () => {
    // Arrange
    const element = createMockElement('Button', { size: 'md' });

    // Act: 첫 번째 호출 (캐시 생성)
    const firstResult = computeSyntheticStyle(element);

    // 캐시 무효화
    invalidateStyleCache();

    // 두 번째 호출 (새로 계산)
    const secondResult = computeSyntheticStyle(element);

    // Assert: 값은 동일하지만 캐시 무효화 후 새로 생성된 객체
    expect(firstResult).not.toBe(secondResult);
    expect(firstResult).toEqual(secondResult);
  });

  it('서로 다른 size는 서로 다른 캐시 항목으로 저장된다', () => {
    // Arrange
    const smElement = createMockElement('Button', { size: 'sm' });
    const mdElement = createMockElement('Button', { size: 'md' });

    // Act
    const smResult = computeSyntheticStyle(smElement);
    const mdResult = computeSyntheticStyle(mdElement);

    // Assert: 캐시 항목이 다르므로 다른 객체
    expect(smResult).not.toBe(mdResult);
    expect(smResult.fontSize).not.toBe(mdResult.fontSize);
  });

  it('서로 다른 type은 서로 다른 캐시 항목으로 저장된다', () => {
    // Arrange
    const buttonElement = createMockElement('Button', { size: 'md' });
    const toggleElement = createMockElement('ToggleButton', { size: 'md' });

    // Act
    const buttonResult = computeSyntheticStyle(buttonElement);
    const toggleResult = computeSyntheticStyle(toggleElement);

    // Assert: 타입이 달라서 다른 캐시 항목
    expect(buttonResult).not.toBe(toggleResult);
  });
});

// ============================================
// 4. resolveStyleValue() 테스트
// ============================================

describe('resolveStyleValue()', () => {
  it('inline style이 있으면 inline 값을 최우선으로 사용한다', () => {
    // Arrange
    const inlineStyle: React.CSSProperties = { fontSize: '20px' };
    const syntheticStyle: SyntheticComputedStyle = { fontSize: '16px' };
    const defaultValue = '12px';

    // Act
    const result = resolveStyleValue(inlineStyle, syntheticStyle, 'fontSize', defaultValue);

    // Assert
    expect(result).toBe('20px');
  });

  it('inline style이 없고 synthetic이 있으면 synthetic 값을 사용한다', () => {
    // Arrange
    const inlineStyle: React.CSSProperties = {};
    const syntheticStyle: SyntheticComputedStyle = { fontSize: '16px' };
    const defaultValue = '12px';

    // Act
    const result = resolveStyleValue(inlineStyle, syntheticStyle, 'fontSize', defaultValue);

    // Assert
    expect(result).toBe('16px');
  });

  it('inline style이 null이면 synthetic 값을 사용한다', () => {
    // Arrange
    const syntheticStyle: SyntheticComputedStyle = { fontSize: '16px' };
    const defaultValue = '12px';

    // Act
    const result = resolveStyleValue(null, syntheticStyle, 'fontSize', defaultValue);

    // Assert
    expect(result).toBe('16px');
  });

  it('inline style이 undefined이면 synthetic 값을 사용한다', () => {
    // Arrange
    const syntheticStyle: SyntheticComputedStyle = { fontSize: '16px' };
    const defaultValue = '12px';

    // Act
    const result = resolveStyleValue(undefined, syntheticStyle, 'fontSize', defaultValue);

    // Assert
    expect(result).toBe('16px');
  });

  it('inline과 synthetic 둘 다 없으면 default 값을 반환한다', () => {
    // Arrange
    const inlineStyle: React.CSSProperties = {};
    const syntheticStyle: SyntheticComputedStyle = {};
    const defaultValue = '12px';

    // Act
    const result = resolveStyleValue(inlineStyle, syntheticStyle, 'fontSize', defaultValue);

    // Assert
    expect(result).toBe('12px');
  });

  it('inline style 값이 빈 문자열이면 synthetic 값으로 fallback한다', () => {
    // Arrange
    const inlineStyle = { fontSize: '' } as React.CSSProperties;
    const syntheticStyle: SyntheticComputedStyle = { fontSize: '16px' };
    const defaultValue = '12px';

    // Act
    const result = resolveStyleValue(inlineStyle, syntheticStyle, 'fontSize', defaultValue);

    // Assert: 빈 문자열은 무효로 처리되어 synthetic 사용
    expect(result).toBe('16px');
  });

  it('paddingTop 속성도 동일한 우선순위로 동작한다', () => {
    // Arrange
    const inlineStyle: React.CSSProperties = { paddingTop: '20px' };
    const syntheticStyle: SyntheticComputedStyle = { paddingTop: '8px' };
    const defaultValue = '0px';

    // Act
    const result = resolveStyleValue(inlineStyle, syntheticStyle, 'paddingTop', defaultValue);

    // Assert
    expect(result).toBe('20px');
  });

  it('borderRadius 속성도 synthetic → default fallback이 동작한다', () => {
    // Arrange
    const inlineStyle: React.CSSProperties = {};
    const syntheticStyle: SyntheticComputedStyle = {};
    const defaultValue = '0px';

    // Act
    const result = resolveStyleValue(inlineStyle, syntheticStyle, 'borderRadius', defaultValue);

    // Assert
    expect(result).toBe('0px');
  });
});

// ============================================
// 5. StylePanel ↔ Skia 일치율 검증
// (컴포넌트 fontSize가 cssVariableReader SIZE_FALLBACKS와 일치하는지)
// ============================================

describe('StylePanel ↔ Skia 일치율 검증', () => {
  beforeEach(() => {
    invalidateStyleCache();
  });

  describe('Button fontSize 일치 검증', () => {
    const buttonFontSizes: Array<[string, string]> = [
      ['xs', '10px'],
      ['sm', '14px'],
      ['md', '16px'],
      ['lg', '18px'],
      ['xl', '20px'],
    ];

    it.each(buttonFontSizes)(
      'Button size="%s" → fontSize가 Skia fallback "%s"와 일치한다',
      (size, expectedFontSize) => {
        // Arrange
        const element = createMockElement('Button', { size });

        // Act
        const result = computeSyntheticStyle(element);

        // Assert
        expect(result.fontSize).toBe(expectedFontSize);
      }
    );
  });

  describe('Checkbox fontSize 일치 검증', () => {
    const checkboxFontSizes: Array<[string, string]> = [
      ['sm', '14px'],
      ['md', '14px'],
      ['lg', '16px'],
    ];

    it.each(checkboxFontSizes)(
      'Checkbox size="%s" → fontSize가 Skia fallback "%s"와 일치한다',
      (size, expectedFontSize) => {
        // Arrange
        const element = createMockElement('Checkbox', { size });

        // Act
        const result = computeSyntheticStyle(element);

        // Assert
        expect(result.fontSize).toBe(expectedFontSize);
      }
    );
  });

  describe('Radio fontSize 일치 검증', () => {
    const radioFontSizes: Array<[string, string]> = [
      ['sm', '14px'],
      ['md', '16px'],
      ['lg', '18px'],
    ];

    it.each(radioFontSizes)(
      'Radio size="%s" → fontSize가 Skia fallback "%s"와 일치한다',
      (size, expectedFontSize) => {
        // Arrange
        const element = createMockElement('Radio', { size });

        // Act
        const result = computeSyntheticStyle(element);

        // Assert
        expect(result.fontSize).toBe(expectedFontSize);
      }
    );
  });

  describe('ProgressBar fontSize 일치 검증', () => {
    const progressBarFontSizes: Array<[string, string]> = [
      ['sm', '14px'],
      ['md', '16px'],
      ['lg', '18px'],
    ];

    it.each(progressBarFontSizes)(
      'ProgressBar size="%s" → fontSize가 Skia fallback "%s"와 일치한다',
      (size, expectedFontSize) => {
        // Arrange
        const element = createMockElement('ProgressBar', { size });

        // Act
        const result = computeSyntheticStyle(element);

        // Assert
        expect(result.fontSize).toBe(expectedFontSize);
      }
    );
  });

  describe('Input fontSize 일치 검증', () => {
    const inputFontSizes: Array<[string, string]> = [
      ['sm', '12px'],
      ['md', '14px'],
      ['lg', '16px'],
    ];

    it.each(inputFontSizes)(
      'Input size="%s" → fontSize가 Skia fallback "%s"와 일치한다',
      (size, expectedFontSize) => {
        // Arrange
        const element = createMockElement('Input', { size });

        // Act
        const result = computeSyntheticStyle(element);

        // Assert
        expect(result.fontSize).toBe(expectedFontSize);
      }
    );
  });

  describe('Button padding/borderRadius 완전 일치 검증', () => {
    it('Button size="xs" → 전체 preset이 Skia fallback과 일치한다', () => {
      // Arrange
      const element = createMockElement('Button', { size: 'xs' });

      // Act
      const result = computeSyntheticStyle(element);

      // Assert
      expect(result).toEqual(BUTTON_FALLBACKS.xs);
    });

    it('Button size="xl" → 전체 preset이 Skia fallback과 일치한다', () => {
      // Arrange
      const element = createMockElement('Button', { size: 'xl' });

      // Act
      const result = computeSyntheticStyle(element);

      // Assert
      expect(result).toEqual(BUTTON_FALLBACKS.xl);
    });
  });

  describe('ProgressBar borderRadius 일치 검증', () => {
    it('ProgressBar size="sm" → borderRadius가 Skia fallback과 일치한다', () => {
      // Arrange
      const element = createMockElement('ProgressBar', { size: 'sm' });

      // Act
      const result = computeSyntheticStyle(element);

      // Assert
      expect(result.borderRadius).toBe(PROGRESSBAR_FALLBACKS.sm.borderRadius);
    });

    it('ProgressBar size="lg" → borderRadius가 Skia fallback과 일치한다', () => {
      // Arrange
      const element = createMockElement('ProgressBar', { size: 'lg' });

      // Act
      const result = computeSyntheticStyle(element);

      // Assert
      expect(result.borderRadius).toBe(PROGRESSBAR_FALLBACKS.lg.borderRadius);
    });
  });
});

// ============================================
// 6. 추가 컴포넌트 태그 지원 검증
// ============================================

describe('추가 컴포넌트 태그 지원', () => {
  beforeEach(() => {
    invalidateStyleCache();
  });

  it('ToggleButton tag를 지원한다', () => {
    // Arrange
    const element = createMockElement('ToggleButton', { size: 'md' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert: fontSize 포함 여부로 지원 확인
    expect(result.fontSize).toBeDefined();
    expect(typeof result.fontSize).toBe('string');
  });

  it('Switch tag를 지원한다 (fontSize 반환)', () => {
    // Arrange
    const element = createMockElement('Switch', { size: 'md' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert
    expect(result.fontSize).toBeDefined();
  });

  it('Badge tag를 지원한다 (Button 계열, fontSize + padding + borderRadius)', () => {
    // Arrange
    const element = createMockElement('Badge', { size: 'md' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert: Button과 동일한 구조
    expect(result.fontSize).toBeDefined();
    expect(result.paddingTop).toBeDefined();
    expect(result.borderRadius).toBeDefined();
  });

  it('Meter tag를 지원한다 (ProgressBar 계열, fontSize + borderRadius)', () => {
    // Arrange
    const element = createMockElement('Meter', { size: 'md' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert
    expect(result.fontSize).toBeDefined();
    expect(result.borderRadius).toBeDefined();
    expect(result.paddingTop).toBeUndefined();
  });

  it('TextField tag를 지원한다 (Input 계열)', () => {
    // Arrange
    const element = createMockElement('TextField', { size: 'md' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert: Input과 동일한 구조
    expect(result.fontSize).toBeDefined();
    expect(result.paddingTop).toBeDefined();
    expect(result.borderRadius).toBeDefined();
  });

  it('CheckboxGroup tag를 지원한다 (Checkbox와 동일)', () => {
    // Arrange
    const checkboxElement = createMockElement('Checkbox', { size: 'lg' });
    const checkboxGroupElement = createMockElement('CheckboxGroup', { size: 'lg' });

    // Act
    const checkboxResult = computeSyntheticStyle(checkboxElement);
    const groupResult = computeSyntheticStyle(checkboxGroupElement);

    // Assert: 동일한 fontSize
    expect(groupResult.fontSize).toBe(checkboxResult.fontSize);
  });

  it('RadioGroup tag를 지원한다 (Radio와 동일)', () => {
    // Arrange
    const radioElement = createMockElement('Radio', { size: 'lg' });
    const radioGroupElement = createMockElement('RadioGroup', { size: 'lg' });

    // Act
    const radioResult = computeSyntheticStyle(radioElement);
    const groupResult = computeSyntheticStyle(radioGroupElement);

    // Assert: 동일한 fontSize
    expect(groupResult.fontSize).toBe(radioResult.fontSize);
  });

  it('Link tag를 지원한다 (fontSize만 반환)', () => {
    // Arrange
    const element = createMockElement('Link', { size: 'md' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert: fontSize만 있고 padding 없음
    expect(result.fontSize).toBeDefined();
    expect(result.paddingTop).toBeUndefined();
  });

  it('Breadcrumbs tag를 지원한다 (fontSize만 반환)', () => {
    // Arrange
    const element = createMockElement('Breadcrumbs', { size: 'md' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert
    expect(result.fontSize).toBeDefined();
    expect(result.paddingTop).toBeUndefined();
  });
});

// ============================================
// 7. 에지 케이스 및 경계 조건
// ============================================

describe('에지 케이스 및 경계 조건', () => {
  beforeEach(() => {
    invalidateStyleCache();
  });

  it('알 수 없는 size 값이 전달되면 해당 컴포넌트의 fallback을 사용한다', () => {
    // Arrange: 존재하지 않는 size
    const element = createMockElement('Button', { size: 'xxl' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert: 빈 객체가 아닌, fallback으로 sm 또는 sm-equivalent 반환
    // getSizePreset은 SIZE_FALLBACKS[size] || SIZE_FALLBACKS.sm 구조이므로 sm fallback 사용
    expect(result.fontSize).toBeDefined();
    expect(result.fontSize).toBe('14px'); // sm fallback
  });

  it('properties가 빈 객체이면 md 기본 size를 사용한다', () => {
    // Arrange
    const element = createMockElement('Button', {});

    // Act
    const result = computeSyntheticStyle(element);

    // Assert: md preset
    expect(result).toEqual(BUTTON_FALLBACKS.md);
  });

  it('variant만 있고 size가 없으면 md 기본 size를 사용한다', () => {
    // Arrange
    const element = createMockElement('Button', { variant: 'outline' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert
    expect(result).toEqual(BUTTON_FALLBACKS.md);
  });

  it('variant가 달라도 size가 같으면 동일한 fontSize를 반환한다', () => {
    // Arrange
    const primaryElement = createMockElement('Button', { size: 'md', variant: 'primary' });
    const outlineElement = createMockElement('Button', { size: 'md', variant: 'outline' });

    // Act
    const primaryResult = computeSyntheticStyle(primaryElement);
    const outlineResult = computeSyntheticStyle(outlineElement);

    // Assert: fontSize는 size에서만 결정됨
    expect(primaryResult.fontSize).toBe(outlineResult.fontSize);
  });

  it('반환된 스타일 값은 모두 px 단위 문자열이다', () => {
    // Arrange
    const element = createMockElement('Button', { size: 'md' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert: 모든 값이 "Npx" 형식
    const values = Object.values(result) as string[];
    for (const value of values) {
      expect(value).toMatch(/^\d+(\.\d+)?px$/);
    }
  });

  it('Slider tag는 fontSize(thumbSize 기반)만 반환한다', () => {
    // Arrange
    const element = createMockElement('Slider', { size: 'md' });

    // Act
    const result = computeSyntheticStyle(element);

    // Assert: fontSize만 있음 (thumbSize 기반)
    expect(result.fontSize).toBeDefined();
    expect(result.paddingTop).toBeUndefined();
    expect(result.borderRadius).toBeUndefined();
  });
});
