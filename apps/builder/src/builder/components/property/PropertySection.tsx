/**
 * PropertySection - Section의 하위호환 alias
 *
 * 기존 import 경로를 유지하면서 Section 컴포넌트로 위임.
 * 새 코드에서는 Section을 직접 import 권장.
 */

export { Section as PropertySection } from "../panel/Section";
export type { SectionProps as PropertySectionProps } from "../panel/Section";
