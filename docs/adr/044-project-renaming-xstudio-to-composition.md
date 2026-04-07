# ADR-044: 프로젝트 리네이밍 — xstudio → composition

## Status

Proposed

## Date

2026-03-24

## Recheck

2026-04-07 — 388 커밋 후 재검토. 결정 유지. 영향 범위 수치 갱신 + `packages/xstudio-layout` WASM 패키지 누락 보완. ADR-100(PixiJS 제거) 영향 반영.

## Decision Makers

XStudio Team

## Related ADRs

- 전체 ADR 문서 내 "xstudio" 참조 일괄 갱신 대상
- [Project Renaming Breakdown](../design/project-renaming-breakdown.md): 실행 설계

---

## Context

### 문제: 프로젝트 정체성과 이름의 불일치

"XStudio"라는 이름이 프로젝트의 본질(노코드 웹 빌더, 컴포넌트 합성 기반 디자인 도구)을 충분히 반영하지 못한다. "Composition"으로 리네이밍하여 **컴포넌트 합성(Composition)** 중심의 제품 정체성을 명확히 한다.

### 영향 범위

| 카테고리                                          | 파일 수 | 총 참조 수 |
| ------------------------------------------------- | ------- | ---------- |
| 소스 코드 (`@xstudio/` import)                    | 93      | 182        |
| package.json (패키지명)                           | 6       | 24         |
| Vite config (alias)                               | 2       | 15         |
| TypeScript config (paths)                         | 4       | 5          |
| ESLint config                                     | 3       | 3          |
| 배포 설정 (Vercel, GitHub Actions)                | 2       | 2          |
| Canvas WASM (`xstudio-wasm`, Cargo.toml + pkg/)   | 4       | ~20        |
| Layout WASM (`xstudio-layout`, Cargo.toml + pkg/) | 2       | ~10        |
| 문서 (ADR, docs, CLAUDE.md 등)                    | ~30     | ~150       |
| pnpm-lock.yaml                                    | 1       | 9          |

> **2026-04-07 수치 갱신**: 소스 코드 참조는 ADR-100(PixiJS 제거)으로 일부 감소했으나 신규 기능(TextSpec, Variable fonts, Transition/Animation 등) 추가로 순증. `packages/xstudio-layout` WASM 패키지가 원안에서 누락되어 보완.

### Hard Constraints

1. **빌드 중단 최소화**: 코드 변경의 중간 상태에서 빌드가 깨지므로, 패키지명+alias+import 변경은 단일 커밋으로 묶어야 한다.
2. **GitHub 리다이렉트 보존**: 이전 URL(`rblood79/xstudio`)의 자동 리다이렉트가 같은 이름의 새 repo 생성 시 소멸한다 — 리네이밍 후 구 이름으로 repo를 만들면 안 된다.
3. **배포 연속성**: GitHub repo rename 후 Vercel/GitHub Actions 연동이 즉시 끊어질 수 있다 — 배포 파이프라인 복구를 같은 작업 세션에서 완료해야 한다.
4. **Canvas WASM 바이너리 호환**: `apps/builder/.../wasm/Cargo.toml`의 `name`과 wasm-pack 출력 파일명(`xstudio_wasm_bg.wasm`, `xstudio_wasm.js`)이 연동되므로, WASM rebuild가 필수다.
5. **Layout WASM 바이너리 호환**: `packages/xstudio-layout/Cargo.toml`의 `name`과 출력 파일명(`xstudio_layout_bg.wasm`, `xstudio_layout.js`)도 동일하게 연동된다. `layoutEngine.ts`의 동적 import 경로(`/packages/xstudio-layout/pkg/xstudio_layout.js`)도 함께 변경해야 하며, **런타임 검증이 별도로 필요**하다.
6. **런타임 영향 없음**: 순수 문자열 치환이므로 런타임 로직 변경이 발생하면 안 된다.
7. **WASM dynamic import 런타임 검증**: `rustWasm.ts`의 WASM import는 `@vite-ignore`로 Vite alias를 우회하므로, 파일명 불일치가 빌드가 아닌 **런타임에** 실패한다 — WASM clean rebuild + dev 서버 기동 검증 필수.
8. **활성 브랜치 사전 정리**: ~130개 파일 변경이 진행 중인 모든 브랜치와 conflict를 유발하므로, 리네이밍 전 활성 브랜치를 main에 merge하거나, 리네이밍 후 각 브랜치에서 `git rebase main`을 실행해야 한다.

---

## Alternatives Considered

### 대안 A: 단일 커밋 전면 치환

- 설명: GitHub repo rename 후, 모든 코드/설정/문서 변경을 하나의 커밋으로 일괄 적용한다.
- 장점: 중간 상태 없이 깔끔하게 전환. bisect 가능.
- 단점: 변경 파일 수가 ~130개로 커서 리뷰 부담. 문제 발생 시 전체 revert만 가능.
- 위험: 기술(L) / 성능(None) / 유지보수(L) / 마이그레이션(M)

### 대안 B: Alias 병행 점진 전환

- 설명: `@xstudio/*`와 `@composition/*` alias를 일시 병행하고, 파일별로 점진적으로 import 경로를 전환한다.
- 장점: 각 단계에서 빌드가 유지되어 안전.
- 단점: 이중 alias 기간 동안 혼란 발생. 완료 판정이 어려움. 병행 기간에 새 코드가 구 경로를 사용할 수 있음.
- 위험: 기술(L) / 성능(None) / 유지보수(**H**) / 마이그레이션(L)

### 대안 C: Phase별 분리 커밋 (코드 변경은 단일 커밋)

- 설명: GitHub repo rename(Phase 1)은 수동 선행, 코드 변경(패키지명+alias+import)은 단일 커밋(Phase 2~4), 문서/인프라는 후속 커밋(Phase 5)으로 분리한다.
- 장점: 코드 변경은 원자적이면서, 문서 변경은 별도 추적 가능. revert 시 코드/문서를 독립 롤백.
- 단점: Phase 1(repo rename)과 Phase 2~4(코드) 사이에 일시적 불일치.
- 위험: 기술(L) / 성능(None) / 유지보수(L) / 마이그레이션(M)

### Risk Threshold Check

| 대안  | 기술 | 성능 | 유지보수 | 마이그레이션 | 판정                                    |
| ----- | ---- | ---- | -------- | ------------ | --------------------------------------- |
| A     | L    | None | L        | M            | 리뷰 부담 크지만 실행 가능              |
| B     | L    | None | **H**    | L            | 이중 경로 유지보수 비용이 과도          |
| **C** | L    | None | **L**    | M            | **채택** — 원자적 코드 변경 + 분리 추적 |

---

## Decision

**Phase별 분리 커밋 전략(대안 C)을 채택한다.** GitHub repo rename을 선행한 뒤, 패키지명+빌드설정+import 경로 변경을 단일 커밋으로 묶고, 문서/인프라 갱신은 후속 커밋으로 분리한다.

### Decision Rationale

1. 코드 변경을 단일 커밋으로 묶으면 중간 상태에서 빌드가 깨지지 않고, `git revert` 1회로 롤백할 수 있다.
2. 문서 변경을 분리하면 코드 리뷰와 문서 리뷰를 독립적으로 진행할 수 있다.
3. 대안 B의 이중 alias 유지보수 비용(H)을 회피하면서, 대안 A보다 리뷰/롤백 단위를 분리할 수 있다.
4. WASM 패키지도 동일 커밋에서 Cargo.toml + pkg/package.json을 갱신하고 rebuild하여 정합성을 보장한다.

### 변경 요약

| 변경 전                                 | 변경 후                   |
| --------------------------------------- | ------------------------- |
| GitHub repo: `rblood79/xstudio`         | `rblood79/composition`    |
| 루트 패키지: `xstudio`                  | `composition`             |
| 네임스페이스: `@xstudio/*`              | `@composition/*`          |
| Canvas WASM: `xstudio-wasm`             | `composition-wasm`        |
| Layout WASM: `xstudio-layout`           | `composition-layout`      |
| Layout WASM 파일: `xstudio_layout_bg.*` | `composition_layout_bg.*` |
| 빌드 base path: `/xstudio/`             | `/composition/`           |
| Vercel 도메인                           | 재연결                    |
| 문서 내 모든 "xstudio" 참조             | "composition"             |

세부 구현 phase와 파일 목록은 [Project Renaming Breakdown](../design/project-renaming-breakdown.md)에서 관리한다.

---

## Gates

| 시점      | 조건                | 통과 기준                                                                                                | 실패 시 rollback 범위            |
| --------- | ------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Phase 0   | 빌드 기준선         | `pnpm build && pnpm type-check` 성공                                                                     | 없음 (사전 준비)                 |
| Phase 1   | GitHub repo rename  | 로컬 + CI remote URL 정상 연결                                                                           | GitHub에서 `xstudio`로 재rename  |
| Phase 2~4 | 코드 변경 단일 커밋 | `pnpm install && pnpm build && pnpm type-check` 성공 + dev 서버 Canvas WASM + Layout WASM 양쪽 로드 확인 | `git revert` 1회                 |
| Phase 5   | 문서 + 인프라 갱신  | Vercel 배포 성공 + 문서 내 `xstudio` 잔존 참조 0건                                                       | 문서 커밋 revert + Vercel 재연결 |

---

## Consequences

### Positive

- 프로젝트명이 제품의 핵심 가치(컴포넌트 합성)를 직접 반영한다.
- `@composition/*` 네임스페이스가 외부 노출 시 제품 정체성을 전달한다.
- 리네이밍 시점에 전체 참조를 정리하면서 문서/설정의 일관성을 재확보할 수 있다.

### Negative

- ~135개 파일 변경으로 인해 진행 중인 브랜치와의 merge conflict가 발생할 수 있다.
- GitHub 리다이렉트 만료 전까지 외부 링크(블로그, 위키 등)를 갱신해야 한다.
- Canvas WASM + Layout WASM 두 패키지 모두 rebuild가 필요하므로 wasm-pack 빌드 환경이 정상이어야 한다.
- Layout WASM의 동적 import 경로(`/packages/xstudio-layout/pkg/xstudio_layout.js`)가 런타임에만 검증되므로, dev 서버 기동 확인이 필수다.
- `.claude/` 디렉토리 내 skill/rule 참조 갱신이 누락되면 Claude Code 컨텍스트가 깨질 수 있다.

---

## References

- [Renaming a GitHub repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository)
- [pnpm workspace protocol](https://pnpm.io/workspaces)
