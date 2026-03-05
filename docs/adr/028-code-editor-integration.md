# ADR-028: Code Editor 통합 — 하드유저를 위한 React 코드 편집 환경

## Status

Proposed (2026-03-05)

## Context

### 문제 정의

XStudio는 노코드 빌더로서 WebGL/Skia 캔버스 기반 비주얼 편집을 제공한다. 그러나 **하드유저**(프론트엔드 개발자, 파워 유저)는 비주얼 편집만으로는 복잡한 커스터마이징이 제한된다. 실제 React 코드를 직접 편집하고, 그 결과를 캔버스/프리뷰에서 실시간 확인할 수 있는 **Code Editor 모드**가 필요하다.

**현재 흐름** (노코드 전용):

```
캔버스에서 요소 선택 → 우측 패널에서 속성 편집 → Skia 렌더링 반영
```

**목표 흐름** (코드 편집 모드):

```
캔버스/트리에서 요소 선택 → Code Editor에서 React JSX/TSX 확인 및 편집
→ 실시간 캔버스/프리뷰 반영 ← → 캔버스 편집 시 코드 자동 갱신
```

### 핵심 요구사항

| 요구사항                 | 설명                                                       |
| ------------------------ | ---------------------------------------------------------- |
| **코드 힌트**            | React/JSX/TSX 구문에 대한 IntelliSense, 자동완성           |
| **함수 편의 기능**       | Go-to-definition, parameter hints, 에러 진단               |
| **실시간 양방향 동기화** | 코드 편집 → UI 반영, UI 편집 → 코드 반영                   |
| **상용 라이선스**        | MIT/Apache 2.0/BSD 등 상용화에 문제없는 라이선스           |
| **번들 성능**            | 초기 로드 500KB 미만 목표 (lazy load 허용)                 |
| **기존 아키텍처 호환**   | Zustand 스토어, Spec 시스템, Skia 렌더러와 자연스러운 통합 |

### 업계 레퍼런스

| 도구           | 코드 편집 방식                                            |
| -------------- | --------------------------------------------------------- |
| **Webflow**    | 커스텀 코드 패널 (HTML/CSS/JS 삽입, 전체 React 편집 아님) |
| **Framer**     | 내장 코드 에디터 (React 컴포넌트 직접 편집, Monaco 기반)  |
| **Builder.io** | 코드 뷰 토글 (JSX 읽기 + 커스텀 코드 블록)                |
| **Plasmic**    | 코드 생성 + 외부 IDE 연동 (에디터 내장 X)                 |
| **Retool**     | JS 에디터 패널 (함수/쿼리 편집, CodeMirror 기반)          |
| **Miro**       | 캔버스 내 코드 블록 (CodeMirror 6 임베드)                 |

### Hard Constraints

- Skia/CanvasKit + PixiJS 듀얼 렌더러 유지
- Zustand 상태 관리 파이프라인 준수 (Memory → Index → History → DB → Preview)
- Spec 기반 컴포넌트 시스템 호환
- `layoutVersion` 계약 준수
- 초기 번들 500KB 미만 (에디터는 lazy load 가능)
- MIT/Apache 2.0/BSD 라이선스

## Alternatives Considered

### 대안 A: Monaco Editor (@monaco-editor/react)

- **설명**: VS Code의 코어 에디터. CDN 로딩으로 번들 분리. TypeScript Language Service 내장으로 IntelliSense, 진단, Go-to-definition 기본 제공.
- **라이선스**: MIT
- **번들**: ~2MB (CDN 분리 시 초기 번들 영향 없음, 런타임 로드 ~2MB)
- **위험**:
  - 기술: **L** — TypeScript/JSX 지원 최고 수준, 안정적 API
  - 성능: **M** — CDN 로드 시 ~2MB 네트워크 비용, Web Worker 3-4개 생성, 메모리 50-80MB
  - 유지보수: **L** — Microsoft 유지보수, 대규모 커뮤니티
  - 마이그레이션: **L** — @monaco-editor/react로 React 통합 완성도 높음

### 대안 B: CodeMirror 6 (@uiw/react-codemirror + @valtown/codemirror-ts)

- **설명**: 모듈러 아키텍처의 경량 에디터. TypeScript IntelliSense는 @valtown/codemirror-ts로 Web Worker 기반 제공. 필요한 기능만 선택적 번들링.
- **라이선스**: MIT
- **번들**: ~75-135KB gzipped (코어 + 언어 모드)
- **위험**:
  - 기술: **M** — TypeScript IntelliSense가 별도 패키지 의존 (@valtown/codemirror-ts), Monaco 대비 기능 간극 존재
  - 성능: **L** — 경량, 모바일 지원 우수, 메모리 10-20MB
  - 유지보수: **L** — Marijn Haverbeke 유지보수, Replit/Sourcegraph/Miro 채택
  - 마이그레이션: **L** — 모듈러 구조로 점진 확장 용이

### 대안 C: Sandpack (CodeSandbox 런타임)

- **설명**: 에디터(CodeMirror 6) + 번들러 + 프리뷰 iframe 올인원 솔루션. React/TypeScript 프로젝트 템플릿 제공. npm 의존성 해결, HMR, 에러 오버레이 내장.
- **라이선스**: MIT (일부 서브패키지 Apache 2.0)
- **번들**: 중간 (~CodeMirror 6 + 번들러 런타임)
- **위험**:
  - 기술: **M** — IntelliSense 깊이 부족 (CodeMirror 기본 수준), 커스터마이징 제한
  - 성능: **M** — 번들러 iframe 추가 오버헤드
  - 유지보수: **M** — CodeSandbox 인프라 의존 (셀프 호스팅 가능하나 복잡)
  - 마이그레이션: **H** — 기존 Zustand 스토어/Spec 시스템과 별개 런타임으로 동작, 양방향 동기화 복잡

### 대안 D: 하이브리드 — CodeMirror 6 에디터 + esbuild-wasm 트랜스파일러

- **설명**: CodeMirror 6을 에디터로, esbuild-wasm을 브라우저 내 JSX/TSX 트랜스파일러로 사용. IntelliSense는 @valtown/codemirror-ts로. 프리뷰는 기존 preview iframe 활용.
- **라이선스**: MIT (CodeMirror) + MIT (esbuild)
- **번들**: ~135KB (에디터) + ~10MB (esbuild-wasm, lazy load)
- **위험**:
  - 기술: **M** — 두 라이브러리 통합 필요, esbuild-wasm 초기화 시간 (~1초)
  - 성능: **L** — CodeMirror 경량 + esbuild 고속 트랜스파일
  - 유지보수: **M** — 자체 통합 레이어 유지 필요
  - 마이그레이션: **L** — 기존 preview iframe 재사용 가능

## Risk Threshold Check

모든 대안에 CRITICAL 위험 없음. HIGH 위험은 대안 C의 마이그레이션만 해당 (기존 스토어 통합 난이도).

**대안 A vs B 핵심 트레이드오프**:

| 기준                   | Monaco (A)                   | CodeMirror 6 (B)              |
| ---------------------- | ---------------------------- | ----------------------------- |
| IntelliSense 품질      | 최고 (VS Code 동일)          | 양호 (@valtown/codemirror-ts) |
| 번들 크기              | ~2MB CDN (초기 번들 무관)    | ~135KB (직접 번들링)          |
| 메모리 사용량          | 50-80MB                      | 10-20MB                       |
| 모바일 지원            | 미흡                         | 우수                          |
| 자체 확장성            | 중간 (API 복잡)              | 높음 (Extension 시스템)       |
| CDN 의존성             | 있음 (오프라인 시 대안 필요) | 없음                          |
| XStudio 번들 목표 영향 | 없음 (CDN 분리)              | 미미 (lazy load)              |

## Decision

**대안 A: Monaco Editor** 선택

### 선택 근거

1. **IntelliSense 최우선**: 하드유저 대상 기능이므로 코드 편의성이 최고 수준이어야 함. Monaco의 TypeScript Language Service는 VS Code와 동일한 경험을 제공하며, React/JSX/TSX에 대한 완벽한 자동완성, 타입 체크, 에러 진단을 내장
2. **CDN 로딩으로 번들 영향 제거**: `@monaco-editor/react`는 기본적으로 Monaco를 CDN에서 로드하므로 XStudio의 500KB 초기 번들 목표에 영향 없음. `React.lazy()` + Suspense로 에디터 패널 자체도 lazy load
3. **상용 라이선스 안전**: MIT 라이선스
4. **Framer 검증**: 동종 노코드 빌더인 Framer가 Monaco 기반으로 성공적 운영 중
5. **React 타입 정의 주입 용이**: `monaco.languages.typescript.typescriptDefaults.addExtraLib()`로 XStudio 컴포넌트의 Props 타입을 에디터에 주입 가능 → Spec 기반 자동완성

### 위험 수용

- **성능 (M)**: CDN 로딩 + lazy load로 초기 성능 영향 없음. 에디터 활성화 시 ~2MB 로드와 50-80MB 메모리는 하드유저 환경에서 수용 가능
- **오프라인 미지원**: 셀프 호스팅 옵션으로 대응 가능 (`@monaco-editor/react`의 `loader.config({ paths: { vs: '/monaco' } })`)

### CodeMirror 6 대안 보류 근거

CodeMirror 6은 번들 크기와 모바일 지원에서 우수하나, 하드유저가 기대하는 IntelliSense 수준(타입 추론, import 자동완성, 리팩토링)에서 Monaco 대비 간극이 있음. 향후 모바일 코드 편집 요구 시 CodeMirror 6으로 경량 에디터 추가 검토.

## Gates

| 잔존 위험     | 검증 기준                                                                   | 확인 시점       |
| ------------- | --------------------------------------------------------------------------- | --------------- |
| CDN 로드 성능 | 에디터 패널 열기 → Monaco 로드 완료 3초 이내                                | Phase A 완료 시 |
| 메모리 사용량 | 에디터 활성 상태에서 캔버스 60fps 유지                                      | Phase A 완료 시 |
| 양방향 동기화 | 코드 편집 → 캔버스 반영 지연 200ms 이내, 캔버스 편집 → 코드 반영 100ms 이내 | Phase B 완료 시 |
| IntelliSense  | XStudio 컴포넌트 Props 자동완성 동작 확인                                   | Phase C 완료 시 |

## Consequences

### Positive

- 하드유저에게 VS Code 수준의 코드 편집 경험 제공
- 비주얼 편집과 코드 편집 간 양방향 동기화로 워크플로우 유연성 극대화
- Spec 기반 컴포넌트 타입을 에디터에 주입하여 XStudio 전용 IntelliSense 제공
- 코드 기반 커스터마이징 (이벤트 핸들러, 커스텀 로직)의 진입장벽 대폭 완화
- 향후 코드 export/import 기능과 자연스러운 연계

### Negative

- Monaco CDN 의존성 (오프라인/방화벽 환경에서 셀프 호스팅 필요)
- 에디터 활성 시 메모리 50-80MB 추가 사용
- Store ↔ Code AST 양방향 변환 레이어 구현/유지 비용
- 모바일 환경에서 Monaco 편집 경험 미흡

## Implementation Plan

### Phase A: 에디터 기반 인프라 (MVP)

**목표**: Monaco Editor 임베드 + 기본 JSX 표시

**범위**:

1. **패키지 설치**
   - `@monaco-editor/react` (React 래퍼)
   - `monaco-editor` (타입 정의용)

2. **CodeEditorPanel 컴포넌트** (`apps/builder/src/builder/panels/code/`)
   - `CodeEditorPanel.tsx` — Monaco 에디터 래퍼 (React.lazy 로딩)
   - `CodeEditorPanel.css.ts` — tv() 스타일 정의
   - `useCodeEditor.ts` — 에디터 상태 관리 훅
   - 우측 패널 또는 하단 패널로 토글 가능한 레이아웃

3. **Element → JSX 코드 생성기** (`apps/builder/src/builder/utils/codeGen/`)
   - `elementToJsx.ts` — Element 트리 → JSX 문자열 변환
   - `jsxFormatter.ts` — Prettier 포맷팅 (standalone, lazy load)
   - 지원 범위: tag, props (style, className, children), 중첩 구조

4. **에디터 패널 토글 UI**
   - 툴바에 `</>` 코드 에디터 토글 버튼 추가
   - 기존 패널 레이아웃과 충돌 없는 분할 뷰

**기술 세부사항**:

```typescript
// CodeEditorPanel.tsx (개략)
const MonacoEditor = React.lazy(() => import('@monaco-editor/react'));

export function CodeEditorPanel() {
  const selectedElement = useStore((s) => s.selectedElementId ? s.elementsMap[s.selectedElementId] : null);
  const jsxCode = useMemo(() => elementToJsx(selectedElement, elementsMap, childrenMap), [selectedElement]);

  return (
    <Suspense fallback={<EditorSkeleton />}>
      <MonacoEditor
        language="typescriptreact"
        value={jsxCode}
        options={{ minimap: { enabled: false }, fontSize: 13 }}
      />
    </Suspense>
  );
}
```

### Phase B: 양방향 동기화

**목표**: 코드 편집 → Store 반영, Store 편집 → 코드 반영

**범위**:

1. **JSX → Element 파서** (`apps/builder/src/builder/utils/codeGen/`)
   - `jsxToElement.ts` — JSX AST 파싱 → Element props diff 추출
   - AST 파서: `@babel/parser` + `@babel/traverse` (lazy load, ~150KB)
   - 변경 감지: 이전 AST vs 현재 AST diff → 최소 Store 업데이트

2. **동기화 엔진** (`apps/builder/src/builder/utils/codeGen/`)
   - `syncEngine.ts` — debounced 양방향 동기화 조율
   - Store → Code: `selectedElementId` 변경 또는 props 변경 시 코드 재생성
   - Code → Store: 에디터 `onChange` debounce(300ms) → AST 파싱 → diff → Store 업데이트
   - 충돌 방지: 동기화 방향 lock (코드 편집 중 Store→Code 갱신 중단)

3. **히스토리 통합**
   - 코드 편집 시작 → 스냅샷 저장
   - 코드 편집 완료(blur/저장) → 단일 히스토리 블록 커밋
   - `layoutVersion` 증가 (레이아웃 영향 props 변경 시)

4. **Store 파이프라인 준수**
   - Memory Update → Index Rebuild → History Record → DB Persist → Preview Sync

**동기화 흐름**:

```
[Store 변경] ──onChange──→ elementToJsx() ──→ [Monaco 에디터 갱신]
                                                      │
                                                      │ (사용자 코드 편집)
                                                      ▼
[Store 갱신] ←──diff──← jsxToElement() ←──debounce──← [Monaco onChange]
     │
     ├→ History Record
     ├→ layoutVersion++
     ├→ DB Persist (bg)
     └→ Preview Sync (bg)
```

### Phase C: IntelliSense 강화 — XStudio 컴포넌트 타입 주입

**목표**: XStudio Spec 기반 컴포넌트에 대한 자동완성 및 타입 체크

**범위**:

1. **컴포넌트 Props 타입 생성기**
   - Spec 정의에서 TypeScript 타입 선언(.d.ts) 자동 생성
   - `TAG_SPEC_MAP` 순회 → 각 컴포넌트의 Props 인터페이스 추출
   - `monaco.languages.typescript.typescriptDefaults.addExtraLib()` 로 주입

2. **커스텀 자동완성 Provider**
   - XStudio 전용 스니펫 (이벤트 핸들러 템플릿, 스타일 프리셋 등)
   - Spec 컴포넌트 import 자동완성
   - CSS 토큰 자동완성 (S2 TokenRef 목록)

3. **에러 진단 커스터마이징**
   - XStudio에서 지원하지 않는 패턴 경고 (예: useEffect 등 훅 직접 사용 시)
   - Props 유효성 검증 (Spec 제약 기반)

**타입 주입 예시**:

```typescript
// Spec에서 생성된 타입 선언
const xstudioTypes = `
declare module '@xstudio/components' {
  interface ButtonProps {
    variant?: 'accent' | 'primary' | 'secondary' | 'negative';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    isDisabled?: boolean;
    children?: React.ReactNode;
    onPress?: () => void;
  }
  export const Button: React.FC<ButtonProps>;

  interface CardProps {
    variant?: 'filled' | 'outlined' | 'elevated';
    // ...
  }
  export const Card: React.FC<CardProps>;
}
`;

monaco.languages.typescript.typescriptDefaults.addExtraLib(
  xstudioTypes,
  "file:///node_modules/@xstudio/components/index.d.ts",
);
```

### Phase D: 고급 기능

**목표**: 파워 유저 생산성 극대화

**범위**:

1. **멀티 파일 편집**
   - 페이지 단위 코드 뷰 (단일 요소 → 전체 페이지 JSX)
   - 탭 기반 파일 전환 (페이지별, 컴포넌트별)

2. **커스텀 코드 블록**
   - 사용자 정의 React 컴포넌트 작성 지원
   - esbuild-wasm 트랜스파일 → 프리뷰 iframe 즉시 반영
   - npm 패키지 import 지원 (esm.sh CDN 기반)

3. **코드 Export/Import 연동**
   - ADR-007 Project Export와 통합
   - 에디터 코드 → 독립 React 프로젝트로 export
   - 외부 React 코드 import → Element 트리 변환

4. **AI 코드 어시스턴트 연동**
   - ADR-011 AI Assistant와 통합
   - 에디터 내 인라인 AI 제안 (Copilot 스타일)
   - Groq SDK 기반 코드 생성/수정 제안

5. **디버깅 도구**
   - 에디터 내 콘솔 출력 표시
   - React DevTools 연동 (프리뷰 iframe 내)
   - 브레이크포인트 시각화 (선택적)

## References

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) — MIT License
- [@monaco-editor/react](https://github.com/suren-atoyan/monaco-react) — React 래퍼
- [CodeMirror 6](https://codemirror.net/) — 대안 B 참조
- [@valtown/codemirror-ts](https://github.com/val-town/codemirror-ts) — CodeMirror TypeScript 지원
- [Sandpack](https://sandpack.codesandbox.io/) — 대안 C 참조
- [Replit: Betting on CodeMirror](https://blog.replit.com/codemirror) — CodeMirror 6 채택 사례
- [Sourcegraph: Monaco → CodeMirror 마이그레이션](https://sourcegraph.com/blog/migrating-monaco-codemirror) — 비교 분석
- [Miro: 캔버스 코드 에디터](https://medium.com/miro-engineering/how-we-integrated-a-code-editor-on-the-miro-canvas) — CodeMirror 6 캔버스 통합 사례
- ADR-007: Project Export — 코드 Export 연계
- ADR-011: AI Assistant — AI 코드 어시스턴트 연계
- `apps/publish/src/renderer/ElementRenderer.tsx` — 현재 Element → React 렌더링 참조
- `packages/specs/` — Spec 기반 컴포넌트 타입 추출 소스
