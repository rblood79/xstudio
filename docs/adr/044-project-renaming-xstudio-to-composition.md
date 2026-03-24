# ADR-044: 프로젝트 리네이밍 — xstudio → composition

## Status

Proposed

## Date

2026-03-24

## Decision Makers

XStudio Team

## Related ADRs

- 전체 ADR 문서 내 "xstudio" 참조 일괄 갱신 대상

---

## Context

### 문제: 프로젝트 정체성과 이름의 불일치

"XStudio"라는 이름이 프로젝트의 본질(노코드 웹 빌더, 컴포넌트 합성 기반 디자인 도구)을 충분히 반영하지 못한다. "Composition"으로 리네이밍하여 **컴포넌트 합성(Composition)** 중심의 제품 정체성을 명확히 한다.

### 영향 범위

| 카테고리                           | 파일 수 | 총 참조 수 |
| ---------------------------------- | ------- | ---------- |
| 소스 코드 (`@xstudio/` import)     | 88      | 174        |
| package.json (패키지명)            | 6       | 24         |
| Vite config (alias)                | 2       | 15         |
| TypeScript config (paths)          | 4       | 5          |
| ESLint config                      | 3       | 3          |
| 배포 설정 (Vercel, GitHub Actions) | 2       | 2          |
| 문서 (ADR, docs, CLAUDE.md 등)     | ~30     | ~150       |
| pnpm-lock.yaml                     | 1       | 9          |

---

## Decision

**xstudio → composition** 전면 리네이밍을 6단계(Phase 0~5)로 실행한다.

| 변경 전                         | 변경 후                |
| ------------------------------- | ---------------------- |
| GitHub repo: `rblood79/xstudio` | `rblood79/composition` |
| 루트 패키지: `xstudio`          | `composition`          |
| 네임스페이스: `@xstudio/*`      | `@composition/*`       |
| 빌드 base path: `/xstudio/`     | `/composition/`        |
| Vercel 도메인                   | 재연결                 |
| 문서 내 모든 "xstudio" 참조     | "composition"          |

---

## Risk Assessment

| 축           | 수준       | 설명                                          |
| ------------ | ---------- | --------------------------------------------- |
| 기술         | **Low**    | 문자열 치환 중심, 로직 변경 없음              |
| 성능         | **None**   | 런타임 영향 없음                              |
| 유지보수     | **Medium** | Phase별 순서 위반 시 빌드 깨짐                |
| 마이그레이션 | **Medium** | GitHub 리다이렉트 만료 전 모든 참조 갱신 필요 |

---

## Implementation Plan

### Phase 0: 사전 준비 (빌드 기준선 확보)

**Gate**: `pnpm build && pnpm type-check` 성공

1. 현재 상태에서 빌드/타입체크 통과 확인
2. 전체 `xstudio` 참조 목록 스냅샷 기록 (변경 추적용)

---

### Phase 1: GitHub 리포지토리 리네이밍

**작업**:

1. GitHub Settings → Repository name: `xstudio` → `composition`
2. 로컬 remote URL 업데이트:
   ```bash
   git remote set-url origin https://github.com/rblood79/composition.git
   ```
3. 팀원 전원 remote URL 갱신 공지

**주의사항**:

- GitHub은 이전 URL(`rblood79/xstudio`)을 자동 리다이렉트하지만, 새 리포지토리가 같은 이름으로 생성되면 리다이렉트 소멸
- Vercel GitHub 연동이 끊어질 수 있으므로 Phase 5에서 재연결

---

### Phase 2: 패키지명 + 의존성 변경 (Monorepo 코어)

**변경 대상** (6 파일):

#### 2-1. 루트 `package.json`

```diff
- "name": "xstudio",
+ "name": "composition",
```

- scripts 내 `@xstudio/*` → `@composition/*` (7곳)

#### 2-2. `packages/config/package.json`

```diff
- "name": "@xstudio/config",
+ "name": "@composition/config",
```

#### 2-3. `packages/shared/package.json`

```diff
- "name": "@xstudio/shared",
+ "name": "@composition/shared",
```

- dependencies 내 `@xstudio/config` → `@composition/config`

#### 2-4. `packages/specs/package.json`

```diff
- "name": "@xstudio/specs",
+ "name": "@composition/specs",
```

#### 2-5. `apps/builder/package.json`

```diff
- "name": "@xstudio/builder",
+ "name": "@composition/builder",
```

- dependencies 내 `@xstudio/*` → `@composition/*` (3곳)

#### 2-6. `apps/publish/package.json`

```diff
- "name": "@xstudio/publish",
+ "name": "@composition/publish",
```

- dependencies 내 `@xstudio/*` → `@composition/*` (2곳)

#### 2-7. `pnpm-lock.yaml`

```bash
pnpm install  # lockfile 자동 재생성
```

**Gate**: `pnpm install` 성공 (의존성 해소 확인)

---

### Phase 3: 빌드 설정 + Import Path 변경

#### 3-1. Vite config alias (2 파일)

**`apps/builder/vite.config.ts`** (7곳):

```diff
- base: command === "build" ? "/xstudio/" : "/",
+ base: command === "build" ? "/composition/" : "/",

- { find: /^@xstudio\/shared\/components\/styles\/(.*)$/, ...
+ { find: /^@composition\/shared\/components\/styles\/(.*)$/, ...
  # (나머지 6개 alias 동일 패턴)

- exclude: ["xstudio-wasm"],
+ exclude: ["composition-wasm"],  # WASM 패키지명 확인 후 결정
```

**`apps/publish/vite.config.ts`** (6곳):

```diff
- '@xstudio/shared/components': ...
+ '@composition/shared/components': ...
  # (나머지 5개 alias 동일 패턴)
```

#### 3-2. TypeScript config paths (4 파일)

- `apps/builder/tsconfig.app.json`
- `apps/publish/tsconfig.json`
- `packages/shared/tsconfig.json`
- `packages/specs/tsconfig.json`

```diff
- "@xstudio/shared/*": [...]
+ "@composition/shared/*": [...]
```

#### 3-3. ESLint config (3 파일)

- `apps/builder/eslint.config.js`
- `packages/shared/eslint.config.js`
- `packages/specs/eslint.config.js`

```diff
- ...config("@xstudio/config/...")
+ ...config("@composition/config/...")
```

#### 3-4. 배포 설정 (2 파일)

**`vercel.json`**:

```diff
- "buildCommand": "pnpm turbo run build --filter=@xstudio/builder",
+ "buildCommand": "pnpm turbo run build --filter=@composition/builder",
```

**`.github/workflows/deploy.yml`**:

```diff
- run: pnpm turbo run build --filter=@xstudio/builder
+ run: pnpm turbo run build --filter=@composition/builder
```

**Gate**: `pnpm build && pnpm type-check` 성공

---

### Phase 4: 소스 코드 Import 경로 일괄 변경

**대상**: 88개 파일, 174개 참조

일괄 치환 전략:

```bash
# 1. @xstudio/ import → @composition/
find apps packages -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's/@xstudio\//@composition\//g' {} +

# 2. 수동 확인 필요 항목
grep -r "xstudio" apps/ packages/ --include="*.ts" --include="*.tsx"
```

**주요 파일별 참조 수**:
| 파일 | 참조 수 | 비고 |
| --- | --- | --- |
| `apps/builder/src/builder/utils/componentMap.ts` | 40 | 최다 참조 |
| `apps/publish/src/registry/ComponentRegistry.tsx` | 4 | |
| `apps/publish/src/App.tsx` | 4 | |
| `apps/publish/src/renderer/ElementRenderer.tsx` | 4 | |
| `apps/builder/src/builder/workspace/canvas/sprites/ElementSprite.tsx` | 3 | |
| 기타 ~119개 파일 | 1~3 | |

**Gate**: `pnpm build && pnpm type-check` 성공

---

### Phase 5: 문서 + 인프라 갱신

#### 5-1. 프로젝트 문서

| 파일                         | 변경 내용                    |
| ---------------------------- | ---------------------------- |
| `README.md`                  | 프로젝트명, 설명             |
| `CLAUDE.md`                  | 프로젝트명, 구조 설명        |
| `CHANGELOG.md`               | 프로젝트명                   |
| `docs/COMPONENT_SPEC.md`     | `@xstudio/specs` 참조 (30곳) |
| `docs/reference/MONOREPO.md` | 패키지 구조 설명 (85곳)      |
| `docs/adr/*.md`              | ADR 내 참조 (~20곳)          |
| `.claude/**/*.md`            | 규칙/스킬 문서               |

#### 5-2. Claude Code 설정

| 파일                                       | 변경                                 |
| ------------------------------------------ | ------------------------------------ |
| `.claude/skills/xstudio-patterns/`         | 디렉토리명 → `composition-patterns/` |
| `.claude/skills/xstudio-patterns/SKILL.md` | 내용 갱신                            |
| `.claude/rules/*.md`                       | `@xstudio` 참조                      |

#### 5-3. 외부 서비스

| 서비스           | 작업                                                       |
| ---------------- | ---------------------------------------------------------- |
| **Vercel**       | 프로젝트 재연결 (GitHub repo 변경 반영)                    |
| **Supabase**     | GitHub integration 확인 (사용 시)                          |
| **도메인/DNS**   | URL 경로 `/xstudio/` → `/composition/` 반영                |
| **npm registry** | private 패키지면 영향 없음, public이면 새 이름으로 publish |

**Gate**: 전체 빌드 + 배포 파이프라인 통과

---

### Phase 6: 디렉토리 리네이밍 (선택)

루트 디렉토리(`xstudio/`)는 로컬 clone 경로이므로 선택 사항:

```bash
# 새로 clone
git clone https://github.com/rblood79/composition.git
# 또는 기존 디렉토리 rename
mv xstudio composition
```

---

## Phase 실행 순서 (의존 관계)

```
Phase 0 (기준선)
    ↓
Phase 1 (GitHub repo rename) ← 외부 작업, 수동
    ↓
Phase 2 (package.json) + Phase 3 (빌드설정 + import alias) ← 동시 가능
    ↓
Phase 4 (소스코드 import 일괄 치환)
    ↓
Phase 5 (문서 + 인프라)
    ↓
Phase 6 (디렉토리, 선택)
```

> **핵심**: Phase 2~4는 **단일 커밋**으로 묶는 것을 권장한다. 중간 상태에서는 빌드가 깨지므로 분리 커밋 시 bisect 불가.

---

## Rollback Plan

| 단계      | 롤백 방법                            |
| --------- | ------------------------------------ |
| Phase 1   | GitHub에서 다시 `xstudio`로 rename   |
| Phase 2~4 | `git revert` (단일 커밋이므로 1회)   |
| Phase 5   | 문서는 순수 텍스트이므로 revert 안전 |
| Vercel    | 이전 repo 재연결                     |

---

## Checklist

- [ ] Phase 0: 빌드 기준선 확보
- [ ] Phase 1: GitHub repo rename (`rblood79/xstudio` → `rblood79/composition`)
- [ ] Phase 1: 로컬 + 팀원 remote URL 갱신
- [ ] Phase 2: 6개 package.json 패키지명 변경
- [ ] Phase 2: `pnpm install` 성공
- [ ] Phase 3: Vite alias 변경 (2 파일)
- [ ] Phase 3: TypeScript paths 변경 (4 파일)
- [ ] Phase 3: ESLint config 변경 (3 파일)
- [ ] Phase 3: 배포 설정 변경 (vercel.json, deploy.yml)
- [ ] Phase 4: 88개 파일 import 경로 일괄 치환
- [ ] Phase 4: `pnpm build && pnpm type-check` 성공
- [ ] Phase 5: 문서 갱신 (README, CLAUDE.md, ADR 등)
- [ ] Phase 5: `.claude/` 디렉토리/파일 갱신
- [ ] Phase 5: Vercel 프로젝트 재연결
- [ ] Phase 5: 배포 파이프라인 확인

---

## References

- [Renaming a GitHub repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository)
- [pnpm workspace protocol](https://pnpm.io/workspaces)
