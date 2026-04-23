# ADR-904 Breakdown: Fill SSOT + Preview/Publish 어댑터 전환

## 목표

- 저장 정본을 `fills`로 통일하되, Preview/Publish는 단계적으로 CSS 어댑터를 통해 소비한다.
- 기존 프로젝트 read-through 호환성과 undo/redo 정확도를 유지한다.

## 현재 진행 상태

- 2026-04-23 착수:
  - Phase 1 선행 구현: `fillMigration` 유틸 테스트 추가, synthetic legacy fill `id`를 고정해 read-through 편집 안정성 확보
  - Phase 1 consumer 정렬: `useFillActions`도 `ensureFills(backgroundColor)`를 읽도록 변경해 legacy `backgroundColor` only 요소 편집 가능화
  - Phase 2 선행 구현: `inspectorActions`의 commit/preview 경로를 단일 fill→CSS helper로 수렴
  - 회귀 테스트 추가: `useFillActions.test.tsx`, `fillMigration.test.ts`, `inspectorFills.test.ts`
  - Phase 3 구현: shared `fill -> CSS style` adapter 추가 후 Preview `body + renderElementInternal`, Publish `ElementRenderer`, Builder `useAppearanceValues`, Inspector swatch/virtual fill UI를 같은 파생 규칙으로 정렬
  - 회귀 테스트 추가: `packages/shared/src/utils/__tests__/fillAdapter.test.ts`, `useAppearanceValues.test.tsx`, `fillPresentation.test.ts`
  - Phase 4 rollout 문서화 완료
  - Phase 5 legacy 축소 기준선 정리 완료
  - 비-패널 외부 입력 경로 audit + canonicalization 완료
- 2026-04-24 기준:
  - P1~P5 구현 범위 완료
  - 후속 정리 완료: Fill commit/preview 경로의 derived background persistence 제거
  - "임의 비정형 background payload 정책"과 component-specific `backgroundColor` 예외 구분은 ADR-905에서 완료

## Phase Plan

### Phase 0 — Baseline 계측

- 범위
  - 현재 Fill 편집 경로의 이벤트/히스토리/저장 payload 계측
  - Preview/Publish 시각 캡처 baseline 확보
- 산출
  - 회귀 비교용 golden 샘플 세트
  - 주요 리스크 목록(gradient/image/mesh, border 분리)

### Phase 1 — Read-through 표준화

- 범위
  - 로드시 `fills` 부재 문서에 대해 `ensureFills(backgroundColor)` 강제
  - `var(...)`, `$--token` 입력의 fallback 정책 문서화
- 산출
  - read-through 유닛 테스트
  - legacy 문서 호환성 리포트
- 현재 상태
  - `fillMigration` 유닛 테스트 추가 완료
  - `useFillActions` 가 raw `fills` 대신 `ensureFills()`를 사용하도록 정렬 완료
  - synthetic fill `id` 안정화 완료
  - fallback 정책 문서화와 legacy 호환성 리포트는 미완료

### Phase 2 — Write-through 계약 강화

- 범위
  - Fill 편집 시 `fills` 저장 + CSS 파생 필드 동기화 일관성 보장
  - 드래그 프리뷰(lightweight)와 커밋 경로의 히스토리 무결성 검증
- 산출
  - inspectorActions 회귀 테스트
  - undo/redo 정확도 체크리스트
- 현재 상태
  - `inspectorActions` commit/preview 경로의 CSS 파생 동기화 helper 수렴 완료
  - `inspectorFills.test.ts` 추가 완료
  - lightweight preview vs commit/undo 시나리오 추가 확장은 미완료

### Phase 3 — Consumer 책임 분리

- 범위
  - Builder(Skia): Fill 직접 소비를 정식 계약으로 문서화
  - Preview/Publish(DOM): 어댑터 소비 계약 명문화
  - Border는 Fill과 별도 채널로 유지
- 산출
  - consumer contract 문서
  - Fill vs Border 리뷰 룰
- 현재 상태
  - Builder Skia는 `isFillV2Enabled() && fills.length > 0`일 때만 `fillsToSkiaFillColor()` / `fillsToSkiaFillStyle()`을 직접 사용하고, 아니면 기존 `backgroundColor/backgroundImage` fallback 유지
  - Preview/Publish는 공용 `adaptElementFillStyle()`로 `fills -> CSS background*` 파생만 소비하고 `fills` shape 자체는 직접 해석하지 않음
  - Inspector Appearance / Fill swatch도 같은 adapter/presentation helper를 사용하도록 정렬 완료
  - Fill vs Border 경계 규칙은 문서화 완료, 정적 검사/리뷰 룰 자동화는 미완료

#### Consumer Contract

- Builder Skia
  - direct source: top-level `fills`
  - gate: `VITE_FEATURE_FILL_V2=true`
  - fallback: `style.backgroundColor`, `style.backgroundImage`
- Preview DOM
  - direct source: `props.style`
  - adapter: `adaptElementFillStyle(element)`가 top-level `fills`를 `backgroundColor/backgroundImage/backgroundSize`로 파생
  - note: `body`는 일반 renderer 경로를 우회하므로 body effect에서 별도 adapter 적용
- Publish DOM
  - direct source: `props.style`
  - adapter: `ElementRenderer` 진입점에서 `adaptElementFillStyle(element)` 적용
- Inspector Appearance / Fill UI
  - direct source: `fills + style`
  - adapter/presentation: `adaptStyleWithFills()`, `buildFillSwatchStyle()`, `createVirtualColorFill()`
- Border
  - 별도 채널 유지. `borderColor/borderWidth/borderStyle`은 Fill adapter 대상이 아님

### Phase 4 — Feature Flag 롤아웃

- 범위
  - `VITE_FEATURE_FILL_V2` 기반 환경별 점진 배포
  - 오류율/회귀율 모니터링 대시보드 연결
- 산출
  - 배포 가이드
  - 롤백 플레이북
- 현재 상태
  - 실코드 기준 `VITE_FEATURE_FILL_V2` 직접 consumer는 Builder AppearanceSection UI 분기와 Skia fill direct-read 뿐임
  - Preview/Publish adapter는 플래그 비의존 경로로 동작하므로 rollout 중에도 CSS 파생 style parity를 유지
  - 환경별/프로젝트별 rollout 인프라는 아직 없음. 현재는 build-time env flag only

#### Rollout Guide

1. `VITE_FEATURE_FILL_V2=false`
   - Appearance 패널은 legacy `PropertyColor(backgroundColor)` UI 사용
   - Skia는 `fills`를 직접 읽지 않고 기존 `backgroundColor/backgroundImage` fallback 사용
   - Preview/Publish는 여전히 adapter로 파생된 CSS style을 소비하므로 문서 render parity는 유지
2. `VITE_FEATURE_FILL_V2=true`
   - Appearance 패널은 `FillBackgroundInline` 사용
   - Skia는 `fills` direct-read 우선, CSS fallback은 보조 경로
   - Preview/Publish는 동일하게 adapter 기반 CSS style 소비

#### Rollback Playbook

- UI 회귀: `VITE_FEATURE_FILL_V2=false`로 내려 Builder 편집 surface만 legacy 경로로 즉시 복귀
- Canvas Skia 회귀: 같은 flag down으로 direct fill rendering 비활성화, CSS fallback으로 복귀
- Preview/Publish 회귀: 현재는 flag가 아니라 adapter 코드가 정본이므로 문제 시 adapter 변경 commit만 개별 rollback
- 저장 포맷 rollback: 기존 문서는 `backgroundColor` read-through 가 유지되므로 lazy migration 특성상 DB backfill rollback 불필요

### Phase 5 — Legacy 축소

- 범위
  - 신규 문서 저장에서 CSS background 직렬화를 파생 필드로 한정
  - 레거시 직접 편집 경로 제거 후보 식별
- 산출
  - 레거시 축소 계획서
  - 후속 ADR 필요 항목(완전 제거 시점)
- 현재 상태
  - Style Panel 발 direct edit 축소 1차 완료: `useStyleActions` / `useOptimizedStyleActions` 가 Fill V2 on 상태에서 `backgroundColor/backgroundImage/backgroundSize` patch를 차단
  - `ModifiedStylesSection` 도 동일 필드를 read-only 파생값으로만 표시하도록 정렬
  - 신규 문서 기준으로는 Fill V2 on 상태에서 background 파생 필드가 편집 surface 정본이 아님을 코드로 강제
  - AI tool surface 정리 1차 완료: `IntentParser` fallback, system prompt, tool schema, style adapter가 `fills` 입력을 직접 수용하고 `backgroundColor` 직접 authoring 안내를 제거
  - store/update sink 정리 완료: `inspectorActions`, `elementUpdate.ts` 계열(`updateElementProps`, `updateElement`, batch update) 이 Fill V2 on 상태에서 generic `style.background*` patch를 제거
  - clipboard/import ingress 정리 3차 완료: element paste / Design Kit import 는 `fills` 존재 시 파생 `background*`를 제거하고, legacy `backgroundColor`, `linear-gradient`, `radial-gradient`, `conic-gradient`, `url(...) + backgroundSize`, mesh adapter SVG data URL 을 가능한 범위에서 `fills`로 승격
  - add-element canonicalization 공통화 완료: `addElement`, `addComplexElement`, `mergeElements` 경로가 같은 external ingress normalizer를 사용
  - preview-generated batch canonicalization 완료: `useIframeMessenger.flushPreviewGeneratedElements()`도 같은 external ingress normalizer를 거쳐 local merge와 DB persistence를 동일 canonical payload로 정렬
  - Fill commit/preview 경로 derived background persistence 제거 완료: `inspectorActions.updateSelectedFills/updateSelectedFillsPreview`가 `fills`만 저장하고 `style.background*`는 strip 상태로 유지
  - 본 ADR 범위 완료. 비정형 payload 정책과 Row/Cell 예외는 ADR-905에서 완료

#### Legacy Reduction Baseline

- 유지
  - `backgroundColor` read-through: legacy 문서 로드 seed
- 축소 완료
  - Fill V2 on 상태의 Style Panel direct edit
  - Fill V2 on 상태의 Modified Styles editable surface
  - Fill commit/preview 경로 derived `backgroundColor/backgroundImage/backgroundSize` persistence
  - 후속 정책 대상
  - adapter가 생성하지 않은 임의 비정형 `backgroundImage`/data URL payload 의 허용/차단 정책 확정
  - `RowEditor` / `CellEditor` 같은 component-specific `backgroundColor` props 를 generic fill 축과 분리할지 여부 결정

#### Remaining Leak Inventory

- generic fill 축에 남은 누수
  - 없음. generic non-canonical payload policy는 ADR-905에서 residual pass-through로 고정
- 별도 도메인으로 분리할 후보
  - 없음. `RowEditor` / `CellEditor` table-domain `backgroundColor`는 ADR-905에서 예외 분리 완료
- direct authoring 아님
  - factory default `transparent` 값
  - Preview/Publish adapter output
  - computed style extractor / reset / modified-style read 경로

## 파일 영향 초안

- 핵심
  - `apps/builder/src/builder/stores/inspectorActions.ts`
  - `apps/builder/src/builder/panels/styles/utils/fillMigration.ts`
  - `apps/builder/src/types/builder/fill.types.ts`
  - `apps/builder/src/preview/utils/computedStyleExtractor.ts`
  - `apps/builder/src/utils/featureFlags.ts`
- 테스트/문서
  - fill migration 테스트 파일(신규)
  - preview/publish 회귀 기준 문서(신규)

## 검증 체크리스트

- [x] legacy backgroundColor-only 문서 로드 성공률 100%
- [x] Fill 편집 시 history undo/redo 회귀 0
- [x] Preview/Publish consumer adapter 경로 회귀 0
- [ ] Fill/Border 경계 위반(혼합 저장) 정적 검사 또는 리뷰 룰 적용
- [x] feature flag on/off 전환 시 치명 장애 0
  - 현재 근거: flag consumer는 Builder UI + Skia direct-read 한정, Preview/Publish adapter는 flag 비의존

## 오픈 이슈

1. 다중 Fill 레이어의 DOM CSS 완전 표현 범위를 어디까지 보장할지(특히 mesh-gradient).
2. Publish 산출물에서 adapter 결과를 사전 계산(cache)할지 런타임 계산할지.
3. Border fill(Stroke 확장) 도입 시점과 ADR 분리 여부.
