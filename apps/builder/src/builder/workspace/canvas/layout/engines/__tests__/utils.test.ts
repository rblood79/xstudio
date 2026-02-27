/**
 * Layout Engine Utils Unit Tests
 *
 * 레이아웃 엔진 유틸리티 함수 테스트
 *
 * @since 2026-01-28 Phase 6 - 검증
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseMargin,
  parsePadding,
  parseBorder,
  parseBoxModel,
  parseSize,
  parseVerticalAlign,
  parseLineHeight,
  calculateBaseline,
  calculateContentHeight,
  resetWarnedTokens,
  getButtonSizeConfig,
  enrichWithIntrinsicSize,
  INLINE_BLOCK_TAGS,
} from '../utils';
import type { Element } from '../../../../../../types/core/store.types';

// 테스트용 헬퍼
function createElement(style?: Record<string, unknown>): Element {
  return {
    id: 'test',
    type: 'div',
    props: style ? { style } : {},
    children: [],
  } as unknown as Element;
}

describe('parseMargin', () => {
  it('undefined이면 모두 0 반환', () => {
    expect(parseMargin(undefined)).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

  it('개별 속성 파싱', () => {
    const result = parseMargin({
      marginTop: 10,
      marginRight: 20,
      marginBottom: 30,
      marginLeft: 40,
    });

    expect(result).toEqual({
      top: 10,
      right: 20,
      bottom: 30,
      left: 40,
    });
  });

  it('px 단위 파싱', () => {
    const result = parseMargin({
      marginTop: '10px',
      marginRight: '20px',
    });

    expect(result.top).toBe(10);
    expect(result.right).toBe(20);
  });

  it('shorthand 파싱 (1값)', () => {
    const result = parseMargin({ margin: 10 });

    expect(result).toEqual({
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    });
  });

  it('shorthand 파싱 (2값)', () => {
    const result = parseMargin({ margin: '10px 20px' });

    expect(result).toEqual({
      top: 10,
      right: 20,
      bottom: 10,
      left: 20,
    });
  });

  it('shorthand 파싱 (4값)', () => {
    const result = parseMargin({ margin: '10px 20px 30px 40px' });

    expect(result).toEqual({
      top: 10,
      right: 20,
      bottom: 30,
      left: 40,
    });
  });

  it('개별 속성이 shorthand보다 우선', () => {
    const result = parseMargin({
      margin: 10,
      marginTop: 50,
    });

    expect(result.top).toBe(50);
    expect(result.right).toBe(10);
  });

  it('음수 마진 파싱', () => {
    const result = parseMargin({
      marginTop: -10,
      marginBottom: '-20px',
    });

    expect(result.top).toBe(-10);
    expect(result.bottom).toBe(-20);
  });

  it('rem, em 단위는 미지원 (0으로 폴백)', () => {
    resetWarnedTokens();
    const result = parseMargin({ margin: '10rem' });

    expect(result.top).toBe(0);
  });
});

describe('parsePadding', () => {
  it('개별 속성 파싱', () => {
    const result = parsePadding({
      paddingTop: 10,
      paddingRight: 20,
    });

    expect(result.top).toBe(10);
    expect(result.right).toBe(20);
  });

  it('shorthand 파싱', () => {
    const result = parsePadding({ padding: '10px 20px' });

    expect(result.top).toBe(10);
    expect(result.right).toBe(20);
  });
});

describe('parseBorder', () => {
  it('개별 borderWidth 파싱', () => {
    const result = parseBorder({
      borderTopWidth: 1,
      borderRightWidth: 2,
    });

    expect(result.top).toBe(1);
    expect(result.right).toBe(2);
  });

  it('borderWidth shorthand 파싱', () => {
    const result = parseBorder({ borderWidth: '1px 2px' });

    expect(result.top).toBe(1);
    expect(result.right).toBe(2);
  });
});

describe('parseSize', () => {
  it('px 값 파싱', () => {
    expect(parseSize('100px', 400)).toBe(100);
  });

  it('숫자 값 파싱', () => {
    expect(parseSize(100, 400)).toBe(100);
  });

  it('% 값 파싱 (부모 기준)', () => {
    expect(parseSize('50%', 400)).toBe(200);
  });

  it('vh 값 파싱', () => {
    expect(parseSize('50vh', 400, 1920, 1080)).toBe(540);
  });

  it('vw 값 파싱', () => {
    expect(parseSize('50vw', 400, 1920, 1080)).toBe(960);
  });

  it('auto는 undefined 반환', () => {
    expect(parseSize('auto', 400)).toBeUndefined();
  });

  it('undefined는 undefined 반환', () => {
    expect(parseSize(undefined, 400)).toBeUndefined();
  });

  it('rem은 기본 rootFontSize(16px) 기준으로 계산', () => {
    // parseSize()는 resolveCSSSizeValue()에 위임하며,
    // rootFontSize를 전달하지 않으므로 기본값 16px 사용
    // 10rem = 10 * 16 = 160
    expect(parseSize('10rem', 400)).toBe(160);
  });

  it('em은 기본 parentSize(16px) 기준으로 계산', () => {
    // parseSize()는 CSSValueContext에 parentSize를 전달하지 않으므로
    // em도 기본값 16px 기준으로 계산
    // 10em = 10 * 16 = 160
    expect(parseSize('10em', 400)).toBe(160);
  });

  it('viewport 크기 미제공 시 vh/vw는 기본값(1920x1080) 기준으로 계산', () => {
    // parseSize()는 viewportWidth/viewportHeight를 전달하지 않으면
    // resolveCSSSizeValue() 내부 기본값 DEFAULT_VIEWPORT_HEIGHT=1080,
    // DEFAULT_VIEWPORT_WIDTH=1920을 사용한다.
    // 50vh = 50 * 1080 / 100 = 540
    expect(parseSize('50vh', 400)).toBe(540);
    // 50vw = 50 * 1920 / 100 = 960
    expect(parseSize('50vw', 400)).toBe(960);
  });
});

describe('parseBoxModel', () => {
  it('기본 박스 모델 파싱', () => {
    const element = createElement({
      width: 200,
      height: 100,
      paddingTop: 10,
      borderTopWidth: 2,
    });

    const result = parseBoxModel(element, 400, 800);

    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
    expect(result.padding.top).toBe(10);
    expect(result.border.top).toBe(2);
  });

  it('% width 계산', () => {
    const element = createElement({ width: '50%' });

    const result = parseBoxModel(element, 400, 800);

    expect(result.width).toBe(200);
  });

  it('vh/vw 계산', () => {
    const element = createElement({ width: '10vw', height: '20vh' });

    const result = parseBoxModel(element, 400, 800, 1920, 1080);

    expect(result.width).toBe(192); // 1920 * 0.1
    expect(result.height).toBe(216); // 1080 * 0.2
  });
});

describe('parseVerticalAlign', () => {
  it('undefined이면 baseline 반환', () => {
    expect(parseVerticalAlign(undefined)).toBe('baseline');
  });

  it('verticalAlign 없으면 baseline 반환', () => {
    expect(parseVerticalAlign({})).toBe('baseline');
  });

  it('top 값 파싱', () => {
    expect(parseVerticalAlign({ verticalAlign: 'top' })).toBe('top');
  });

  it('bottom 값 파싱', () => {
    expect(parseVerticalAlign({ verticalAlign: 'bottom' })).toBe('bottom');
  });

  it('middle 값 파싱', () => {
    expect(parseVerticalAlign({ verticalAlign: 'middle' })).toBe('middle');
  });

  it('baseline 값 파싱', () => {
    expect(parseVerticalAlign({ verticalAlign: 'baseline' })).toBe('baseline');
  });

  it('text-top은 baseline으로 폴백 (미지원)', () => {
    expect(parseVerticalAlign({ verticalAlign: 'text-top' })).toBe('baseline');
  });

  it('알 수 없는 값은 baseline으로 폴백', () => {
    expect(parseVerticalAlign({ verticalAlign: 'unknown' })).toBe('baseline');
  });
});

describe('parseLineHeight', () => {
  it('undefined이면 undefined 반환', () => {
    expect(parseLineHeight(undefined)).toBeUndefined();
  });

  it('normal이면 undefined 반환', () => {
    expect(parseLineHeight({ lineHeight: 'normal' })).toBeUndefined();
  });

  it('숫자 (배율) 파싱', () => {
    // 1.5 배율, 기본 폰트 16px
    expect(parseLineHeight({ lineHeight: 1.5 })).toBe(24);
  });

  it('숫자 (배율) + fontSize 지정', () => {
    expect(parseLineHeight({ lineHeight: 1.5 }, 20)).toBe(30);
  });

  it('px 값 파싱', () => {
    expect(parseLineHeight({ lineHeight: '24px' })).toBe(24);
  });

  it('숫자 문자열 (배율) 파싱', () => {
    expect(parseLineHeight({ lineHeight: '1.5' })).toBe(24);
  });
});

describe('calculateBaseline', () => {
  it('일반 요소는 폰트 메트릭 기반 ascent가 baseline', () => {
    const element = createElement({ height: 100 });
    const baseline = calculateBaseline(element, 100);

    // Wave 3: measureFontMetrics() 기반 정밀 계산
    // 테스트 환경(jsdom)에서는 Canvas 2D 미지원 → fontSize * 0.8 근사값
    // 기본 fontSize=16, ascent=12.8
    expect(baseline).toBe(12.8);
  });

  it('overflow: hidden이면 하단이 baseline', () => {
    const element = createElement({ overflow: 'hidden' });
    const baseline = calculateBaseline(element, 100);

    expect(baseline).toBe(100);
  });

  it('overflow: auto이면 하단이 baseline', () => {
    const element = createElement({ overflow: 'auto' });
    const baseline = calculateBaseline(element, 100);

    expect(baseline).toBe(100);
  });

  it('overflow: scroll이면 하단이 baseline', () => {
    const element = createElement({ overflow: 'scroll' });
    const baseline = calculateBaseline(element, 100);

    expect(baseline).toBe(100);
  });

  it('overflowY: hidden이면 하단이 baseline', () => {
    const element = createElement({ overflowY: 'hidden' });
    const baseline = calculateBaseline(element, 100);

    expect(baseline).toBe(100);
  });

  it('높이 0이면 baseline도 0', () => {
    const element = createElement({});
    const baseline = calculateBaseline(element, 0);

    expect(baseline).toBe(0);
  });
});

describe('calculateContentHeight (line-height 반영)', () => {
  it('lineHeight px값이 있으면 해당 값 반환', () => {
    const element = createElement({ lineHeight: '40px' });
    const result = calculateContentHeight(element);
    expect(result).toBe(40);
  });

  it('lineHeight 배율이 있으면 fontSize × 배율 반환', () => {
    const element = createElement({ lineHeight: 1.5, fontSize: 20 });
    const result = calculateContentHeight(element);
    // parseLineHeight(style, 20) = 1.5 * 20 = 30
    expect(result).toBe(30);
  });

  it('lineHeight normal이면 태그별 기본 높이 사용', () => {
    const element = {
      id: 'test',
      type: 'div',
      tag: 'p',
      props: { style: { lineHeight: 'normal' } },
      children: [],
    } as unknown as Element;
    const result = calculateContentHeight(element);
    // p 태그 기본 높이 24
    expect(result).toBe(24);
  });

  it('lineHeight 미지정이면 태그별 기본 높이 사용', () => {
    const element = {
      id: 'test',
      type: 'div',
      tag: 'p',
      props: { style: {} },
      children: [],
    } as unknown as Element;
    const result = calculateContentHeight(element);
    expect(result).toBe(24);
  });

  it('명시적 height가 있으면 lineHeight보다 우선', () => {
    const element = createElement({ height: 60, lineHeight: '40px' });
    const result = calculateContentHeight(element);
    expect(result).toBe(60);
  });
});

describe('parseBoxModel (Phase 11)', () => {
  it('box-sizing: border-box에서 padding/border가 width에서 차감', () => {
    const element = createElement({
      width: 200,
      height: 100,
      boxSizing: 'border-box',
      paddingLeft: 10,
      paddingRight: 10,
      borderLeftWidth: 2,
      borderRightWidth: 2,
      paddingTop: 5,
      paddingBottom: 5,
      borderTopWidth: 1,
      borderBottomWidth: 1,
    });

    const result = parseBoxModel(element, 400, 800);

    // content-box width: 200 - 10 - 10 - 2 - 2 = 176
    expect(result.width).toBe(176);
    // content-box height: 100 - 5 - 5 - 1 - 1 = 88
    expect(result.height).toBe(88);
  });

  it('min/max width/height 파싱', () => {
    const element = createElement({
      width: 200,
      minWidth: 100,
      maxWidth: 300,
      minHeight: 50,
      maxHeight: 400,
    });

    const result = parseBoxModel(element, 400, 800);

    expect(result.minWidth).toBe(100);
    expect(result.maxWidth).toBe(300);
    expect(result.minHeight).toBe(50);
    expect(result.maxHeight).toBe(400);
  });
});

describe('resetWarnedTokens', () => {
  beforeEach(() => {
    resetWarnedTokens();
  });

  it('경고 초기화 후 다시 경고 가능', () => {
    // 이 테스트는 경고가 1회만 출력되는지 직접 검증하기 어려움
    // resetWarnedTokens가 에러 없이 실행되는지만 확인
    expect(() => resetWarnedTokens()).not.toThrow();
  });
});

// §6 P1 회귀 테스트
describe('getButtonSizeConfig (§6 P1 단일 소스)', () => {
  it('button → BUTTON_SIZE_CONFIG sm 기본값', () => {
    const config = getButtonSizeConfig('button');
    expect(config).not.toBeNull();
    expect(config!.paddingY).toBe(8);
    expect(config!.paddingX).toBe(12);
    expect(config!.fontSize).toBe(14);
    expect(config!.borderWidth).toBe(1);
  });

  it('button md 크기', () => {
    const config = getButtonSizeConfig('button', 'md');
    expect(config).not.toBeNull();
    expect(config!.paddingY).toBe(12);
    expect(config!.paddingX).toBe(16);
    expect(config!.fontSize).toBe(16);
  });

  it('submitbutton → button과 동일 config 사용', () => {
    const btn = getButtonSizeConfig('button', 'sm');
    const submit = getButtonSizeConfig('submitbutton', 'sm');
    expect(submit).toEqual(btn);
  });

  it('fancybutton → button과 동일 config 사용', () => {
    const btn = getButtonSizeConfig('button', 'lg');
    const fancy = getButtonSizeConfig('fancybutton', 'lg');
    expect(fancy).toEqual(btn);
  });

  it('togglebutton → TOGGLEBUTTON_SIZE_CONFIG md 기본값', () => {
    const config = getButtonSizeConfig('togglebutton');
    expect(config).not.toBeNull();
    expect(config!.paddingY).toBe(12);
    expect(config!.paddingX).toBe(16);
    expect(config!.fontSize).toBe(16);
  });

  it('div → null (비 버튼 태그)', () => {
    expect(getButtonSizeConfig('div')).toBeNull();
  });

  it('대소문자 무관', () => {
    const lower = getButtonSizeConfig('button', 'sm');
    const upper = getButtonSizeConfig('Button', 'sm');
    expect(upper).toEqual(lower);
  });
});

describe('INLINE_BLOCK_TAGS', () => {
  it('submitbutton, fancybutton 포함', () => {
    expect(INLINE_BLOCK_TAGS.has('submitbutton')).toBe(true);
    expect(INLINE_BLOCK_TAGS.has('fancybutton')).toBe(true);
  });

  it('div, section 미포함', () => {
    expect(INLINE_BLOCK_TAGS.has('div')).toBe(false);
    expect(INLINE_BLOCK_TAGS.has('section')).toBe(false);
  });
});

describe('enrichWithIntrinsicSize (§6 P1)', () => {
  function createTagElement(tag: string, style?: Record<string, unknown>, props?: Record<string, unknown>): Element {
    return {
      id: 'test-' + tag,
      tag,
      props: { ...(props ?? {}), style: style ?? {} },
      children: [],
    } as unknown as Element;
  }

  // 테스트 환경에 Canvas API가 없으므로, fontSize를 명시하여 Canvas 폴백 경로 사용.
  // enrichWithIntrinsicSize → parseBoxModel → calculateContentHeight에서
  // BUTTON_SIZE_CONFIG 기반 텍스트 높이(fontSize * 1.2)를 반환하면 height가 주입됨.

  it('button (height auto, 명시적 fontSize) → height 주입', () => {
    const el = createTagElement('button', { fontSize: 14 }, { children: 'Click me', size: 'sm' });
    const enriched = enrichWithIntrinsicSize(el, 400, 800);
    const enrichedStyle = (enriched.props as Record<string, unknown>).style as Record<string, unknown>;
    // height는 contentHeight + padding + border로 주입됨
    expect(enrichedStyle.height).toBeGreaterThan(0);
  });

  it('submitbutton (height auto) → height 주입', () => {
    const el = createTagElement('submitbutton', { fontSize: 14 }, { children: 'Submit', size: 'sm' });
    const enriched = enrichWithIntrinsicSize(el, 400, 800);
    const enrichedStyle = (enriched.props as Record<string, unknown>).style as Record<string, unknown>;
    expect(enrichedStyle.height).toBeGreaterThan(0);
  });

  it('fancybutton (height auto) → height 주입', () => {
    const el = createTagElement('fancybutton', { fontSize: 16 }, { children: 'Fancy', size: 'md' });
    const enriched = enrichWithIntrinsicSize(el, 400, 800);
    const enrichedStyle = (enriched.props as Record<string, unknown>).style as Record<string, unknown>;
    expect(enrichedStyle.height).toBeGreaterThan(0);
  });

  it('togglebutton (height auto) → height 주입', () => {
    const el = createTagElement('togglebutton', { fontSize: 16 }, { children: 'Toggle', size: 'md' });
    const enriched = enrichWithIntrinsicSize(el, 400, 800);
    const enrichedStyle = (enriched.props as Record<string, unknown>).style as Record<string, unknown>;
    expect(enrichedStyle.height).toBeGreaterThan(0);
  });

  it('button (명시적 height) → 주입 스킵', () => {
    const el = createTagElement('button', { height: 50, width: 100 }, { children: 'Click' });
    const enriched = enrichWithIntrinsicSize(el, 400, 800);
    const enrichedStyle = (enriched.props as Record<string, unknown>).style as Record<string, unknown>;
    expect(enrichedStyle.height).toBe(50);
  });

  it('badge (height/width auto) → width + height 주입', () => {
    const el = createTagElement('badge', { fontSize: 16 }, { children: 'New', size: 'md' });
    const enriched = enrichWithIntrinsicSize(el, 400, 800);
    const enrichedStyle = (enriched.props as Record<string, unknown>).style as Record<string, unknown>;
    expect(enrichedStyle.height).toBeGreaterThan(0);
    expect(enrichedStyle.width).toBeGreaterThan(0);
  });

  it('div (height auto) → 변경 없음 (컨테이너)', () => {
    const el = createTagElement('div', {});
    const enriched = enrichWithIntrinsicSize(el, 400, 800);
    expect(enriched).toBe(el); // 동일 참조 유지
  });

  it('button/submitbutton/fancybutton이 동일한 sm height 반환', () => {
    const makeBtn = (tag: string) =>
      createTagElement(tag, { fontSize: 14 }, { children: 'Test', size: 'sm' });
    const btnH = ((enrichWithIntrinsicSize(makeBtn('button'), 400, 800).props as Record<string, unknown>).style as Record<string, unknown>).height;
    const subH = ((enrichWithIntrinsicSize(makeBtn('submitbutton'), 400, 800).props as Record<string, unknown>).style as Record<string, unknown>).height;
    const fncH = ((enrichWithIntrinsicSize(makeBtn('fancybutton'), 400, 800).props as Record<string, unknown>).style as Record<string, unknown>).height;
    expect(subH).toBe(btnH);
    expect(fncH).toBe(btnH);
  });
});
