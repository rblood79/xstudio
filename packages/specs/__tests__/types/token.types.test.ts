import { describe, it, expect } from 'vitest';
import { isValidTokenRef } from '../../src/types/token.types';

describe('isValidTokenRef', () => {
  describe('유효한 토큰 참조', () => {
    it.each([
      '{color.primary}',
      '{color.on-primary}',
      '{color.surface-container-high}',
      '{spacing.md}',
      '{spacing.2xl}',
      '{typography.text-sm}',
      '{typography.text-2xl}',
      '{radius.lg}',
      '{radius.full}',
      '{shadow.md}',
      '{shadow.focus-ring}',
    ])('"%s"는 유효한 토큰 참조', (ref) => {
      expect(isValidTokenRef(ref)).toBe(true);
    });
  });

  describe('무효한 토큰 참조', () => {
    it.each([
      ['color.primary', '중괄호 없음'],
      ['{invalid.primary}', '잘못된 카테고리'],
      ['{color}', '이름 없음 (점 없음)'],
      ['', '빈 문자열'],
      ['{color.}', '이름 비어 있음'],
      ['{color.primary', '닫는 괄호 없음'],
      ['color.primary}', '여는 괄호 없음'],
      ['{}', '카테고리와 이름 없음'],
      ['{.primary}', '카테고리 없음'],
      ['{foo.bar}', '알 수 없는 카테고리'],
    ])('"%s" — %s', (ref) => {
      expect(isValidTokenRef(ref)).toBe(false);
    });
  });
});
