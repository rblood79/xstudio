# ADR-904: Fill SSOT + Preview/Publish 어댑터 전환

## Status

Proposed — 2026-04-22

## Context

xstudio 시절의 저장 포맷은 DOM+CSS 편집 흐름을 중심으로 설계되어 `style.backgroundColor`, `style.backgroundImage`, `style.borderColor` 같은 CSS 속성 기반 모델이 우선이었다. 현재 builder 렌더 축은 WebGL/Skia 중심으로 이동했고, Fill 시스템(`color/image/linear/radial/angular/mesh`)이 이미 도입되어 있다. 그럼에도 저장·편집·미리보기 경로가 혼합되어 SSOT 경계가 불명확하다.

현재 코드베이스는 이미 아래의 하이브리드 상태를 보여준다.

1. Fill 타입 시스템이 별도로 존재하며 Pencil 계열 6종 Fill을 모델링한다.
2. Inspector 액션은 `fills`를 저장하면서 동시에 CSS background 필드(`backgroundColor/backgroundImage/backgroundSize`)를 역동기화한다.
3. Preview 측 computedStyle 추출은 여전히 `backgroundColor/backgroundImage/borderColor`를 핵심 contract로 소비한다.
4. Fill V2는 feature flag로 부분 롤아웃 상태이다.

즉, 구조적으로는 Fill 중심으로 갈 수 있지만, Preview/Publish/Inspector 계약 때문에 CSS 필드를 즉시 제거하기 어렵다.

### Hard Constraints

1. **런타임 시각 동일성**: 동일 문서에서 Builder(Skia)와 Preview/Publish(DOM)의 주요 컴포넌트 시각 회귀 0건(골든 비교 기준)이어야 한다.
2. **하위 호환성**: 기존 `style.backgroundColor`만 가진 프로젝트 로드 성공률 100%를 유지해야 한다.
3. **Undo/History 보존**: Fill 편집 시 undo/redo 정확도(프리뷰 중 원본 스냅샷 포함)를 기존 대비 저하시키지 않아야 한다.
4. **점진 전환**: `VITE_FEATURE_FILL_V2` 플래그로 단계적 배포/롤백이 가능해야 한다.
5. **경계 분리 유지**: Fill(면)과 Border(선) 모델을 혼합하지 않고 별도 채널로 유지해야 한다.

### Soft Constraints

- Pencil 포맷 유사성은 확보하되, composition 내부의 ADR-063 D1/D2/D3 경계를 침범하지 않는다.
- Preview/Publish DOM 경로는 CSS 기반 소비를 당분간 허용한다.
- 대규모 저장 스키마 재작성보다 adapter-first 전략을 우선한다.

## Alternatives Considered

### 대안 A: Fill을 SSOT로 승격 + Preview/Publish는 어댑터로 변환

- 설명: 저장 정본은 `fills`로 통일하고, Preview/Publish에서만 `fills -> CSS background*` 변환 어댑터를 사용한다. Border는 독립 유지.
- 근거:
  - Figma/Pencil 계열 도구는 Fill/Stroke 분리 모델을 기본으로 사용한다.
  - 현 코드에 `fillsToCssBackground()` 및 preview-lightweight 경로가 이미 존재해 전환 비용이 낮다.
- 위험:
  - 기술: **M** — 어댑터 계층과 legacy CSS 경로 공존으로 일시 복잡도 증가
  - 성능: **L** — 드래그 중 lightweight preview 경로가 이미 존재
  - 유지보수: **M** — 전환 중 이중 계약 관리 필요
  - 마이그레이션: **M** — 기존 문서 read-through와 write-through 정책 정교화 필요

### 대안 B: 현행 유지 (CSS background/borderColor 중심 + fills 보조)

- 설명: 지금처럼 CSS style을 실질 정본으로 유지하고 fills는 UI 보조 데이터로 제한.
- 근거:
  - 단기 구현 리스크가 가장 작고 Preview/Publish 계약 변경이 거의 없음.
- 위험:
  - 기술: **H** — Skia/WebGL 확장 시 CSS 의미 체계 의존이 구조적 부채로 누적
  - 성능: **M** — 변환/동기화 중복 및 편집 경로 복잡화 지속
  - 유지보수: **H** — 동일 색상 의미가 다중 필드에 분산되어 버그 탐지 어려움
  - 마이그레이션: **M** — 뒤로 미룰수록 전환 비용 상승

### 대안 C: 즉시 빅뱅 전환 (CSS background 필드 제거)

- 설명: `backgroundColor/backgroundImage` 저장을 즉시 중단하고 모든 소비자를 Fill 직접 소비자로 교체.
- 근거:
  - 모델 순도는 가장 높고 장기적으로 코드 단순화 가능.
- 위험:
  - 기술: **H** — Preview/Publish/Inspector 계약 다수 동시 변경 필요
  - 성능: **M** — 급격한 변경으로 회귀 디버깅 비용 증가
  - 유지보수: **M** — 단기적으로 대량 핫픽스 가능성
  - 마이그레이션: **H** — 기존 문서 호환성/롤백 전략 취약

### Risk Threshold Check

| 대안 | 기술 | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ---- | ---- | ---- | -------- | ------------ | :--------: |
| A    | M    | L    | M        | M            |     0      |
| B    | H    | M    | H        | M            |     2      |
| C    | H    | M    | M        | H            |     2      |

루프 판정: 대안 A는 HIGH 위험이 없어 채택 가능. B/C는 구조 또는 전환 리스크가 높아 기각한다.

## Decision

**대안 A: Fill SSOT + Preview/Publish 어댑터 전략**을 채택한다.

선택 근거:

1. 현 코드베이스가 이미 Fill 타입, Fill 액션, CSS 어댑터를 모두 갖춰 점진 전환의 발판이 준비되어 있다.
2. WebGL/Skia 중심 렌더 아키텍처와 데이터 모델 정합성이 가장 높다.
3. feature flag 기반 롤백이 가능하여 엔터프라이즈 운영 리스크를 통제할 수 있다.

기각 사유:

- **대안 B 기각**: 단기 안전하지만 구조 부채를 고착화한다.
- **대안 C 기각**: 단기 회귀·운영 리스크가 높아 현재 단계에서 과도하다.

> 구현 상세: [904-fill-ssot-preview-publish-adapter-breakdown.md](design/904-fill-ssot-preview-publish-adapter-breakdown.md)

## Gates

| Gate | 시점 | 통과 조건 | 실패 시 대안 |
| ---- | ---- | --------- | ------------ |
| G1: Read-through | Phase 1 | legacy `backgroundColor` only 문서를 로드할 때 `ensureFills` 경유 후 시각 회귀 0 | legacy fallback 유지 + migration 보강 |
| G2: Write-through | Phase 2 | Fill 편집 시 `fills` 저장 + CSS 파생 필드 동기화 성공, undo/redo 회귀 0 | write-through 범위 축소 |
| G3: Consumer Split | Phase 3 | Builder는 Fill 직접 소비, Preview/Publish는 어댑터 소비 계약 명문화 | 계약 문서화 후 재시도 |
| G4: Flag Rollout | Phase 4 | Fill V2 점진 롤아웃(프로젝트/환경별)에서 장애율 목표치 이내 | 플래그 기본값 off 유지 |
| G5: Legacy 축소 | Phase 5 | 신규 생성 문서의 background 직렬화 의존도 제거(파생 필드화) | 이중 저장 유지 |

## Consequences

### Positive

- 색상/그래디언트/이미지/메시를 단일 Fill 모델로 다룰 수 있어 모델 일관성이 높아진다.
- Builder(WebGL/Skia)와 저장 모델의 의미 정합성이 향상된다.
- Preview/Publish는 어댑터를 통해 기존 CSS 계약을 유지하면서 전환할 수 있다.

### Negative

- 전환 기간 동안 Fill + CSS 파생 필드를 동시에 관리해야 한다.
- 어댑터 품질에 따라 Preview/Pubish 회귀 가능성이 생긴다.
- 팀 내 도메인 경계(Fill vs Border) 규칙을 문서/리뷰로 강제해야 한다.

## References

- [apps/builder/src/types/builder/fill.types.ts](../../apps/builder/src/types/builder/fill.types.ts)
- [apps/builder/src/builder/stores/inspectorActions.ts](../../apps/builder/src/builder/stores/inspectorActions.ts)
- [apps/builder/src/builder/panels/styles/utils/fillMigration.ts](../../apps/builder/src/builder/panels/styles/utils/fillMigration.ts)
- [apps/builder/src/preview/utils/computedStyleExtractor.ts](../../apps/builder/src/preview/utils/computedStyleExtractor.ts)
- [apps/builder/src/utils/featureFlags.ts](../../apps/builder/src/utils/featureFlags.ts)
- [docs/adr/063-ssot-chain-charter.md](063-ssot-chain-charter.md)
