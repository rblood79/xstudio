/**
 * styleOptions - 스타일 편집에 사용되는 옵션 목록
 */

export const FONT_FAMILIES = [
  { value: 'auto', label: 'auto' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' },
] as const;

export const FONT_WEIGHTS = [
  { value: 'auto', label: 'auto' },
  { value: '100', label: '100 - Thin' },
  { value: '200', label: '200 - Extra Light' },
  { value: '300', label: '300 - Light' },
  { value: '400', label: '400 - Normal' },
  { value: '500', label: '500 - Medium' },
  { value: '600', label: '600 - Semi Bold' },
  { value: '700', label: '700 - Bold' },
  { value: '800', label: '800 - Extra Bold' },
  { value: '900', label: '900 - Black' },
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Bold' },
] as const;

export const BORDER_STYLES = [
  { value: 'auto', label: 'auto' },
  { value: 'none', label: 'none' },
  { value: 'solid', label: 'solid' },
  { value: 'dashed', label: 'dashed' },
  { value: 'dotted', label: 'dotted' },
  { value: 'double', label: 'double' },
  { value: 'groove', label: 'groove' },
  { value: 'ridge', label: 'ridge' },
  { value: 'inset', label: 'inset' },
  { value: 'outset', label: 'outset' },
] as const;

export const UNIT_OPTIONS = {
  size: ['px', '%', 'rem', 'em', 'vh', 'vw', 'auto'],
  spacing: ['auto', 'px', 'rem', 'em'],
  border: ['auto', 'px'],
  font: ['auto', 'px', 'rem', 'em', 'pt'],
  lineHeight: ['auto', 'px', 'rem', 'em', ''],
} as const;
