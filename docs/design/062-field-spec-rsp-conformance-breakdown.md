# ADR-062 구현 상세 — Field 컴포넌트 Spec 정리 (RSP 참조 기반)

본 문서는 ADR-062의 구현 상세만 담는다. 결정의 근거/대안/위험은 ADR 본문 참조.

## 조사 매트릭스 (2026-04-13 실측)

| 컴포넌트        | RSP variant | 현재 Spec variant                                     | RSP isQuiet | 현재 Spec isQuiet |
| --------------- | :---------: | ----------------------------------------------------- | :---------: | :---------------: |
| TextField       |     ❌      | `default/accent/neutral/purple/negative/positive` (6) |     ✅      |        ✅         |
| TextArea        |     ❌      | `default/accent/negative` (3)                         |     ✅      |        ❌         |
| NumberField     |     ❌      | `default/accent/negative` (3)                         |     ✅      |        ✅         |
| SearchField     |     ❌      | `default/accent` (2)                                  |     ✅      |        ❌         |
| ColorField      |     ❌      | `default/accent/neutral/error/filled` (5)             |     ✅      |        ❌         |
| DateField       |     ❌      | `default/accent/negative` (3)                         |     ✅      |        ❌         |
| TimeField       |     ❌      | `default/accent/negative` (3)                         |     ✅      |        ❌         |
| DatePicker      |     ❌      | `default/accent` (2)                                  |     ✅      |        ✅         |
| DateRangePicker |     ❌      | `default/accent` (2)                                  |     ✅      |        ✅         |
| ComboBox        |     ❌      | `default/accent/negative` (3)                         |     ✅      |        ❌         |
| Select          |     ❌      | `default/accent/negative` (3)                         |     ✅      |        ✅         |

**총 variant 값 8종**: `default / accent / neutral / purple / negative / positive / error / filled`
**isQuiet 누락 6개**: TextArea / SearchField / ColorField / DateField / TimeField / ComboBox

## Variant 값별 의미 재배치 매핑

| 기존 variant 값 | 의도 분류          | 재배치 경로                                            | 비고                    |
| --------------- | ------------------ | ------------------------------------------------------ | ----------------------- |
| `default`       | 기본               | 제거 — 기본은 variant 없음                             | —                       |
| `accent`        | 강조 색 (시각 tint)| 전역 tint system (`--tint`) — **per-instance 소실 허용** | ADR-022, Negative 참조  |
| `neutral`       | 기본과 동일        | 제거 — 실질적 default                                  | 사용처 확인             |
| `purple`        | 테마 색            | 전역 tint — **per-instance 소실 허용**                 | ADR-022, Negative 참조  |
| `negative`      | 오류 표시          | `isInvalid` 상태로 통합                                | React Aria 표준         |
| `positive`      | 성공 표시          | 제거 후 사용처 조사 → `data-valid` or 삭제             | RSP에도 명시 없음       |
| `error`         | `negative` 동의어  | `isInvalid`로 통합                                     | ColorField 전용         |
| `filled`        | 시각 스타일 변종   | 사용처 0 확인 시 삭제 / 필요 시 별도 컴포넌트          | dead code 가능성 높음   |

## Phase 구조

### Phase 0 — 사용처 실측 (CRITICAL 선행)

1. `apps/` 디렉토리에서 11개 컴포넌트별 `variant="..."` prop 호출 grep (예비 조사 2026-04-13: 0건 확인)
2. DB 저장 프로젝트의 element props 샘플에서 `variant` 키 분포 조사 (Supabase query — 권한/환경 사전 확보 필요)
3. variant별 사용 카운트 표 작성 → 실제 제거 가능 범위 확정
4. **ColorField `filled` 전용 분기 판정** (Gate G1 일부):
   - 사용처 0 → 본 ADR 범위 내 삭제 (Phase 1c)
   - 사용처 >0 → **본 ADR Phase 1 중단, 후속 ADR 발의** (`fillStyle` prop 승격 or ColorField-Filled 별도 컴포넌트 설계)

Phase 0 산출물: `docs/design/062-variant-usage-audit.md` 별도 문서

### Phase 1 — Spec 정리 (컴포넌트 단위, 3그룹)

- **1a**: TextField (variant 6개 제거, isQuiet 유지)
- **1b**: NumberField / DatePicker / DateRangePicker / Select (variant 제거, isQuiet 이미 있음)
- **1c**: TextArea / SearchField / ColorField / DateField / TimeField / ComboBox (variant 제거 + isQuiet 신규 추가)

각 컴포넌트별 작업:
1. `XxxSpec.ts` — `variant` prop 삭제, `variants` 객체 삭제 (or 단일화), `isQuiet` prop 신설(필요 시)
2. `pnpm build:specs` — generated CSS 검증 (0 byte diff on non-target 컴포넌트)
3. `Xxx.css` — variant 블록 전부 삭제, `[data-quiet]` 블록 신설, `isInvalid` 경로 통합

### Phase 2 — CSS consumer 정리

- variant 기반 `--field-accent` 등 로컬 변수 삭제
- `data-invalid` 중심의 상태 기반 CSS 재편
- `[data-quiet]` 셀렉터의 공통 utility 검토 (중복 패턴이면 `@layer utilities`로 승격)

### Phase 3 — Skia 대칭 확인

- 각 컴포넌트 `render.shapes()`에서 `variant` 인자 의존 경로 정리
- 색상은 `isInvalid` 상태 인자로 대체
- `parallel-verify` skill로 11/11 컴포넌트 일괄 대칭 회귀 (기본 경로)
  - fallback: `/cross-check` 11회 순차 실행
- Gate G3 통과 기준: 11/11 대칭 + 실패 시 실패 컴포넌트 격리 + Skia shapes 재작업

### Phase 4 — 마이그레이션

- 런타임 `variant` prop 무시 로직 (store load 시 warn + strip)
- 기존 `variant="negative|error"` → `isInvalid: true` 자동 변환 (마이그레이션 스크립트 or load hook)
- 기존 `variant="accent|purple"` → tint 전역 설정 제안 + strip

### Phase 5 — 검증

- ADR-036 재승격 (Field 컴포넌트 variant 개념 제거로 Spec 단일화 강화)
- React Aria 규칙 문서 업데이트 (`react-aria-skill.md`)
- 11개 컴포넌트 `/cross-check` 대칭 회귀 통과

## 파일 변경 규모 (예상)

| 레이어             | 파일 수    | 변경 규모 |
| ------------------ | ---------- | --------- |
| packages/specs     | 11         | MEDIUM    |
| packages/shared/css| 11         | HIGH      |
| apps/builder store | 2-3        | LOW       |
| 마이그레이션 스크립트 | 1 (신규) | LOW       |

## Gate별 통과 조건

| Gate              | 시점               | 통과 조건                                                         | 실패 시 대안                         |
| ----------------- | ------------------ | ----------------------------------------------------------------- | ------------------------------------ |
| G1: 사용처 실측   | Phase 0 완료       | apps/DB 조사 완료, variant별 카운트 확정                          | Phase 1 진입 금지                    |
| G2: Spec 정리     | Phase 1 각 컴포넌트 완료 | `pnpm type-check` 통과, `pnpm build:specs` 0 byte diff (외부) | 해당 컴포넌트 revert, 다음 단위 진행 |
| G3: 대칭 회귀     | Phase 3 완료       | 11/11 컴포넌트 `/cross-check` 통과                                | 실패 컴포넌트 Skia 재작업            |
| G4: 마이그레이션  | Phase 4 완료       | 기존 DB 프로젝트 로드 시 시각 회귀 0                              | load hook 로직 재설계                |

## 마이그레이션 세부 전략

### 런타임 처리 우선순위

1. `variant="negative"` or `variant="error"` → `isInvalid: true` 자동 주입 + `variant` 키 제거
2. `variant="accent"` → 사용자 공지(toast/log) + `variant` 키 제거 (**per-instance 색상 의도 소실 허용** — 정책 결정)
3. `variant="purple"` → 사용자 공지 + `variant` 키 제거 (사용자가 전역 `--tint` 변경 or element-level `style={{"--tint":"var(--purple)"}}` CSS override 선택)
4. `variant="positive"` → `variant` 키 제거 + 디자인 정책 확정까지 별도 시각 처리 없음
5. `variant="filled"` (ColorField 전용) → **Phase 0 G1에서 판정된 분기에 따라**: 사용처 0이면 strip, >0이면 본 ADR 중단 후 후속 ADR
6. `variant="default"` / `variant="neutral"` → 단순 `variant` 키 제거

### 마이그레이션 적용 시점

- 프로젝트 load 시 1회 자동 변환 + save 시 영구 반영
- 별도 "Legacy variant detected" 배너 표시 (한 번만)

## 롤백 전략

- 각 Phase 별 독립 커밋. Phase N 실패 시 N-1로 revert.
- Phase 4(마이그레이션)가 가장 위험 → feature flag 뒤에 배포 후 점진 활성화
