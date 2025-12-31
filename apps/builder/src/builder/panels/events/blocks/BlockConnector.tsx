/**
 * BlockConnector - 블록 간 연결선
 *
 * 블록들 사이의 시각적 연결을 표현
 * - down: 단순 아래 연결
 * - split: Y자 분기 연결 (THEN/ELSE)
 */

interface BlockConnectorProps {
  /** 연결 방향 */
  direction: 'down' | 'split';

  /** 커스텀 클래스명 */
  className?: string;
}

/**
 * 블록 연결선 컴포넌트
 *
 * @example
 * // 단순 연결
 * <BlockConnector direction="down" />
 *
 * // 분기 연결
 * <BlockConnector direction="split" />
 */
export function BlockConnector({
  direction,
  className = '',
}: BlockConnectorProps) {
  return (
    <div
      className={`block-connector ${direction} ${className}`.trim()}
      role="presentation"
      aria-hidden="true"
    />
  );
}
