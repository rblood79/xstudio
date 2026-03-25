# Project Renaming Breakdown — xstudio → composition

## Purpose

이 문서는 [ADR-044](../adr/044-project-renaming-xstudio-to-composition.md)을 실행 가능한 작업 단위로 분해한 상세 플랜이다.
ADR은 결정과 제약만 유지하며, 이 문서가 실제 구현 기준 문서다.

---

## Phase별 현황

| Phase | 설명                           | 커밋 단위     | 주요 목표                         |
| :---: | ------------------------------ | ------------- | --------------------------------- |
|   0   | 사전 준비                      | —             | 빌드 기준선 확보                  |
|   1   | GitHub repo rename             | 수동 (외부)   | repo URL 전환                     |
|  2~4  | 코드 변경 (패키지+빌드+import) | **단일 커밋** | 패키지명, alias, import 경로 일괄 |
|   5   | 문서 + 인프라                  | 별도 커밋     | 문서 갱신, Vercel 재연결          |
|   6   | 로컬 디렉토리 (선택)           | —             | 로컬 clone 경로                   |

---

## Phase 0: 사전 준비 (빌드 기준선 확보)

**Gate**: `pnpm build && pnpm type-check` 성공

1. 현재 상태에서 빌드/타입체크 통과 확인
2. 전체 `xstudio` 참조 목록 스냅샷 기록 (변경 추적용)
3. **활성 브랜치 사전 정리**: ~130개 파일 변경이 모든 열린 브랜치와 conflict를 유발하므로, 리네이밍 전에 활성 브랜치를 main에 merge하거나, 리네이밍 후 각 브랜치에서 `git rebase main`을 실행하도록 팀에 공지

---

## Phase 1: GitHub 리포지토리 리네이밍

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

## Phase 2~4: 코드 변경 (단일 커밋)

> Phase 2(패키지명), Phase 3(빌드설정), Phase 4(소스코드 import)를 **단일 커밋**으로 묶는다.
> 중간 상태에서는 빌드가 깨지므로 분리 커밋 시 bisect 불가.

### 2-1. 패키지명 변경 (6 파일)

#### 루트 `package.json`

```diff
- "name": "xstudio",
+ "name": "composition",
```

- scripts 내 `@xstudio/*` → `@composition/*` (7곳)

#### `packages/config/package.json`

```diff
- "name": "@xstudio/config",
+ "name": "@composition/config",
```

#### `packages/shared/package.json`

```diff
- "name": "@xstudio/shared",
+ "name": "@composition/shared",
```

- dependencies 내 `@xstudio/config` → `@composition/config`

#### `packages/specs/package.json`

```diff
- "name": "@xstudio/specs",
+ "name": "@composition/specs",
```

#### `apps/builder/package.json`

```diff
- "name": "@xstudio/builder",
+ "name": "@composition/builder",
```

- dependencies 내 `@xstudio/*` → `@composition/*` (3곳)

#### `apps/publish/package.json`

```diff
- "name": "@xstudio/publish",
+ "name": "@composition/publish",
```

- dependencies 내 `@xstudio/*` → `@composition/*` (2곳)

### 2-2. WASM 패키지 변경 (4 파일)

#### `apps/builder/src/builder/workspace/canvas/wasm/Cargo.toml`

```diff
- name = "xstudio-wasm"
+ name = "composition-wasm"
```

#### `apps/builder/wasm-bindings/pkg/package.json`

```diff
- "name": "xstudio-wasm",
+ "name": "composition-wasm",
```

- 파일 참조: `xstudio_wasm_bg.wasm` → `composition_wasm_bg.wasm` 등

#### WASM import 경로 (3 파일)

- `wasm-bindings/rustWasm.ts`: `./pkg/xstudio_wasm` → `./pkg/composition_wasm`
- `wasm-bindings/spatialIndex.ts`: 동일 변경
- `wasm-worker/layoutWorker.ts`: 동일 변경

**WASM clean rebuild 필수**:

```bash
# 1. 기존 빌드 아티팩트 정리 (구 파일명 잔존 방지)
cd apps/builder/src/builder/workspace/canvas/wasm
cargo clean
rm -rf ../../../../../../wasm-bindings/pkg/

# 2. 재빌드 (새 파일명으로 생성)
wasm-pack build --target bundler --out-dir ../../../../../../wasm-bindings/pkg
```

- `cargo clean`: `wasm/target/` 하위의 구 이름 아티팩트(`xstudio_wasm.wasm` 등) 제거
- `rm -rf pkg/`: 구 이름의 생성 파일(`xstudio_wasm.js`, `xstudio_wasm_bg.wasm` 등)이 남아있으면 Vite가 잘못된 파일을 참조할 수 있음
- rebuild 후 `pkg/` 에 `composition_wasm.js`, `composition_wasm_bg.wasm`, `composition_wasm.d.ts`, `composition_wasm_bg.js` 생성 확인

**`@vite-ignore` 런타임 검증 (CRITICAL)**:

`rustWasm.ts`의 WASM import는 `/* @vite-ignore */`으로 Vite alias를 우회하므로, 파일명 불일치가 빌드 시점에 에러를 발생시키지 않고 **런타임에** `ERR_MODULE_NOT_FOUND`로 실패한다. Gate에서 반드시 `pnpm dev` 기동 후 WASM 로드 성공을 확인해야 한다.

### 2-3. Vite config alias (2 파일)

**`apps/builder/vite.config.ts`** (7곳):

```diff
- base: command === "build" ? "/xstudio/" : "/",
+ base: command === "build" ? "/composition/" : "/",

- { find: /^@xstudio\/shared\/components\/styles\/(.*)$/, ...
+ { find: /^@composition\/shared\/components\/styles\/(.*)$/, ...
  # (나머지 6개 alias 동일 패턴)

- exclude: ["xstudio-wasm"],
+ exclude: ["composition-wasm"],
```

**`apps/publish/vite.config.ts`** (6곳):

```diff
- '@xstudio/shared/components': ...
+ '@composition/shared/components': ...
  # (나머지 5개 alias 동일 패턴)
```

### 2-4. TypeScript config paths (4 파일)

- `apps/builder/tsconfig.app.json`
- `apps/publish/tsconfig.json`
- `packages/shared/tsconfig.json`
- `packages/specs/tsconfig.json`

```diff
- "@xstudio/shared/*": [...]
+ "@composition/shared/*": [...]
```

### 2-5. ESLint config (3 파일)

- `apps/builder/eslint.config.js`
- `packages/shared/eslint.config.js`
- `packages/specs/eslint.config.js`

```diff
- ...config("@xstudio/config/...")
+ ...config("@composition/config/...")
```

### 2-6. 배포 설정 (2 파일)

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

### 2-7. 소스 코드 Import 경로 일괄 변경

**대상**: 88개 파일, 174개 참조

일괄 치환 전략:

```bash
# 1. @xstudio/ import → @composition/ (TS/TSX)
find apps packages -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i 's/@xstudio\//@composition\//g' {} +

# 2. CSS 주석 내 참조도 치환 (기능 무영향이지만 잔존 검증에서 걸림)
find apps packages -type f -name "*.css" \
  -exec sed -i 's/@xstudio\//@composition\//g' {} +

# 3. 수동 확인 — 모든 소스 파일에서 xstudio 잔존 0건 확인
grep -r "xstudio" apps/ packages/ --include="*.ts" --include="*.tsx" --include="*.css"
```

**주요 파일별 참조 수**:

| 파일                                                                  | 참조 수 | 비고      |
| --------------------------------------------------------------------- | ------- | --------- |
| `apps/builder/src/builder/utils/componentMap.ts`                      | 40      | 최다 참조 |
| `apps/publish/src/registry/ComponentRegistry.tsx`                     | 4       |           |
| `apps/publish/src/App.tsx`                                            | 4       |           |
| `apps/publish/src/renderer/ElementRenderer.tsx`                       | 4       |           |
| `apps/builder/src/builder/workspace/canvas/sprites/ElementSprite.tsx` | 3       |           |
| 기타 ~119개 파일                                                      | 1~3     |           |

### 2-8. Lockfile 재생성

```bash
pnpm install  # lockfile 자동 재생성
```

**Gate**: `pnpm install && pnpm build && pnpm type-check` 성공 + `pnpm dev` 기동 후 WASM 로드 확인

---

## Phase 5: 문서 + 인프라 갱신

### 5-1. 프로젝트 문서

| 파일                         | 변경 내용                    |
| ---------------------------- | ---------------------------- |
| `README.md`                  | 프로젝트명, 설명             |
| `CLAUDE.md`                  | 프로젝트명, 구조 설명        |
| `CHANGELOG.md`               | 프로젝트명                   |
| `docs/COMPONENT_SPEC.md`     | `@xstudio/specs` 참조 (30곳) |
| `docs/reference/MONOREPO.md` | 패키지 구조 설명 (85곳)      |
| `docs/adr/*.md`              | ADR 내 참조 (~20곳)          |
| `.claude/**/*.md`            | 규칙/스킬 문서               |

### 5-2. Claude Code 설정

| 파일                                       | 변경                                 |
| ------------------------------------------ | ------------------------------------ |
| `.claude/skills/xstudio-patterns/`         | 디렉토리명 → `composition-patterns/` |
| `.claude/skills/xstudio-patterns/SKILL.md` | 내용 갱신                            |
| `.claude/rules/*.md`                       | `@xstudio` 참조                      |

### 5-3. 외부 서비스

| 서비스           | 작업                                                       |
| ---------------- | ---------------------------------------------------------- |
| **Vercel**       | 프로젝트 재연결 (GitHub repo 변경 반영)                    |
| **Supabase**     | GitHub integration 확인 (사용 시)                          |
| **도메인/DNS**   | URL 경로 `/xstudio/` → `/composition/` 반영                |
| **npm registry** | private 패키지면 영향 없음, public이면 새 이름으로 publish |

**Gate**: 전체 빌드 + 배포 파이프라인 통과 + 문서 내 `xstudio` 잔존 0건

---

## Phase 6: 디렉토리 리네이밍 (선택)

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
Phase 2~4 (패키지명 + 빌드설정 + import + WASM) ← 단일 커밋
    ↓
Phase 5 (문서 + 인프라) ← 별도 커밋
    ↓
Phase 6 (디렉토리, 선택)
```

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
- [ ] Phase 0: 활성 브랜치 merge 또는 rebase 공지
- [ ] Phase 1: GitHub repo rename (`rblood79/xstudio` → `rblood79/composition`)
- [ ] Phase 1: 로컬 + 팀원 remote URL 갱신
- [ ] Phase 2~4: 6개 package.json 패키지명 변경
- [ ] Phase 2~4: WASM Cargo.toml + pkg/package.json 변경
- [ ] Phase 2~4: WASM clean rebuild (`cargo clean` + `rm -rf pkg/` + `wasm-pack build`)
- [ ] Phase 2~4: Vite alias 변경 (2 파일)
- [ ] Phase 2~4: TypeScript paths 변경 (4 파일)
- [ ] Phase 2~4: ESLint config 변경 (3 파일)
- [ ] Phase 2~4: 배포 설정 변경 (vercel.json, deploy.yml)
- [ ] Phase 2~4: 88개 파일 import 경로 일괄 치환
- [ ] Phase 2~4: `pnpm install && pnpm build && pnpm type-check` 성공
- [ ] Phase 2~4: `pnpm dev` 기동 후 WASM 로드 성공 확인 (런타임 검증)
- [ ] Phase 5: 문서 갱신 (README, CLAUDE.md, ADR 등)
- [ ] Phase 5: `.claude/` 디렉토리/파일 갱신
- [ ] Phase 5: Vercel 프로젝트 재연결
- [ ] Phase 5: 배포 파이프라인 확인
- [ ] Phase 5: `grep -r "xstudio"` 잔존 참조 0건 확인
