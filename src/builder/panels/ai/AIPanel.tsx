/**
 * AIPanel - AI 어시스턴트 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * Groq 서비스를 사용한 AI 기반 빌더 인터랙션 제공
 */

import type { PanelProps } from '../core/types';
import { ChatInterface } from './ChatInterface';
import './index.css';

export function AIPanel({ isActive }: PanelProps) {
  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  return <ChatInterface />;
}
