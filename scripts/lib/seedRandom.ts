/**
 * Seeded Random Number Generator
 *
 * 🚀 Phase 8 C1: Fixed Seed Generator
 *
 * 재현 가능한 랜덤 시퀀스를 생성합니다.
 * Mulberry32 알고리즘 사용 (빠르고 품질 좋음)
 *
 * 사용법:
 * ```typescript
 * const rng = createSeededRandom(12345);
 * rng.next();      // 0-1 사이 값
 * rng.nextInt(10); // 0-9 사이 정수
 * rng.pick(array); // 배열에서 랜덤 선택
 * rng.shuffle(array); // 배열 셔플
 * ```
 *
 * @since 2025-12-11 Phase 8 C1
 */

// ============================================
// Types
// ============================================

export interface SeededRandom {
  /** 0-1 사이 랜덤 값 */
  next(): number;

  /** 0부터 max-1까지 정수 */
  nextInt(max: number): number;

  /** min부터 max까지 정수 (inclusive) */
  nextIntRange(min: number, max: number): number;

  /** 배열에서 랜덤 선택 */
  pick<T>(array: T[]): T;

  /** 배열에서 n개 랜덤 선택 (중복 없음) */
  sample<T>(array: T[], n: number): T[];

  /** 배열 셔플 (원본 변경 없음) */
  shuffle<T>(array: T[]): T[];

  /** true/false 확률 기반 */
  chance(probability: number): boolean;

  /** 정규 분포 근사 */
  gaussian(mean: number, stddev: number): number;

  /** 현재 시드 */
  readonly seed: number;

  /** 시드 재설정 */
  reset(newSeed?: number): void;
}

// ============================================
// Mulberry32 Algorithm
// ============================================

/**
 * Mulberry32 PRNG
 * 빠르고 품질 좋은 32비트 PRNG
 */
function mulberry32(seed: number): () => number {
  let state = seed;

  return function () {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================
// Factory
// ============================================

/**
 * Seeded Random Generator 생성
 */
export function createSeededRandom(seed?: number): SeededRandom {
  // 기본 시드: 현재 시간 기반 (재현 시 명시적 시드 필요)
  let currentSeed = seed ?? Date.now();
  let generator = mulberry32(currentSeed);

  const rng: SeededRandom = {
    get seed() {
      return currentSeed;
    },

    reset(newSeed?: number) {
      currentSeed = newSeed ?? currentSeed;
      generator = mulberry32(currentSeed);
    },

    next() {
      return generator();
    },

    nextInt(max: number) {
      return Math.floor(generator() * max);
    },

    nextIntRange(min: number, max: number) {
      return Math.floor(generator() * (max - min + 1)) + min;
    },

    pick<T>(array: T[]): T {
      if (array.length === 0) {
        throw new Error('Cannot pick from empty array');
      }
      return array[Math.floor(generator() * array.length)];
    },

    sample<T>(array: T[], n: number): T[] {
      if (n > array.length) {
        throw new Error('Sample size cannot exceed array length');
      }
      const shuffled = rng.shuffle(array);
      return shuffled.slice(0, n);
    },

    shuffle<T>(array: T[]): T[] {
      const result = [...array];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(generator() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    },

    chance(probability: number): boolean {
      return generator() < probability;
    },

    gaussian(mean: number, stddev: number): number {
      // Box-Muller transform
      const u1 = generator();
      const u2 = generator();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return mean + z * stddev;
    },
  };

  return rng;
}

// ============================================
// Test Data Generators
// ============================================

/**
 * 테스트용 Element 데이터 생성
 */
export interface TestElement {
  id: string;
  tag: string;
  props: Record<string, unknown>;
  parent_id: string | null;
  page_id: string;
  order_num: number;
}

export interface TestPage {
  id: string;
  title: string;
  slug: string;
  order_num: number;
}

export interface TestDataConfig {
  elementCount: number;
  pageCount: number;
  maxDepth?: number;
  tags?: string[];
}

const DEFAULT_TAGS = [
  'div',
  'section',
  'article',
  'span',
  'p',
  'h1',
  'h2',
  'h3',
  'button',
  'input',
  'img',
  'a',
];

/**
 * 재현 가능한 테스트 데이터 생성
 */
export function generateTestData(
  rng: SeededRandom,
  config: TestDataConfig
): { pages: TestPage[]; elements: TestElement[] } {
  const { elementCount, pageCount, maxDepth = 5, tags = DEFAULT_TAGS } = config;

  // 페이지 생성
  const pages: TestPage[] = [];
  for (let i = 0; i < pageCount; i++) {
    pages.push({
      id: `page-${i}`,
      title: `Page ${i + 1}`,
      slug: i === 0 ? '/' : `/page-${i}`,
      order_num: i,
    });
  }

  // 요소 생성
  const elements: TestElement[] = [];
  const elementsPerPage = Math.ceil(elementCount / pageCount);

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const pageId = pages[pageIndex].id;
    const pageElements: TestElement[] = [];
    const parentCandidates: string[] = []; // parent_id 후보

    for (let i = 0; i < elementsPerPage && elements.length < elementCount; i++) {
      const elementId = `el-${pageIndex}-${i}`;
      const tag = rng.pick(tags);

      // 부모 결정 (depth 제한)
      let parentId: string | null = null;
      if (i > 0 && rng.chance(0.7)) {
        // 70% 확률로 부모 있음
        const depth = getDepth(pageElements, parentCandidates[parentCandidates.length - 1]);
        if (depth < maxDepth && parentCandidates.length > 0) {
          parentId = rng.pick(parentCandidates);
        }
      }

      const element: TestElement = {
        id: elementId,
        tag,
        props: generateProps(rng, tag),
        parent_id: parentId,
        page_id: pageId,
        order_num: i,
      };

      pageElements.push(element);
      elements.push(element);

      // 컨테이너 태그만 부모 후보에 추가
      if (['div', 'section', 'article', 'form'].includes(tag)) {
        parentCandidates.push(elementId);
      }
    }
  }

  return { pages, elements };
}

/**
 * 요소의 depth 계산
 */
function getDepth(elements: TestElement[], elementId: string | null): number {
  if (!elementId) return 0;
  const element = elements.find((e) => e.id === elementId);
  if (!element) return 0;
  return 1 + getDepth(elements, element.parent_id);
}

/**
 * 태그별 props 생성
 */
function generateProps(rng: SeededRandom, tag: string): Record<string, unknown> {
  const baseProps: Record<string, unknown> = {
    style: {
      padding: `${rng.nextIntRange(4, 24)}px`,
      margin: `${rng.nextIntRange(0, 16)}px`,
    },
  };

  switch (tag) {
    case 'button':
      return {
        ...baseProps,
        children: `Button ${rng.nextInt(100)}`,
        variant: rng.pick(['default', 'primary', 'secondary']),
      };
    case 'input':
      return {
        ...baseProps,
        placeholder: `Input ${rng.nextInt(100)}`,
        type: rng.pick(['text', 'email', 'password', 'number']),
      };
    case 'img':
      return {
        ...baseProps,
        src: `https://picsum.photos/seed/${rng.nextInt(1000)}/200/200`,
        alt: `Image ${rng.nextInt(100)}`,
      };
    case 'a':
      return {
        ...baseProps,
        href: `#link-${rng.nextInt(100)}`,
        children: `Link ${rng.nextInt(100)}`,
      };
    case 'h1':
    case 'h2':
    case 'h3':
      return {
        ...baseProps,
        children: `Heading ${rng.nextInt(100)}`,
      };
    case 'p':
    case 'span':
      return {
        ...baseProps,
        children: `Text content ${rng.nextInt(1000)}`,
      };
    default:
      return baseProps;
  }
}

// ============================================
// Action Sequences
// ============================================

export type ActionType =
  | 'selectElement'
  | 'switchPanel'
  | 'changeProperty'
  | 'undo'
  | 'redo'
  | 'switchPage'
  | 'scroll'
  | 'addElement'
  | 'deleteElement';

export interface TestAction {
  type: ActionType;
  target?: string;
  value?: unknown;
  timestamp: number;
}

/**
 * 재현 가능한 액션 시퀀스 생성
 */
export function generateActionSequence(
  rng: SeededRandom,
  count: number,
  elements: TestElement[],
  pages: TestPage[]
): TestAction[] {
  const actions: TestAction[] = [];
  const actionTypes: ActionType[] = [
    'selectElement',
    'selectElement', // 가중치
    'switchPanel',
    'changeProperty',
    'changeProperty', // 가중치
    'undo',
    'redo',
    'switchPage',
    'scroll',
  ];

  for (let i = 0; i < count; i++) {
    const type = rng.pick(actionTypes);
    const action: TestAction = {
      type,
      timestamp: i * 100, // 100ms 간격
    };

    switch (type) {
      case 'selectElement':
        action.target = rng.pick(elements).id;
        break;
      case 'switchPanel':
        action.target = rng.pick(['properties', 'styles', 'events', 'layers']);
        break;
      case 'changeProperty':
        action.target = rng.pick(elements).id;
        action.value = { width: `${rng.nextIntRange(100, 500)}px` };
        break;
      case 'switchPage':
        action.target = rng.pick(pages).id;
        break;
      case 'scroll':
        action.value = { x: rng.nextIntRange(0, 1000), y: rng.nextIntRange(0, 2000) };
        break;
    }

    actions.push(action);
  }

  return actions;
}

// ============================================
// Export Default Seed
// ============================================

/** 기본 테스트 시드 (재현 가능) */
export const DEFAULT_TEST_SEED = 20251211;

export default createSeededRandom;
