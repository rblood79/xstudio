# FONTS 실행 계획서

## 0) 확정 결정 (2026-02-13)

1. 폰트 적용 규칙은 Builder/WebGL, Preview, Publish, Static Export에 **동일 적용**한다.
2. 저장 전략은 **일반적인 빌더 방식**(프로젝트 스코프 자산 + 런타임 캐시)으로 간다.
3. 정적 퍼블리시는 단일 HTML이 아니라 **멀티파일 산출물**로 간다.
4. 멀티파일 전달 방식은 **디렉터리 저장**(사용자 선택 경로 직접 쓰기)으로 간다.
5. 폰트 메타/적용 UX는 **기존 Typography 컨트롤 재사용**을 기본으로 한다.
6. 폰트 레지스트리 정본은 **`projects` 컬럼 확장(`font_registry`)**으로 저장한다.

---

## 1) 목적

사용자 커스텀 폰트를 Builder에서 추가한 뒤, 아래 모든 경로에서 동일하게 보이도록 한다.

1. 스타일 패널 Typography의 폰트 리스트에 노출
2. WebGL/Skia 텍스트 렌더 경로 반영
3. Preview iframe(srcdoc) 반영
4. Publish 앱 반영
5. 정적 멀티파일 산출물에서 오프라인 환경 포함 정상 동작

---

## 1-1) 현재 구현 상태 (Baseline)

> 아래는 계획 수립 기준으로 이미 구현된 코드를 정리한 것이다. Phase별 작업 시 이 기반 위에서 시작한다.

| 영역 | 상태 | 파일 |
|------|------|------|
| **커스텀 폰트 타입** | ✅ `CustomFontAsset` | `packages/shared/src/utils/font.utils.ts` |
| **localStorage 저장** | ✅ `xstudio.custom-fonts` 키 | `packages/shared/src/utils/font.utils.ts` (`CUSTOM_FONT_STORAGE_KEY`) |
| **@font-face CSS 생성** | ✅ `buildCustomFontFaceCss()` | `packages/shared/src/utils/font.utils.ts` |
| **Builder DOM 적용** | ✅ | `apps/builder/src/builder/fonts/customFonts.ts` |
| **초기화** | ✅ | `apps/builder/src/builder/fonts/initCustomFonts.ts` |
| **Publish 읽기** | ✅ localStorage에서 읽어 적용 | `apps/publish/src/App.tsx` |
| **Skia 폰트 매니저** | ✅ 기본 폰트만, 커스텀 미지원 | `apps/builder/src/builder/workspace/canvas/skia/fontManager.ts` |
| **IndexedDB 캐싱** | ✅ DB명 `xstudio-fonts` | `apps/builder/src/builder/workspace/canvas/skia/fontManager.ts` |
| **Typography UI** | ✅ 폰트 추가 버튼 + family 입력 흐름 존재 | `apps/builder/src/builder/panels/styles/sections/TypographySection.tsx` |
| **프로젝트 레벨 레지스트리** | ❌ 미구현 | — |
| **Export에 폰트 포함** | ❌ 미구현 | `packages/shared/src/types/export.types.ts` (`ExportedProjectData`에 폰트 필드 없음) |
| **마이그레이션** | ❌ 미구현 | — |

---

## 2) 범위(Scope)

### In Scope

- 폰트 등록/저장/삭제/목록 노출 UX
- 폰트 메타데이터 구조 정의 (family, weight/style, source, format)
- 렌더링 경로별 폰트 로드 전략 통합(Builder DOM, WebGL/Skia, Preview srcdoc, Publish)
- 정적 export 멀티파일 산출(`index.html + assets/fonts/*`) 구현
- 정적 export 멀티파일의 디렉터리 저장 플로우 구현
- `projects.font_registry` 컬럼 확장 및 마이그레이션
- 기존 localStorage 기반 커스텀 폰트 데이터의 마이그레이션

### Out of Scope (이번 라운드)

- 팀/프로젝트 단위 원격 폰트 저장소 동기화(예: Supabase Storage)
- 라이선스 스캐닝 자동화
- Variable font 고급 축(axis) 편집 UI

---

## 3) 설계 원칙

1. **단일 폰트 레지스트리**를 기준으로 모든 런타임이 읽는다.
2. **프로젝트 자산(project-asset) 중심**으로 운영하고, data URL은 임시/마이그레이션 용도로만 허용한다.
3. CSS(`@font-face`)와 Canvas/WebGL 폰트 로더 입력을 동일 메타데이터에서 파생한다.
4. 실패 시 반드시 fallback 폰트 체인으로 안전하게 렌더한다.
5. 저장 형식은 버전 필드를 포함해 점진 마이그레이션 가능해야 한다.

---

## 4) 데이터 모델 제안 (v2)

```ts
type FontSourceType = 'project-asset' | 'remote-url' | 'data-url-temp';

interface FontFileRef {
  type: FontSourceType;
  url: string;                 // /assets/fonts/*.woff2 | https://... | data:...
  originalFileName?: string;
  mimeType?: string;
  byteSize?: number;
  checksum?: string;
}

interface FontFaceAsset {
  id: string;
  family: string;              // 예: "Pretendard Custom"
  weight?: string;             // "400", "700" 등
  style?: 'normal' | 'italic';
  format?: 'woff2' | 'woff' | 'truetype' | 'opentype';
  unicodeRange?: string;
  display?: 'swap' | 'fallback' | 'block' | 'optional';
  source: FontFileRef;
  createdAt: string;
  updatedAt: string;
}

interface FontRegistryV2 {
  version: 2;
  faces: FontFaceAsset[];
}
```

레거시 호환(현재 운영 데이터):

> **참고:** 아래는 현재 코드의 `CustomFontAsset` 타입(`packages/shared/src/utils/font.utils.ts`)과 동일하며,
> 마이그레이션 문맥에서 "Legacy"로 별칭한다.

```ts
// 실제 코드: CustomFontAsset (packages/shared/src/utils/font.utils.ts)
interface LegacyCustomFontAsset {
  id: string;
  family: string;
  source: string;   // 현재는 data URL만 사용
  format?: 'woff2' | 'woff' | 'truetype' | 'opentype' | 'embedded-opentype' | 'svg';
}
```

---

## 5) 저장 전략 (일반적인 빌더 방식)

1. **정본(Source of Truth)**: 프로젝트 데이터(`projects.font_registry`)
2. **편집 캐시**: IndexedDB(바이너리) + localStorage(경량 메타 캐시)
3. **런타임 로드**: Builder/Preview/Publish는 동일 레지스트리에서 `@font-face` 생성
4. **Export 시점**: `project-asset` 경로로 정규화 후 상대 경로로 주입

핵심:
- localStorage 단독 저장은 중단하고, 프로젝트 상태 기반으로 통일한다.
- 기존 localStorage(`xstudio.custom-fonts`)는 읽어서 `FontRegistryV2`로 1회 마이그레이션한다.
- 서버/DB 정본은 `projects.font_registry (json/jsonb)` 컬럼으로 관리한다.

---

## 6) 마이그레이션 전략 (Legacy → v2)

1. 앱 부팅 시 `projects.font_registry` 유무 확인
2. 없고 `xstudio.custom-fonts`가 있으면 `LegacyCustomFontAsset[]` 파싱
3. 각 항목을 `FontFaceAsset`으로 변환
4. `source`가 data URL이면 `source.type = 'data-url-temp'`로 표기
5. 변환 완료 후 `projects.font_registry(version:2)` 저장
6. 기존 키는 즉시 삭제하지 않고 1~2 릴리스 동안 fallback read만 유지

---

## 7) 단계별 실행 계획

### Phase A. 레지스트리/서비스 계층 정리

- `FontRegistryV2` 타입 및 관리 모듈 신규 작성 (읽기/쓰기/검증/중복 처리/버전 마이그레이션)
  - 제안 위치: `packages/shared/src/types/font.types.ts` (타입), `packages/shared/src/utils/fontRegistry.ts` (로직)
- 기존 `buildCustomFontFaceCss()`를 레지스트리 기반으로 확장하거나 래핑
- Skia 로더 입력 생성 유틸 분리 (현재 `SkiaFontManager`는 기본 폰트만 지원)
- 파일 확장자/포맷 검증, 파일 크기 제한 정책 추가
- `ExportedProjectData`(`packages/shared/src/types/export.types.ts`)에 `fontRegistry` 필드 추가
- `projects` 스키마 확장: `font_registry (jsonb)` 컬럼 추가
  - `ProjectsApiService.ts`의 `Project` 인터페이스에 `font_registry?: FontRegistryV2` 필드 추가
  - Supabase 쿼리는 `select("*")` 패턴이라 DB 반영 후 데이터는 자동 조회됨

**산출물**
- 공용 유틸/타입
- 레지스트리 단위 테스트
- 레거시 마이그레이션 단위 테스트

### Phase B. Builder UX

> **현재 상태:** `TypographySection.tsx`에 폰트 추가 버튼과 family 입력 흐름이 이미 존재한다.
> 아래는 v2 레지스트리 연동 기준 보완 사항이다.

- ~~Typography 섹션에 `폰트 추가` 버튼 제공~~ → ✅ 이미 구현됨
- **별도 신규 모달/패널은 만들지 않고, 기존 Typography 컨트롤 재사용**
- 기존 localStorage 직접 저장 → `FontRegistryV2` 기반 저장으로 전환
- 폰트 목록: 기본 폰트 + 커스텀 폰트 그룹화 표시 (현재 `DEFAULT_FONT_OPTIONS` + 커스텀 합산)
- 삭제/교체 UX 보강
- `customFonts.ts`와 `initCustomFonts.ts`를 레지스트리 기반으로 리팩터링

**산출물**
- 스타일 패널 UI 레지스트리 연동
- 사용자 액션(추가/삭제/선택) E2E 시나리오

### Phase C. WebGL/Skia 반영

> **현재 상태:** `SkiaFontManager`(`apps/builder/src/builder/workspace/canvas/skia/fontManager.ts`)가
> IndexedDB(`xstudio-fonts`) 캐싱과 `CanvasKit.Typeface.MakeFreeTypeFaceFromData()` 로드를 이미 지원하지만,
> **커스텀 폰트 등록 경로는 미구현**이다.

- `SkiaFontManager`에 레지스트리 기반 커스텀 폰트 로드 경로 추가
- 텍스트 렌더러가 레지스트리 기반 폰트를 우선 조회
- 폰트 로드 완료 이벤트 후 재측정/재렌더 트리거
- 로드 실패 시 fallback 체인 명확화

**산출물**
- `SkiaFontManager` 커스텀 폰트 통합 테스트
- 대표 컴포넌트 폰트 적용 검증 (예: Text/Button/Input/Badge/Heading)

### Phase D. Preview/Publish 런타임 반영

> **현재 상태:** Publish(`apps/publish/src/App.tsx`)는 localStorage에서 직접 커스텀 폰트를 읽어 적용 중이다.
> 레지스트리 전환 후에는 프로젝트 데이터 기반으로 변경해야 한다.

- Preview srcdoc 생성 시 레지스트리 기반 `@font-face` 포함
- Publish 앱 초기화 시 동일 생성기 사용해 head 주입 (localStorage 의존 제거)
- 세션 프리뷰/새 탭 프리뷰 간 레지스트리 전달 방식 통일

**산출물**
- Preview/Publish 렌더 동일성 확인

### Phase E. 정적 Export (멀티파일, 핵심)

- export 산출 형식을 멀티파일로 전환
- 기본 전략: `assets/fonts/*` 생성 + HTML/CSS에 상대 경로 연결
- export 메타에 폰트 목록과 매핑 정보 포함
- 전달 방식: **디렉터리 저장**
  - 사용자 디렉터리 선택 → `index.html`, `project.json`, `assets/fonts/*` 직접 쓰기
  - 구현 기준 API: File System Access API (`showDirectoryPicker`)

**산출물 구조 (예시)**
- `index.html`
- `project.json`
- `assets/fonts/*.woff2`
- `assets/fonts/manifest.json` (선택)

검증:
- 로컬 파일 서버에서 오프라인 상태로 폰트 정상 동작

---

## 8) 수용 기준(Acceptance Criteria)

1. 사용자 폰트 업로드 후 Typography 폰트 리스트에서 즉시 보인다.
2. 같은 요소가 Builder(WebGL/Skia), Preview, Publish에서 동일 family/weight/style로 렌더된다.
3. 정적 멀티파일 산출물을 별도 서버에 올리거나 로컬 서버에서 열어도 폰트가 깨지지 않는다.
4. 폰트 로드 실패 시 UI 깨짐 없이 fallback 폰트로 렌더된다.
5. 프로젝트 재진입 시 폰트 목록/적용 상태가 유지된다.
6. 기존 레거시 폰트(localStorage 배열) 사용 프로젝트도 자동 마이그레이션 후 정상 동작한다.
7. export 시 사용자가 선택한 디렉터리에 `index.html/project.json/assets/fonts/*`가 생성된다.

---

## 9) 테스트 계획

- 단위 테스트
  - 포맷 추론, CSS 생성, 레지스트리 merge/중복 처리
  - Legacy → v2 마이그레이션
  - export 경로 치환(`/assets/fonts/*`) 검증
- 통합 테스트
  - 스타일 패널 선택 → 요소 style 반영 → 렌더 반영
- E2E 테스트
  - 업로드 → 적용 → Preview 확인 → Publish 확인
  - 프로젝트 재진입 후 폰트 유지 확인
  - 디렉터리 저장 export 후 파일 구조/상대 경로 동작 확인
- 수동 확인
  - 정적 멀티파일 export 결과를 로컬 파일 서버에서 확인

---

## 10) 리스크 및 대응

- **리스크:** data URL 기반 기존 데이터로 인한 용량 증가
  - **대응:** 마이그레이션 후 export 단계에서 `assets/fonts`로 정규화
- **리스크:** 브라우저/Canvas 폰트 로딩 타이밍 차이
  - **대응:** 로딩 완료 신호 기반 재측정/재렌더
- **리스크:** remote URL 폰트의 CORS/가용성 문제
  - **대응:** export 시 로컬 자산으로 복제 실패하면 경고 표출 + fallback 적용
- **리스크:** 디렉터리 저장 API 브라우저 지원 편차
  - `showDirectoryPicker`는 Chromium 계열(Chrome 86+, Edge 86+) 전용, Firefox/Safari 미지원
  - **대응:** 지원 브라우저 정책 명시 + 비지원 환경 fallback (ZIP 다운로드 또는 안내 메시지)
- **리스크:** 폰트 라이선스 이슈
  - **대응:** 업로드 시 라이선스 확인 안내 문구 추가

---

## 11) 구현 순서 제안

1. 레지스트리 v2 + 마이그레이션(Phase A)
2. 스타일 패널 UX 보완(Phase B)
3. WebGL/Skia 로딩/재렌더 안정화(Phase C)
4. Preview/Publish 통합(Phase D)
5. 정적 Export 멀티파일 자산화(Phase E)

---

## 12) 관련 코드 위치 요약

| 파일 | 역할 |
|------|------|
| `packages/shared/src/utils/font.utils.ts` | `CustomFontAsset` 타입, `CUSTOM_FONT_STORAGE_KEY`, `buildCustomFontFaceCss()` |
| `apps/builder/src/builder/fonts/customFonts.ts` | Builder DOM 폰트 적용 |
| `apps/builder/src/builder/fonts/initCustomFonts.ts` | 앱 부팅 시 폰트 초기화 |
| `apps/builder/src/builder/panels/styles/sections/TypographySection.tsx` | Typography UI (폰트 추가/선택) |
| `apps/builder/src/builder/workspace/canvas/skia/fontManager.ts` | `SkiaFontManager` (IndexedDB 캐싱, Typeface 로드) |
| `apps/publish/src/App.tsx` | Publish 앱 폰트 읽기 |
| `apps/builder/src/services/api/ProjectsApiService.ts` | `projects` API 타입/저장 (`font_registry` 확장 대상) |
| `packages/shared/src/types/export.types.ts` | `ExportedProjectData` (폰트 필드 추가 필요) |
| `packages/shared/src/utils/export.utils.ts` | Export 유틸리티 |

---

## 13) 코드 수정 시작 전 체크리스트

- [x] 계획서 리뷰 승인
- [x] Export 산출물 포맷: 멀티파일(`assets/fonts`)로 확정
- [ ] 용량 제한/허용 확장자 정책 확정
- [ ] 테스트 범위(필수 E2E 시나리오) 확정
- [ ] `SkiaFontManager` 커스텀 폰트 로드 전략 확정 (레지스트리 연동 방식)
- [ ] `ExportedProjectData` 스키마 변경 범위 확정
- [ ] 디렉터리 저장 API 지원 브라우저 정책 확정
- [ ] `projects.font_registry` 컬럼 마이그레이션 방식 확정 (DB/타입/API 동시 반영)
