# ADR-062: Field 컴포넌트 Spec 정리 — RSP 참조 기반 variant 제거 + isQuiet 보강

## Status

Proposed — 2026-04-13

## Context

composition의 Field 계열 컴포넌트 Spec은 React Spectrum(이하 RSP) 레퍼런스 표준에서 벗어난 `variant` prop을 보편적으로 도입하고 있다. 2026-04-13 실측 결과:

- **RSP 11/11 Field 컴포넌트** (TextField, TextArea, NumberField, SearchField, ColorField, DateField, TimeField, DatePicker, DateRangePicker, ComboBox, Select): `variant` prop 미존재, `isQuiet: boolean`만 시각 variant 개념으로 제공
- **composition 11/11 Field 컴포넌트**: 전부 `variant` prop 선언 — 총 8종 값 혼재 (`default / accent / neutral / purple / negative / positive / error / filled`)
- **composition isQuiet 누락 6개**: TextArea / SearchField / ColorField / DateField / TimeField / ComboBox — RSP 표준 prop조차 미구현

상세 매트릭스: [breakdown 문서](../design/062-field-spec-rsp-conformance-breakdown.md#조사-매트릭스-2026-04-13-실측)

ADR-059 v2 Phase 1 Step 1(TextField 시험대) 실행 중 발견: variant 이름이 Spec(`accent/neutral/...`)과 CSS(`primary/secondary/tertiary/error/filled`)에서 완전 불일치하여 manual CSS variant 블록 전체가 dead code. 이 상태에서 `skipCSSGeneration` 해체를 진행하면 잘못된 variant 개념이 CSSGenerator 출력에 굳어짐.

SSOT 체인 해석:

- **Spec = 유일 SSOT** (typography/color/레이아웃 토큰 전부 포함)
- **RSP는 외부 레퍼런스** — Spec 설계의 근거이지 SSOT 자체는 아님
- **CSS ≡ Skia**: symmetric consumers — 양쪽 모두 Spec에서 파생, 대칭 회귀(`/cross-check`)로 검증

따라서 결정 주어는 "Spec이 무엇이어야 하는가"이며, 그 답은 "RSP 참조에 부합하는 범위 + 프로젝트 고유 디자인 의도". 현재 variant는 후자를 정당화하는 문서화가 없고, 전자와 충돌한다.

**Hard Constraints**:

1. RSP 표준 API 준수 — `variant` prop 부재, `isQuiet: boolean` 제공
2. 기존 DB 저장 프로젝트(`variant` prop 포함 elements)의 load 시 **구조적 시각 회귀 0** — 단, `variant="accent|purple|neutral"`의 per-instance 색상 의도는 전역 tint 정책상 허용된 회귀(본 ADR에서 명시적 정책 결정, 아래 Negative 참조)
3. Spec 변경 후 CSS↔Skia 11/11 대칭 통과 — Gate G3에서 `parallel-verify` skill로 집행
4. Spec 변경 후 `pnpm build:specs` 외부(Field 가 아닌) 컴포넌트 generated CSS 0 byte diff
5. Spec 변경 후 `pnpm type-check` 3 tasks 통과

**Infrastructure 전제 (실측 확인 완료 2026-04-13)**:

- `--tint` 전역 시스템: `packages/shared/src/components/styles/theme/preview-system.css` — 단, **per-component 오버라이드 미지원** (`apps/builder/src/builder/main/BuilderCore.tsx`에서 전역 1개만 세팅). 본 ADR의 `variant → tint` 이관은 **per-instance → 전역** 축소를 수반 (Negative에 기재)
- Load hook: `apps/builder/src/utils/projectSync.ts#downloadProjectFromCloud`
- Feature flag: `apps/builder/src/utils/featureFlags.ts`
- `/cross-check` skill은 단일 컴포넌트용 → Gate G3는 `parallel-verify` skill 또는 11회 순차 실행

**Soft Constraints**:

- ADR-022(시맨틱 토큰) / ADR-036(Spec-First SSOT) / ADR-059 v2(skipCSSGeneration 해체)와 정합
- ADR-059 v2 재개 전 본 ADR 완료 필요 (종속 관계)
- 변경 규모: 11개 Spec + 11개 CSS + 마이그레이션 스크립트 — 단일 개발자 2~3일 예상

## Alternatives Considered

### 대안 A: 전체 일괄 제거 + 자동 마이그레이션

- 설명: 11개 Spec의 `variant` prop을 한 번에 제거, `variants` 객체 삭제. 기존 DB 프로젝트는 load hook에서 `variant` 키 자동 변환 (`negative/error → isInvalid: true`, `accent/purple/neutral` → strip + 사용자 공지, 기타 → strip). isQuiet은 6개 컴포넌트에 일괄 추가. **ColorField `filled` variant는 별도 분기** — Phase 0 사용처 실측 결과에 따라 (a) 사용처 0이면 삭제, (b) >0이면 본 ADR 범위 재조정 (별도 `fillStyle` prop 승격 or 별도 컴포넌트 분리).
- 근거: RSP 11/11 일관된 표준. Adobe Spectrum 공식 React Spectrum 라이브러리가 수년간 이 패턴으로 운용. Radix UI, Shadcn도 Field 계열에 variant 미사용 (Field=structural, Button=variant의 디자인 분리 원칙).
- 위험:
  - 기술: **M** — load hook 변환 로직 + 11개 컴포넌트 CSS 재작성 + ColorField filled 분기 처리, 복잡도 중간
  - 성능: **L** — 런타임 영향 없음
  - 유지보수: **L+** — 이후 표준 준수로 유지보수 부담 감소
  - 마이그레이션: **H** — 기존 프로젝트 DB 전수 변환 + **per-instance → 전역 tint 축소에 따른 시각 의도 소실** (같은 프로젝트 내 `variant="accent"` TextField와 `variant="purple"` TextField 공존 시 구분 불가)

### 대안 B: 점진 제거 + deprecated 경고 + 긴 마이그레이션 기간

- 설명: `variant` prop을 `@deprecated` 표시만 하고 1~2개월간 유지. 새 API로 `isQuiet + isInvalid` 권장. 기존 변환 없이 런타임 호환 레이어로 흡수. 향후 별도 ADR에서 최종 제거.
- 근거: 대형 라이브러리(MUI v4→v5, Ant Design v3→v4)의 deprecation 패턴. 사용자 학습 곡선 완만.
- 위험:
  - 기술: **M** — 호환 레이어 + 경고 인프라 필요
  - 성능: **L**
  - 유지보수: **H** — deprecated 코드를 장기 유지, SSOT 원칙 일시 훼손 (Spec이 두 경로 공존)
  - 마이그레이션: **L** — 완화된 전환

### 대안 C: Spec/CSS만 정리 + 런타임 variant prop 무시 (no-op)

- 설명: Spec에서 `variant` 선언 제거, CSS variant 블록 삭제. 런타임은 `variant` prop이 들어와도 조용히 무시(no-op). DB 저장은 그대로 두고 시간이 지나면서 자연 소거.
- 근거: 가장 단순한 구현. Lit, Solid 등 일부 라이브러리의 "strip unknown props" 패턴.
- 위험:
  - 기술: **L** — 가장 단순
  - 성능: **L**
  - 유지보수: **M** — DB에 dead prop이 장기 잔존, 쿼리/분석 시 혼란
  - 마이그레이션: **M** — 기존 `variant="negative"` 사용자는 isInvalid로 자동 변환되지 않아 **시각 회귀 발생** (Hard Constraint 2 위반)

### Risk Threshold Check

| 대안 | 기술 | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| :--: | :--: | :--: | :------: | :----------: | :--------: |
|  A   |  M   |  L   |    L+    |      H       |     1      |
|  B   |  M   |  L   |    H     |      L       |     1      |
|  C   |  L   |  L   |    M     |      M       |     0      |

**루프 판정**:

- 모든 대안 HIGH 1개 이하. CRITICAL 0. Threshold 통과.
- 대안 C는 HIGH 0이지만 **Hard Constraint 2(시각 회귀 0) 위반** → 실질적 탈락.
- 대안 A의 마이그레이션 HIGH는 자동 변환 스크립트와 feature flag로 완화 가능 (Gate로 검증).
- 대안 B의 유지보수 HIGH는 deprecation 기간이 SSOT 원칙을 장기 위반 → ADR-036/059 재개 지연.

## Decision

**대안 A: 전체 일괄 제거 + 자동 마이그레이션**를 선택한다.

선택 근거:

1. **SSOT 원칙 즉각 복원** — Spec = SSOT, RSP 참조 준수 상태로 단번에 전이. 중간 상태 없음.
2. **ADR-059 v2 재개 해금** — variant 정리 완료가 skipCSSGeneration 해체의 전제. B의 장기 deprecation은 ADR-059 차단.
3. **마이그레이션 위험은 Gate로 관리 가능** — Phase 0(사용처 실측) + Phase 4(feature flag) + Phase 3(`/cross-check` 대칭 회귀)으로 HIGH 위험 점진 검증.
4. **유지보수 장기 이득** — RSP 표준 준수로 신규 개발자 온보딩 용이, React Aria 훅/S2 변환 시 추가 정리 불필요.

기각 사유:

- **대안 B 기각**: 유지보수 HIGH(deprecated 코드 장기 잔존)가 SSOT 원칙을 장기 훼손. ADR-036/059 재개 지연 비용이 사용자 전환 완화 이득보다 큼. composition은 아직 production traffic이 제한적이라 긴 deprecation 주기가 불필요.
- **대안 C 기각**: Hard Constraint 2(시각 회귀 0) 위반. `variant="negative"`를 `isInvalid`로 자동 전환하지 않으면 기존 프로젝트의 오류 색 표시가 소실됨.

> 구현 상세: [062-field-spec-rsp-conformance-breakdown.md](../design/062-field-spec-rsp-conformance-breakdown.md)

## Gates

| Gate              | 시점                 | 통과 조건                                                                  | 실패 시 대안                           |
| ----------------- | -------------------- | -------------------------------------------------------------------------- | -------------------------------------- |
| G1: 사용처 실측   | Phase 0 완료         | `apps/` grep + DB 샘플 조사로 8종 variant 값별 카운트 확정                 | Phase 1 진입 금지, 필요 시 대안 재평가 |
| G2: Spec 정리     | Phase 1 각 컴포넌트   | `pnpm type-check` 통과 + `pnpm build:specs` 외부 컴포넌트 0 byte diff      | 해당 컴포넌트 revert, 다음 단위 진행   |
| G3: 대칭 회귀     | Phase 3 완료         | 11/11 컴포넌트 대칭 통과 — `parallel-verify` skill로 일괄 집행(기본) 또는 `/cross-check` 11회 순차 실행 | 실패 컴포넌트 Skia shapes 재작업       |
| G4: 마이그레이션  | Phase 4 완료         | 기존 DB 프로젝트 로드 시 시각 회귀 0 (특히 `variant="negative"` 테스트 셋) | load hook 변환 로직 재설계             |

## Consequences

### Positive

- **RSP 표준 완전 준수** — 11/11 Field 컴포넌트가 `isQuiet + isInvalid + 전역 tint` 조합으로 단일화
- **SSOT 원칙 복원** — Spec이 유일 정본, CSS/Skia는 symmetric consumers로 회복
- **ADR-059 v2 재개 가능** — skipCSSGeneration 해체의 전제 조건 충족
- **dead code 대규모 정리** — TextField CSS variant 블록 5개, ColorField `filled`, 기타 미사용 variant CSS 제거
- **신규 컴포넌트 온보딩 가속** — 앞으로 Field 계열은 variant 선언 없이 RSP 패턴 따라 구현
- **React Aria 훅/S2 전환 시 추가 정리 불필요** — ADR-052/053 연관 작업의 후속 비용 감소

### Negative

- **일회성 breaking change** — 기존 프로젝트의 `variant` prop이 DB load 시 자동 변환 또는 strip
- **per-instance 색상 의도 소실 (정책적 허용)** — `variant="accent|purple|neutral"`은 전역 `--tint`로 1:N 축소. 같은 프로젝트에서 TextField A에 `accent`, TextField B에 `purple`을 지정한 경우 둘 다 전역 tint 단일 색상으로 수렴. 본 ADR은 이를 **수용 가능한 회귀**로 결정 — per-component tint 오버라이드를 위한 prop 신설은 variant 리브랜딩에 불과하며 RSP 표준 일탈 재발. 대안: 사용자가 디자인 의도 유지가 필요하면 CSS override(element-level `style={{ "--tint": "var(--purple)" }}`) 로 대응 가능하나 공식 지원은 아님
- **ColorField `filled` 조건부 처리** — Phase 0 실측 후 사용처 0이면 삭제. 사용처 >0이면 본 ADR 범위 재조정 필요 (별도 `fillStyle` prop 승격 or 별도 컴포넌트). 이 분기는 G1 통과 시점에 판정
- **마이그레이션 스크립트 유지** — 향후 6개월 load hook 변환 로직 유지 필요 (그 후 제거)
- **Phase 1~5 작업 실 2~3일** — 본 ADR이 완료되기 전 ADR-059 v2 중단 (ADR-059 README에 "Blocked by ADR-062" 명시 필요)
