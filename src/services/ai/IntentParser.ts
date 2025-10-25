/**
 * Intent Parser
 *
 * Fallback rule-based parser for when AI is unavailable
 * Provides simple pattern matching for common design requests
 */

import type { ComponentIntent, BuilderContext } from '../../types/chat';

export class IntentParser {
  /**
   * Parse user message into component intent using rule-based patterns
   */
  parse(message: string, context?: BuilderContext): ComponentIntent | null {
    const lowercased = message.toLowerCase();

    // Try each pattern in order
    const parsers = [
      this.parseButtonCreation,
      this.parseTableCreation,
      this.parseFormCreation,
      this.parseSelectCreation,
      this.parseStyleChange,
      this.parseLayoutChange,
      this.parseColorChange,
      this.parseDeleteAction,
    ];

    for (const parser of parsers) {
      const intent = parser.call(this, lowercased, message, context);
      if (intent) return intent;
    }

    return null;
  }

  /**
   * Button creation patterns
   */
  private parseButtonCreation(lowercased: string, original: string, _context?: BuilderContext): ComponentIntent | null {
    const buttonPatterns = ['버튼', 'button', '버튼을', '버튼 만'];
    const createPatterns = ['만들', '추가', '넣어', 'create', 'add'];

    const hasButton = buttonPatterns.some((p) => lowercased.includes(p));
    const hasCreate = createPatterns.some((p) => lowercased.includes(p));

    if (hasButton && hasCreate) {
      return {
        action: 'create',
        componentType: 'Button',
        props: {
          children: this.extractText(original, ['버튼', 'button']) || '버튼',
        },
        styles: this.extractStyles(lowercased),
        description: '버튼 컴포넌트를 생성합니다.',
      };
    }

    return null;
  }

  /**
   * Table creation patterns
   */
  private parseTableCreation(lowercased: string, _original: string, _context?: BuilderContext): ComponentIntent | null {
    const tablePatterns = ['테이블', 'table', '표', '목록'];
    const hasTable = tablePatterns.some((p) => lowercased.includes(p));

    if (hasTable) {
      const endpoint = this.guessDataEndpoint(lowercased);

      return {
        action: 'create',
        componentType: 'Table',
        dataBinding: endpoint
          ? {
              baseUrl: 'MOCK_DATA',
              endpoint,
            }
          : undefined,
        description: '테이블 컴포넌트를 생성합니다.',
      };
    }

    return null;
  }

  /**
   * Form creation patterns
   */
  private parseFormCreation(lowercased: string, _original: string, _context?: BuilderContext): ComponentIntent | null {
    const formPatterns = ['폼', 'form', '입력폼', '양식'];
    const hasForm = formPatterns.some((p) => lowercased.includes(p));

    if (hasForm) {
      return {
        action: 'create',
        componentType: 'Form',
        description: '폼 컴포넌트를 생성합니다.',
      };
    }

    return null;
  }

  /**
   * Select/Dropdown creation patterns
   */
  private parseSelectCreation(lowercased: string, _original: string, _context?: BuilderContext): ComponentIntent | null {
    const selectPatterns = ['선택', 'select', '드롭다운', 'dropdown'];
    const hasSelect = selectPatterns.some((p) => lowercased.includes(p));

    if (hasSelect) {
      const endpoint = this.guessDataEndpoint(lowercased);

      return {
        action: 'create',
        componentType: 'Select',
        dataBinding: endpoint
          ? {
              baseUrl: 'MOCK_DATA',
              endpoint,
            }
          : undefined,
        description: 'Select 컴포넌트를 생성합니다.',
      };
    }

    return null;
  }

  /**
   * Style change patterns
   */
  private parseStyleChange(lowercased: string, _original: string, context?: BuilderContext): ComponentIntent | null {
    const stylePatterns = ['색', 'color', '크기', 'size', '스타일'];
    const changePatterns = ['바꿔', '변경', '수정', 'change'];

    const hasStyle = stylePatterns.some((p) => lowercased.includes(p));
    const hasChange = changePatterns.some((p) => lowercased.includes(p));

    if (hasStyle && hasChange && context?.selectedElementId) {
      return {
        action: 'style',
        targetElementId: context.selectedElementId,
        styles: this.extractStyles(lowercased),
        description: '선택된 요소의 스타일을 변경합니다.',
      };
    }

    return null;
  }

  /**
   * Layout change patterns
   */
  private parseLayoutChange(lowercased: string, _original: string, context?: BuilderContext): ComponentIntent | null {
    const layoutPatterns = ['정렬', 'align', 'layout', '배치'];
    const hasLayout = layoutPatterns.some((p) => lowercased.includes(p));

    if (hasLayout && context?.selectedElementId) {
      const styles: Record<string, string> = {};

      if (lowercased.includes('왼쪽') || lowercased.includes('left')) {
        styles.justifyContent = 'flex-start';
        styles.textAlign = 'left';
      } else if (lowercased.includes('오른쪽') || lowercased.includes('right')) {
        styles.justifyContent = 'flex-end';
        styles.textAlign = 'right';
      } else if (lowercased.includes('가운데') || lowercased.includes('중앙') || lowercased.includes('center')) {
        styles.justifyContent = 'center';
        styles.textAlign = 'center';
      }

      if (Object.keys(styles).length > 0) {
        return {
          action: 'style',
          targetElementId: context.selectedElementId,
          styles,
          description: '선택된 요소의 정렬을 변경합니다.',
        };
      }
    }

    return null;
  }

  /**
   * Color change patterns
   */
  private parseColorChange(lowercased: string, _original: string, context?: BuilderContext): ComponentIntent | null {
    const color = this.extractColor(lowercased);

    if (color && context?.selectedElementId) {
      return {
        action: 'style',
        targetElementId: context.selectedElementId,
        styles: {
          backgroundColor: color,
        },
        description: `배경색을 ${color}로 변경합니다.`,
      };
    }

    return null;
  }

  /**
   * Delete action patterns
   */
  private parseDeleteAction(lowercased: string, _original: string, context?: BuilderContext): ComponentIntent | null {
    const deletePatterns = ['삭제', '지워', '제거', 'delete', 'remove'];
    const hasDelete = deletePatterns.some((p) => lowercased.includes(p));

    if (hasDelete && context?.selectedElementId) {
      return {
        action: 'delete',
        targetElementId: context.selectedElementId,
        description: '선택된 요소를 삭제합니다.',
      };
    }

    return null;
  }

  /**
   * Extract text content from message
   */
  private extractText(message: string, keywords: string[]): string | null {
    // Find text after keywords
    for (const keyword of keywords) {
      const index = message.toLowerCase().indexOf(keyword);
      if (index !== -1) {
        const afterKeyword = message.slice(index + keyword.length).trim();
        // Extract quoted text or first few words
        const quoted = afterKeyword.match(/["'](.+?)["']/);
        if (quoted) return quoted[1];

        const words = afterKeyword.split(/\s+/).slice(0, 3).join(' ');
        if (words) return words;
      }
    }

    return null;
  }

  /**
   * Extract color from message
   */
  private extractColor(message: string): string | null {
    const colorMap: Record<string, string> = {
      빨강: 'red',
      빨간: 'red',
      파랑: 'blue',
      파란: 'blue',
      녹색: 'green',
      초록: 'green',
      노랑: 'yellow',
      노란: 'yellow',
      검정: 'black',
      검은: 'black',
      흰색: 'white',
      하얀: 'white',
      회색: 'gray',
      red: 'red',
      blue: 'blue',
      green: 'green',
      yellow: 'yellow',
      black: 'black',
      white: 'white',
      gray: 'gray',
    };

    for (const [kr, en] of Object.entries(colorMap)) {
      if (message.includes(kr)) return en;
    }

    return null;
  }

  /**
   * Extract styles from message
   */
  private extractStyles(message: string): Record<string, string> {
    const styles: Record<string, string> = {};

    const color = this.extractColor(message);
    if (color) {
      styles.backgroundColor = color;
    }

    return styles;
  }

  /**
   * Guess appropriate data endpoint from message
   */
  private guessDataEndpoint(message: string): string | null {
    const endpointMap: Record<string, string> = {
      국가: '/countries',
      나라: '/countries',
      country: '/countries',
      countries: '/countries',
      도시: '/cities',
      city: '/cities',
      cities: '/cities',
      제품: '/products',
      product: '/products',
      products: '/products',
      상태: '/status',
      status: '/status',
      사용자: '/users',
      유저: '/users',
      user: '/users',
      users: '/users',
      부서: '/departments',
      department: '/departments',
      departments: '/departments',
      언어: '/languages',
      language: '/languages',
      languages: '/languages',
      통화: '/currencies',
      currency: '/currencies',
      currencies: '/currencies',
    };

    for (const [keyword, endpoint] of Object.entries(endpointMap)) {
      if (message.includes(keyword)) return endpoint;
    }

    return null;
  }
}

/**
 * Singleton instance
 */
export const intentParser = new IntentParser();
