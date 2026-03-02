# Electron + PGlite Quick Start Guide

> **빠른 참조용 요약 문서** - 상세 내용은 [ELECTRON_PGLITE_IMPLEMENTATION_PLAN.md](./ELECTRON_PGLITE_IMPLEMENTATION_PLAN.md) 참조

---

## 🎯 목표

XStudio를 **Electron + PGlite**로 확장하여 다음을 가능하게 합니다:

1. **오프라인 작업**: 인터넷 없이 로컬 데이터베이스(PGlite) 사용
2. **프로젝트 파일**: `.xstudio` 파일로 프로젝트 저장/공유
3. **정적 사이트 생성**: Node.js 설치 없이 HTML/CSS/JS 생성
4. **듀얼 모드**: Electron(오프라인) + 웹 브라우저(온라인) 지원

---

## 📋 7단계 구현 계획

| Phase | 기간 | 핵심 작업 | 결과물 |
|-------|------|-----------|--------|
| **1. Database Abstraction Layer** | 2-3일 | DbAdapter 인터페이스, SupabaseAdapter | 통합 DB 인터페이스 |
| **2. PGlite Integration** | 3-4일 | PGliteAdapter, SQL 마이그레이션 | 로컬 PostgreSQL WASM |
| **3. Electron Setup** | 2-3일 | main.ts, preload.ts, IPC 핸들러 | Electron 앱 실행 |
| **4. ProjectFile Class** | 2-3일 | .xstudio 파일 생성/열기/저장 | 프로젝트 파일 포맷 |
| **5. Publishing System** | 3-4일 | HTML/CSS/JS 생성기 | 정적 사이트 퍼블리싱 |
| **6. UI Integration** | 2-3일 | File 메뉴, Publish 다이얼로그 | 완전한 UI |
| **7. Testing & Documentation** | 2-3일 | 테스트, 문서화 | 프로덕션 준비 완료 |

**총 소요 기간**: 16-23일 (3-4.5주)

---

## 🏗️ 핵심 아키텍처

### 1. Database Abstraction Layer (DAL)

```typescript
// src/services/database/DbAdapter.ts
export interface DbAdapter {
  // 프로젝트
  getProject(id: string): Promise<Project>;
  createProject(project: Partial<Project>): Promise<Project>;

  // 페이지
  getPages(projectId: string): Promise<Page[]>;
  createPage(page: Partial<Page>): Promise<Page>;

  // 엘리먼트
  getElements(pageId: string): Promise<Element[]>;
  createElement(element: Partial<Element>): Promise<Element>;

  // ... 기타 메서드
}
```

### 2. 어댑터 구현

```typescript
// Supabase (기존 웹 모드)
export class SupabaseAdapter implements DbAdapter {
  // Supabase 클라이언트 사용
}

// PGlite (새로운 Electron 모드)
export class PGliteAdapter implements DbAdapter {
  // PGlite WASM 사용
}
```

### 3. 팩토리 패턴

```typescript
// src/services/database/index.ts
export function getDatabase(): DbAdapter {
  if (window.electron) {
    return new PGliteAdapter(projectPath);
  } else {
    return new SupabaseAdapter(url, key);
  }
}
```

---

## 📦 새로운 의존성

```json
{
  "dependencies": {
    "@electric-sql/pglite": "^0.1.0"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1",
    "vite-plugin-electron": "^0.15.0"
  }
}
```

---

## 🗂️ 생성할 주요 파일

### Phase 1-2: Database Layer
```
src/services/database/
├── DbAdapter.ts              # 인터페이스
├── SupabaseAdapter.ts        # Supabase 구현
├── PGliteAdapter.ts          # PGlite 구현
├── migrations/
│   ├── 001_initial_schema.sql
│   └── index.ts
└── index.ts                  # 팩토리
```

### Phase 3: Electron
```
electron/
├── main.ts                   # 메인 프로세스
└── preload.ts                # 프리로드 스크립트

src/types/
└── electron.d.ts             # TypeScript 선언
```

### Phase 4: ProjectFile
```
src/services/projectFile/
├── ProjectFile.ts            # .xstudio 파일 관리
├── SyncService.ts            # 클라우드 동기화 (선택)
└── types.ts
```

### Phase 5: Publishing
```
src/services/publish/
├── PublishService.ts         # 메인 오케스트레이터
├── HTMLGenerator.ts          # Element → HTML
├── CSSGenerator.ts           # Tokens → CSS
├── JSGenerator.ts            # 선택적 JS
└── types.ts
```

---

## 🚀 시작하기

### 1단계: 기존 코드 확인

현재 Supabase 기반 서비스들:
- `src/services/api/ElementsApiService.ts`
- `src/services/api/PagesApiService.ts`
- `src/services/api/ProjectsApiService.ts`

### 2단계: DbAdapter 인터페이스 정의

```typescript
// src/services/database/DbAdapter.ts
export interface DbAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // 기존 서비스의 모든 메서드를 인터페이스로 통합
  getElements(pageId: string): Promise<Element[]>;
  createElement(element: Partial<Element>): Promise<Element>;
  // ...
}
```

### 3단계: SupabaseAdapter 구현

```typescript
// src/services/database/SupabaseAdapter.ts
export class SupabaseAdapter implements DbAdapter {
  private supabase: SupabaseClient;

  async getElements(pageId: string): Promise<Element[]> {
    const { data, error } = await this.supabase
      .from('elements')
      .select('*')
      .eq('page_id', pageId);

    if (error) throw error;
    return data;
  }
}
```

### 4단계: 기존 서비스 리팩토링

```typescript
// Before (기존)
export class ElementsApiService extends BaseApiService {
  async fetchElements(pageId: string): Promise<Element[]> {
    return await this.supabase.from('elements')...
  }
}

// After (리팩토링)
import { getDatabase } from '../database';

export class ElementsApiService {
  async fetchElements(pageId: string): Promise<Element[]> {
    const db = getDatabase();
    return await db.getElements(pageId);
  }
}
```

---

## 🔑 핵심 개념

### .xstudio 파일 포맷

```
my-project.xstudio
└── (PGlite 데이터베이스 파일 - 바이너리 형식)
    ├── projects 테이블
    ├── pages 테이블
    ├── elements 테이블
    ├── design_tokens 테이블
    └── design_themes 테이블
```

### 듀얼 모드 동작

```
┌─────────────────────────────────────────┐
│         XStudio 애플리케이션            │
├─────────────────────────────────────────┤
│          DbAdapter (인터페이스)         │
├──────────────┬──────────────────────────┤
│ Electron 모드│      웹 브라우저 모드     │
│              │                          │
│ PGliteAdapter│   SupabaseAdapter        │
│      ↓       │          ↓               │
│  PGlite      │     Supabase Cloud       │
│  (로컬 DB)   │     (클라우드 DB)        │
│      ↓       │                          │
│ .xstudio 파일│                          │
└──────────────┴──────────────────────────┘
```

---

## ✅ 각 Phase별 완료 조건

### Phase 1 완료 체크리스트
- [ ] `DbAdapter` 인터페이스 정의 완료
- [ ] `SupabaseAdapter` 구현 완료
- [ ] 기존 API 서비스 리팩토링 완료
- [ ] 유닛 테스트 작성 완료
- [ ] 기존 기능 동작 확인

### Phase 2 완료 체크리스트
- [ ] PGlite 의존성 설치
- [ ] `PGliteAdapter` 구현 완료
- [ ] SQL 마이그레이션 작성 완료
- [ ] CRUD 동작 테스트 완료
- [ ] 트랜잭션 지원 테스트 완료

### Phase 3 완료 체크리스트
- [ ] Electron 의존성 설치
- [ ] `main.ts`, `preload.ts` 작성 완료
- [ ] Vite 설정 완료
- [ ] Electron 앱 실행 성공
- [ ] 파일 다이얼로그 동작 확인

### Phase 4 완료 체크리스트
- [ ] `ProjectFile` 클래스 구현 완료
- [ ] .xstudio 파일 생성/열기/저장 동작
- [ ] Supabase 내보내기/가져오기 동작
- [ ] 통합 테스트 완료

### Phase 5 완료 체크리스트
- [ ] `PublishService` 구현 완료
- [ ] HTML 생성 동작 확인
- [ ] CSS 생성 동작 확인
- [ ] 선택적 JS 생성 동작 확인
- [ ] 퍼블리싱된 사이트 렌더링 확인

### Phase 6 완료 체크리스트
- [ ] File 메뉴 추가 (New/Open/Save/SaveAs/Publish)
- [ ] Publish 다이얼로그 구현
- [ ] BuilderHeader 업데이트
- [ ] 전체 워크플로우 테스트 완료

### Phase 7 완료 체크리스트
- [ ] 유닛 테스트 커버리지 80% 이상
- [ ] 통합 테스트 완료
- [ ] E2E 테스트 완료
- [ ] 성능 벤치마크 완료
- [ ] 문서화 완료

---

## 🎓 학습 리소스

### PGlite
- [PGlite GitHub](https://github.com/electric-sql/pglite)
- [PGlite Documentation](https://pglite.dev/)

### Electron
- [Electron Quick Start](https://www.electronjs.org/docs/latest/tutorial/quick-start)
- [Electron IPC Tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc)

### Database Abstraction
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Adapter Pattern](https://refactoring.guru/design-patterns/adapter)

---

## 🔍 다음 단계

1. ✅ 이 문서 읽기
2. ✅ 상세 계획 문서 읽기: [ELECTRON_PGLITE_IMPLEMENTATION_PLAN.md](./ELECTRON_PGLITE_IMPLEMENTATION_PLAN.md)
3. ✅ Phase 1 시작: Database Abstraction Layer 구현
4. ⏭️ 각 Phase별로 순차 진행

---

**작성일**: 2025-11-17
**버전**: 1.0
**소유자**: Development Team
