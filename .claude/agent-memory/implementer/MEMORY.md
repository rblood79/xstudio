# Implementer Memory — composition

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

## ADR-903 P1 Legacy Adapter (2026-04-25)

### 신규 파일 (Stream 1)

- `apps/builder/src/adapters/canonical/types.ts` — `LegacyAdapterInput` / `ConvertComponentRoleFn` / `ConvertSlotElementFn` / `ConvertPageLayoutFn` 타입 계약
- `apps/builder/src/adapters/canonical/tagRename.ts` — `tagToType()` / `isLegacySlotTag()` helper
- `apps/builder/src/adapters/canonical/idPath.ts` — `buildIdPathContext()` — UUID → stable id path 트리 순회
- `apps/builder/src/adapters/canonical/index.ts` — `legacyToCanonical()` main pipeline (DI deps: `convertComponentRole` / `convertPageLayout`)

### Element import 경로 주의

- `@/types/builder/unified.types` — builder 내부 canonical `Element` / `Page` (full 필드)
- `@/types/builder/layout.types` — `Layout` / `SlotProps` (legacy)
- `@composition/shared` — `CanonicalNode` / `RefNode` / `CompositionDocument` (P0 타입)
- `packages/shared`의 `element.types.ts`에도 `Element`가 있으나 builder 내부에서는 `unified.types` 사용

### Ordering 정책

- reusable masters 먼저, pages 다음 (`children: [...reusableMasters, ...pageNodes]`)
- resolver가 순서 의존 없이도 동작해야 하지만, 직렬화 가독성 + diff 안정성을 위해 masters first

### Stream 2 (componentRoleAdapter.ts)

- 이미 병렬 land 됨 (`@composition/shared`의 `Element` import — 호환 확인됨)
- `componentRole === "master"` → `reusable: true`
- `componentRole === "instance"` + `masterId` → `ref: <stable path>` (idPathMap 경유)
- legacy descendants (UUID key) → mode A patch (idPathMap remap)

## ADR-903 P0 Canonical Format (2026-04-25)

### 신규 파일 (타입 전용, 런타임 없음)

- `packages/shared/src/types/composition-vocabulary.ts` — `ComponentTag` literal union (121개 = 118 component + ref/frame/group) + `isCanonicalNode()` runtime guard
- `packages/shared/src/types/composition-document.types.ts` — `CanonicalNode` / `FrameNode` / `RefNode` / `DescendantOverride` 3-mode union / `CompositionDocument` / `migrate()` stub
- `packages/shared/src/types/index.ts` — 두 파일 re-export 추가

### ComponentTag 실측

- `packages/specs/src/components/*.spec.ts` 파일명 기준 **118개** (ADR 문서 예상 116과 차이 있음, Slot/Switcher/Autocomplete 등 포함)
- pencil 구조 타입 3개 포함 총 **121 literal**

### DescendantOverride 3-mode 패턴

- **(A) 속성 patch**: `id?: never; type?: never; children?: never` — `[key: string]: unknown` 인덱스 시그니처
- **(B) node replacement**: `CanonicalNode` 자체 (`type` 필수 존재)
- **(C) children replacement**: `type?: never; children: CanonicalNode[]`
- TypeScript 판별 기준: `type` 존재 여부 + `children` 존재 여부

## 알려진 패턴

### ADR 문서 검증 방법

1. Glob으로 실제 파일 목록 확인
2. 핵심 파일 Read로 구현 상세 확인
3. 설계 vs 실제 차이표 작성
4. 문서 하단에 `## N. 코드 대조 검증 이력` 섹션 추가

### PropertyEditor 추가 패턴 (ADR-099 Phase 4)

`registry.ts.getCustomPreEditor(type)` 에 새 타입을 추가할 때:

1. `apps/builder/src/builder/panels/properties/editors/{Type}PropertyEditor.tsx` 파일 생성
2. TagGroupPropertyEditor 패턴 (pass-through) 또는 ListBoxPropertyEditor 패턴 (모드 분기) 선택
3. `getPropertyEditorSpec(type)` 이 specRegistry에 등록된 스펙을 반환하면 단순 pass-through로 충분
4. 파일이 없으면 warn 로그 + spec-first fallback → 정상 작동하지만 warn 노이즈 발생

관련 파일:

- `apps/builder/src/builder/inspector/editors/registry.ts` — getCustomPreEditor switch
- `apps/builder/src/builder/panels/properties/specRegistry.ts` — ComponentSpec 등록
- `apps/builder/src/builder/panels/properties/generic/SpecField.tsx` — items-manager/children-manager 처리
- `apps/builder/src/builder/panels/properties/generic/ItemsManager.tsx` — Section/Separator UI (allowSections, allowSeparators, sectionHasSelection 플래그)
