# Implementer Memory — XStudio

## 핵심 파일 경로

### AI Assistant (ADR-011)
- `apps/builder/src/services/ai/GroqAgentService.ts` — Agent Loop (MAX_TURNS=10, MAX_RETRIES=3)
- `apps/builder/src/services/ai/tools/` — 7개 도구 (createElement, updateElement, deleteElement, getEditorState, getSelection, searchElements, batchDesign)
- `apps/builder/src/services/ai/systemPrompt.ts` — 동적 시스템 프롬프트 (현재 빌더 상태 포함)
- `apps/builder/src/services/ai/styleAdapter.ts` — CSS 단위 정규화 (AI-A5a 완료)
- `apps/builder/src/builder/panels/ai/hooks/useAgentLoop.ts` — G.3 연동 + IntentParser fallback
- `apps/builder/src/builder/stores/aiVisualFeedback.ts` — 독립 Zustand 스토어 (렌더 루프 getState() 직접 읽기)
- `apps/builder/src/builder/stores/conversation.ts` — appendToLastMessage 포함

### ADR 문서
- `docs/adr/011-ai-assistant-design.md` — 2026-03-03 코드 대조 검증 완료 (섹션 12 참조)

## ADR-011 검증에서 확인된 실제 vs 설계 차이

### systemPrompt.ts
- 실제 컴포넌트 목록: ToggleButton, ToggleButtonGroup, Text, Div, Section, Nav 포함; Modal/Dialog 미포함
- 규칙: 5개 (batch_design 사용 권장 없음)
- 동적 컨텍스트: 페이지ID, 선택 요소 상세, 총 요소 수 포함

### styleAdapter.ts
- AI-A5a 완료: rem/em/vh/vw → px 단위 정규화 (`resolveCSSSizeValue` 사용)
- % 포함 값은 레이아웃 엔진이 처리하므로 그대로 유지
- CanvasKit fills/effects/stroke 변환은 차단됨 (ENGINE_CHECKLIST RC-3 선행 필요)

### AIPanel.tsx
- ToolCallMessage는 AIPanel에서 직접 import 안 함
- role='tool' 메시지는 ChatMessage 내부에서 ToolResultMessage 호출로 렌더링

## 알려진 패턴

### ADR 문서 검증 방법
1. Glob으로 실제 파일 목록 확인
2. 핵심 파일 Read로 구현 상세 확인
3. 설계 vs 실제 차이표 작성
4. 문서 하단에 `## N. 코드 대조 검증 이력` 섹션 추가
