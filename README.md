# 🎨 XStudio

**웹 기반 UI 빌더/디자인 스튜디오**

XStudio는 React 19, TypeScript, Supabase를 기반으로 한 현대적인 웹 기반 UI 빌더입니다. 직관적인 드래그 앤 드롭 인터페이스와 실시간 프리뷰를 통해 누구나 쉽게 웹사이트를 제작할 수 있습니다.

## ✨ 주요 기능

- 🖱️ **직관적인 빌더**: 드래그 앤 드롭으로 쉬운 UI 구성
- 🔄 **실시간 프리뷰**: iframe 기반 즉시 미리보기 + computed styles 수집
- 🎨 **디자인 시스템**: 통합 디자인 토큰 및 테마 관리
- ✏️ **인라인 스타일 편집기**: 직관적인 Flexbox 컨트롤과 양방향 동기화
- ⚡ **성능 최적화**: 순환 참조 방지, UPSERT 쿼리, 조건부 로깅 (60-100% 개선)
- ♿ **접근성 우선**: React Aria Components 기반 접근 가능한 UI
- 🔗 **실시간 협업**: Supabase 기반 멀티 유저 지원
- 📱 **반응형 디자인**: 모든 디바이스에 최적화
- 🎯 **컴포넌트 라이브러리**: 재사용 가능한 UI 컴포넌트

## 🛠️ 기술 스택

### Frontend

- **React 19** - 최신 React 기능 활용
- **TypeScript** - 타입 안전성
- **Vite** - 빠른 개발 서버 및 빌드
- **React Aria Components** - 접근성 우선 UI
- **Tailwind CSS 4** - 유틸리티 우선 스타일링
- **Zustand** - 경량 상태 관리

### Backend

- **Supabase** - PostgreSQL + 실시간 기능
- **Row Level Security** - 보안 강화
- **Real-time subscriptions** - 실시간 협업

### 개발 도구

- **Storybook 8** - 컴포넌트 문서화
- **Vitest** - 단위 테스트
- **Playwright** - E2E 테스트
- **ESLint + TypeScript ESLint** - 코드 품질

## � 문서

프로젝트의 상세한 문서는 [`/docs`](./docs) 디렉토리에서 확인할 수 있습니다:

- **[성능 최적화](./docs/features/PERFORMANCE_OPTIMIZATION.md)** ⚡ - 60-100% 성능 개선 가이드
- **[개발 가이드](./docs/guides)** - 개발 워크플로우 및 컨벤션
- **[기능 문서](./docs/features)** - 기능 구현 및 버그 수정 내역

자세한 내용은 [문서 인덱스](./docs/README.md)를 참고하세요.

## �🚀 빠른 시작

### 사전 요구사항

- Node.js 18.0.0 이상
- npm 또는 yarn
- Supabase 계정

### 설치 및 실행

```bash
# 저장소 복제
git clone https://github.com/your-username/xstudio.git
cd xstudio

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일에서 Supabase URL과 키 설정

# 개발 서버 시작
npm run dev
```

### 환경 변수 설정

`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3000
VITE_ENABLE_DEBUG_LOGS=true  # "false"로 설정하면 깔끔한 콘솔 (성능 개선)
```

**성능 팁:**
- `VITE_ENABLE_DEBUG_LOGS=true`: 상세한 디버그 로그 활성화
- `VITE_ENABLE_DEBUG_LOGS=false` 또는 생략: 프로덕션 수준 성능 (콘솔 오버헤드 100% 제거)
- 자세한 내용: [성능 최적화 문서](./docs/features/PERFORMANCE_OPTIMIZATION.md)

## 📁 프로젝트 구조

```
src/
├── 📱 App.tsx                    # 애플리케이션 루트
├── 🔐 auth/                     # 인증 관련
├── 🏗️ builder/                  # 핵심 빌더 시스템
│   ├── 🤖 ai/                   # AI 어시스턴트
│   ├── 🧩 components/           # React Aria 기반 컴포넌트
│   ├── 🎣 hooks/                # 빌더 전용 훅
│   ├── 🔍 inspector/            # 속성 편집기
│   │   └── properties/          # 컴포넌트별 속성 에디터
│   ├── 📚 library/              # 컴포넌트 라이브러리
│   ├── 🏠 main/                 # 메인 빌더 컴포넌트
│   ├── 👁️ preview/              # iframe 프리뷰
│   ├── 📊 stores/               # Zustand 상태 관리 (모듈화됨)
│   │   ├── utils/               # Store 유틸리티 모듈
│   │   └── history/             # Undo/Redo 히스토리 모듈
│   ├── 🎨 theme/                # 테마 및 디자인 토큰
│   └── 🛠️ utils/                # 빌더 유틸리티
├── 📊 dashboard/                # 프로젝트 대시보드
├── 🌐 env/                      # 환경 설정
├── 🔌 services/api/             # API 서비스 레이어
├── 📝 types/                    # TypeScript 타입 정의
└── ⚙️ utils/                    # 공통 유틸리티
```

## 🏗️ 핵심 아키텍처

### 빌더 시스템

```
BuilderCore (메인)
├── BuilderHeader (툴바)
├── BuilderWorkspace (작업 영역)
│   ├── Sidebar (페이지/요소 트리)
│   ├── Preview (iframe 프리뷰 + computed styles 수집)
│   └── Inspector (속성 편집 + 인라인 스타일 관리)
└── BuilderViewport (레이아웃 컨테이너)
```

### 데이터 흐름

```
UI 액션 → Zustand Store → Supabase API → Real-time Update
                ↓
         iframe 프리뷰 동기화 (양방향)
         ↓
    Inspector ↔ Builder 스타일 동기화
```

### 상태 관리 (Zustand)

**모듈화된 Store 아키텍처:**

- **Elements Store** (`elements.ts` - 213줄)
  - Factory pattern으로 리팩토링됨 (기존 1,851줄에서 88.5% 감소)
  - 모듈: `utils/elementHelpers`, `utils/elementSanitizer`, `utils/elementReorder`, `utils/elementRemoval`, `utils/elementCreation`, `utils/elementUpdate`, `history/historyActions`

- **Selection Store**: 선택된 요소 관리
- **History Store**: Undo/Redo 기능
- **Theme Store**: 디자인 토큰 및 테마

**Elements Store 모듈 구조:**
```
📊 stores/
├── elements.ts              → 메인 스토어 (213줄) ⭐ 88.5% 감소
├── utils/
│   ├── elementHelpers.ts    → 핵심 유틸리티 (20줄)
│   ├── elementSanitizer.ts  → 안전한 직렬화 (36줄)
│   ├── elementReorder.ts    → 순서 관리 (391줄)
│   ├── elementRemoval.ts    → 삭제 로직 (393줄)
│   ├── elementCreation.ts   → 생성 로직 (202줄)
│   └── elementUpdate.ts     → 업데이트 로직 (160줄)
└── history/
    └── historyActions.ts    → Undo/Redo (570줄)
```

자세한 내용은 [`CLAUDE.md`](./CLAUDE.md)를 참고하세요.

## 🔧 개발 스크립트

```bash
# 개발 서버 시작
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview

# 테스트 실행
npm run test

# E2E 테스트
npm run test:e2e

# Storybook 시작
npm run storybook

# 코드 린팅
npm run lint

# 타입 검사
npm run type-check
```

## 🧩 컴포넌트 개발

### 새로운 컴포넌트 추가

1. **React Aria 컴포넌트 생성**

```typescript
// src/builder/components/NewComponent.tsx
import { ComponentProps } from "react-aria-components";
import { tv } from "tailwind-variants";

const variants = tv({
  base: "base-classes",
  variants: {
    variant: {
      primary: "primary-classes",
      secondary: "secondary-classes",
    },
  },
});

export function NewComponent({ variant = "primary", ...props }) {
  return <div className={variants({ variant })} {...props} />;
}
```

1. **속성 에디터 생성**

```typescript
// src/builder/inspector/properties/editors/NewComponentEditor.tsx
export function NewComponentEditor({ element, onChange }) {
  return (
    <PropertyPanel title="New Component">
      <PropertyInput
        label="텍스트"
        value={element.props.text}
        onChange={(text) => onChange({ text })}
      />
    </PropertyPanel>
  );
}
```

1. **Storybook 스토리 작성**

```typescript
// src/stories/NewComponent.stories.tsx
export default {
  title: "Builder/Components/NewComponent",
  component: NewComponent,
};

export const Primary = {
  args: { variant: "primary", children: "예시 텍스트" },
};
```

## 📊 데이터베이스 스키마

### 주요 테이블

```sql
-- 사용자 프로젝트
projects (id, name, created_by, domain, created_at)

-- 페이지
pages (id, project_id, title, slug, order_num, created_at)

-- UI 요소 (트리 구조)
elements (id, page_id, parent_id, tag, props, order_num, created_at)

-- 디자인 토큰
design_tokens (id, project_id, theme_id, name, type, value, scope)

-- 테마
design_themes (id, project_id, name, status, version)
```

## 🎨 디자인 시스템

### 디자인 토큰

- **Raw 토큰**: 기본값 (colors, spacing, typography)
- **Semantic 토큰**: 의미 기반 (primary, secondary, success)
- **CSS 변수**: 자동 생성 및 동적 업데이트

### 테마

- **라이트/다크 모드** 지원
- **커스텀 테마** 생성 및 관리
- **실시간 테마 전환**

## 🔍 테스트 전략

### 단위 테스트 (Vitest)

```typescript
// 컴포넌트 테스트
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

test("버튼이 올바르게 렌더링된다", () => {
  render(<Button>클릭하세요</Button>);
  expect(screen.getByRole("button")).toHaveTextContent("클릭하세요");
});
```

### 통합 테스트

- Zustand 스토어와 컴포넌트 상호작용
- API 서비스 레이어 테스트

### E2E 테스트 (Playwright)

- 전체 빌더 워크플로우 테스트
- 실시간 협업 기능 테스트

## 🚀 배포

### Vercel 배포 (권장)

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel
```

### 환경별 설정

- **Development**: Hot reload, debug logs
- **Staging**: Production build, test data
- **Production**: Optimized build, analytics

## 🤝 기여하기

### 개발 워크플로우

1. 이슈 생성 및 논의
1. 기능 브랜치 생성 (`feature/feature-name`)
1. 개발 및 테스트
1. Pull Request 생성
1. 코드 리뷰
1. 메인 브랜치 병합

### 코딩 규칙

- **TypeScript**: 타입 안전성 유지
- **React 19**: 최신 기능 활용
- **접근성**: ARIA 규칙 준수
- **성능**: 불필요한 리렌더링 방지
- **테스트**: 새 기능은 테스트 필수

### 커밋 규칙

```bash
feat: 새로운 Button 컴포넌트 추가
fix: ElementStore 선택 상태 버그 수정
refactor: useElementCreator 훅 성능 최적화
docs: API 문서 업데이트
test: Button 컴포넌트 테스트 추가
```

## 📚 문서

- 📖 [개발 가이드](./docs/development-guide.md)
- 🎨 [디자인 시스템](./docs/design-system.md)
- 🔌 [API 문서](./docs/api-reference.md)
- 🏗️ [아키텍처 가이드](./docs/architecture.md)
- 🧪 [테스트 가이드](./docs/testing-guide.md)

## 🐛 버그 리포트

버그를 발견하셨나요? [Issues](https://github.com/your-username/xstudio/issues)에서 리포트해주세요.

### 버그 리포트 템플릿

- **환경**: 브라우저, OS 버전
- **재현 단계**: 단계별 설명
- **예상 동작**: 기대했던 결과
- **실제 동작**: 실제 발생한 문제
- **스크린샷**: 가능하면 첨부

## 🎯 로드맵

### v1.0 (현재)

- ✅ 기본 빌더 UI
- ✅ React Aria 컴포넌트
- ✅ 실시간 프리뷰
- ✅ 기본 디자인 시스템

### v1.1 (다음 버전)

- 🔄 AI 어시스턴트 기능 강화
- 🔄 협업 기능 개선
- 🔄 모바일 반응형 편집
- 🔄 컴포넌트 라이브러리 확장

### v1.2 (계획중)

- 📋 플러그인 시스템
- 📋 외부 API 연동
- 📋 고급 애니메이션 지원
- 📋 성능 대시보드

## 📄 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE) 하에 배포됩니다.

## 👨‍💻 개발팀

- **메인 개발자**: [rblood79](https://github.com/rblood79)

## 📞 지원

- 💬 [GitHub Discussions](https://github.com/your-username/xstudio/discussions)
- 📧 이메일: support@xstudio.dev
- 📚 [문서](https://docs.xstudio.dev)
