# Sitemap 레이아웃 방향 추가 계획

> **작성일**: 2026-02-13
> **상태**: 계획 수립 (코드 미생성)
> **관련 브랜치**: `claude/plan-sitemap-feature-J8Jiz`

---

## 1. Relume.io 분석

### 1.1 Relume Sitemap 핵심 특징

[Relume](https://www.relume.io/)의 Site Builder는 웹사이트 기획 단계에 특화된 AI 도구로, 사이트맵과 와이어프레임을 생성한다.

**시각적 구조:**
- **Top-Down 트리 구조**: Home 페이지가 최상단, 하위 페이지들이 아래로 분기
- **연결선(Connection Lines)**: 부모-자식 관계를 시각적 선으로 표현
- **계층 단계**:
  - 1단계: Home (루트)
  - 2단계: 주요 네비게이션 페이지 (About, Services, Blog 등)
  - 3단계: 서브 페이지 (각 서비스 상세, 블로그 포스트 등)
  - 유틸리티: Legal, Privacy, 404 등 (별도 섹션)
- **페이지 그룹(Folder)**: 네비게이션 폴더 역할의 빈 부모 페이지 생성 가능
- **색상 코딩**: 섹션별 색상 구분 (CMS, 정적 콘텐츠 등)

**인터랙션:**
- 드래그 앤 드롭으로 페이지 계층 변경
- 페이지 추가/삭제/이름 변경
- 섹션 단위 편집 (각 페이지 내 섹션 구성)
- 스페이스바 + 드래그로 캔버스 패닝

**AI 기능:**
- 프롬프트 기반 자동 사이트맵 생성 (60초 이내)
- 사이트맵 → 와이어프레임 1-click 변환
- 섹션별 AI 카피라이팅
- 기존 사이트 URL로 사이트맵 임포트 (최대 50페이지)

**출력/연동:**
- Figma 내보내기 (레이어/컴포넌트 구조화)
- Webflow 내보내기 (작동하는 인터랙션 포함)
- 1,000+ 컴포넌트 라이브러리

---

## 2. XStudio vs Relume 세부 비교

### 2.1 현재 XStudio 페이지 시스템

| 항목 | XStudio (현재) | Relume |
|------|---------------|--------|
| **페이지 배치 방향** | 가로/세로/지그재그 (3종) | Top-Down 트리 (계층 기반) |
| **parent_id 지원** | DB 스키마에 존재 (`Page.parent_id`) | 핵심 기능 (트리 구조의 근간) |
| **계층 시각화** | PagesSection 패널에서 트리 표시 | 캔버스 위에서 트리 시각화 + 연결선 |
| **연결선 렌더링** | Workflow Overlay (nav/event edges) | 부모-자식 간 직접 연결선 |
| **페이지 카드** | SkiaOverlay 페이지 프레임 (제목+테두리) | 페이지 카드 (제목+섹션 목록) |
| **드래그 앤 드롭** | 페이지 위치 자유 드래그 (usePageDrag) | 계층 변경 드래그 |
| **AI 연동** | Groq Agent (요소 CRUD) | 프롬프트 기반 사이트맵 자동 생성 |
| **그룹핑** | Layout Group (layout_id 기반) | Page Group (폴더 네비게이션) |
| **미니맵** | 워크플로우 미니맵 존재 | 없음 (별도 필요 없음) |

### 2.2 장단점 비교

#### XStudio 장점 (Relume 대비)
1. **실제 빌더**: 사이트맵이 곧 실제 디자인 캔버스 — Relume는 기획 도구, XStudio는 완성형 빌더
2. **자유 배치**: 페이지를 자유 좌표에 배치 가능 (Relume는 고정 트리 구조)
3. **워크플로우 오버레이**: 네비게이션/이벤트 기반 자동 연결선 (실제 코드 기반)
4. **다중 렌더 엔진**: CanvasKit/Skia + PixiJS 하이브리드 (고성능)
5. **미니맵**: 대규모 프로젝트 네비게이션
6. **레이아웃 시스템**: Layout/Slot 기반 페이지 합성

#### XStudio 단점 (Relume 대비)
1. **계층 시각화 부재**: `parent_id`가 있지만 캔버스에서 트리 구조로 표현하지 않음
2. **연결선 = 워크플로우만**: 부모-자식 관계의 구조적 연결선이 없음
3. **페이지 추가 시 방향 미반영**: 새 페이지 추가 시 항상 오른쪽 끝에 배치 (방향 설정 무시)
4. **사이트맵 뷰 없음**: 전체 사이트 구조를 한눈에 파악하기 어려움
5. **AI 사이트맵 생성 없음**: AI가 개별 요소는 조작하지만 사이트 구조 자동 생성은 미지원

#### Relume 장점
1. **직관적 사이트 구조 파악**: Top-Down 트리로 전체 구조 즉시 이해
2. **AI 사이트맵 자동 생성**: 프롬프트만으로 완전한 사이트 구조 생성
3. **사이트맵 ↔ 와이어프레임 양방향 동기화**: 한쪽 변경이 즉시 반영
4. **색상 코딩**: 시각적 섹션 분류
5. **기존 사이트 임포트**: URL로 기존 사이트 구조 자동 분석

#### Relume 단점
1. **기획 전용**: 실제 빌더가 아님 (Figma/Webflow로 내보내야 함)
2. **고정 레이아웃**: 트리 구조만 지원 (자유 배치 불가)
3. **마케팅 사이트 한정**: SaaS/포트폴리오 등 마케팅 사이트에 최적화
4. **외부 의존**: Figma/Webflow 없이는 완성 불가
5. **미니맵 없음**: 대규모 프로젝트에서 네비게이션 제한

---

## 3. Sitemap 레이아웃 방향 구현 계획

### 3.1 개요

기존 `PageLayoutDirection` 타입에 `"sitemap"` 옵션을 추가하여, 페이지들을 Relume 스타일의 Top-Down 트리 구조로 배치한다.

```
현재: "horizontal" | "vertical" | "zigzag"
목표: "horizontal" | "vertical" | "zigzag" | "sitemap"
```

### 3.2 Sitemap 레이아웃 시각적 설계

```
                    ┌──────────┐
                    │   Home   │  ← 루트 (parent_id === null, order_num === 0)
                    └────┬─────┘
                         │
           ┌─────────────┼─────────────┐
           │             │             │
      ┌────┴────┐  ┌────┴────┐  ┌────┴────┐
      │  About  │  │Services │  │  Blog   │  ← 1단계 자식들
      └─────────┘  └────┬────┘  └────┬────┘
                        │             │
                   ┌────┴────┐   ┌────┴────┐
                   │Service A│   │ Post 1  │  ← 2단계 자식들
                   └─────────┘   └─────────┘
```

**핵심 원칙:**
- Home 페이지가 최상단 중앙
- 같은 depth의 자식들은 수평으로 나열
- 부모-자식 간 수직 연결선
- 형제 간 균등 간격
- 자식이 없는 페이지는 리프 노드

### 3.3 수정 대상 파일 목록

#### Phase 1: 타입 & 스토어 (기초)

| # | 파일 | 변경 내용 |
|---|------|----------|
| 1 | `stores/canvasSettings.ts:16` | `PageLayoutDirection` 타입에 `"sitemap"` 추가 |
| 2 | `panels/settings/SettingsPanel.tsx:120-124` | `pageLayoutOptions`에 `{ value: "sitemap", label: "Sitemap" }` 추가 |

#### Phase 2: 레이아웃 알고리즘 (핵심)

| # | 파일 | 변경 내용 |
|---|------|----------|
| 3 | `stores/elements.ts:649-681` | `initializePagePositions`에 `"sitemap"` 분기 추가 — 트리 레이아웃 알고리즘 |
| 4 | `hooks/usePageManager.ts:224-232` | `addPage` 시 현재 direction이 `"sitemap"`이면 트리 위치 계산 |

#### Phase 3: 연결선 렌더링

| # | 파일 | 변경 내용 |
|---|------|----------|
| 5 | `workspace/canvas/skia/SkiaOverlay.tsx` | sitemap 모드일 때 parent-child 연결선 렌더링 추가 |
| 6 | `workspace/canvas/skia/workflowRenderer.ts` (재사용 or 별도) | 부모-자식 연결선 렌더링 함수 (기존 Bezier/Orthogonal 재사용 가능) |

#### Phase 4: 부가 기능

| # | 파일 | 변경 내용 |
|---|------|----------|
| 7 | `hooks/usePageManager.ts` (addPageWithParams) | sitemap 방향에서 새 페이지 추가 시 parent_id 기반 위치 계산 |
| 8 | `workspace/canvas/hooks/usePageDrag.ts` | sitemap 모드에서 드래그 시 계층 변경 로직 (선택적) |

### 3.4 트리 레이아웃 알고리즘 설계

`initializePagePositions`에 추가할 `"sitemap"` 분기의 알고리즘:

```
입력: pages[], pageWidth, pageHeight, gap
출력: positions Record<string, {x, y}>

1. 트리 구축
   - root = pages.filter(p => !p.parent_id).sort(by order_num)
   - 재귀적으로 children 매핑: childrenMap[parentId] = children.sort(by order_num)

2. 서브트리 너비 계산 (Bottom-Up)
   - subtreeWidth(node):
     - 리프 노드: pageWidth
     - 내부 노드: sum(children의 subtreeWidth) + (children.length - 1) * gap
     - max(pageWidth, 계산된 너비) 반환

3. 위치 할당 (Top-Down)
   - assignPositions(node, x, y):
     - positions[node.id] = { x: x + subtreeWidth/2 - pageWidth/2, y }
     - currentX = x
     - for each child:
       - assignPositions(child, currentX, y + pageHeight + verticalGap)
       - currentX += subtreeWidth(child) + gap

4. 루트 노드가 여러 개인 경우:
   - parent_id가 null인 페이지들을 순서대로 가로 배치
   - 각 루트의 서브트리를 독립적으로 계산
```

**상수 설계:**
- `SITEMAP_HORIZONTAL_GAP`: 형제 간 수평 간격 (기존 PAGE_STACK_GAP=80 참고, 축소된 뷰에서는 더 작을 수 있음)
- `SITEMAP_VERTICAL_GAP`: 부모-자식 간 수직 간격
- 페이지 프레임 크기는 기존 `canvasSize` 사용

### 3.5 연결선 렌더링 설계

기존 `workflowRenderer.ts`의 인프라를 재사용:

```
1. 엣지 추출:
   - pages에서 parent_id 기반으로 SitemapEdge[] 생성
   - type: 'sitemap-hierarchy'

2. 엔드포인트 계산:
   - 부모: 하단 중앙 (x + width/2, y + height)
   - 자식: 상단 중앙 (x + width/2, y)

3. 렌더링:
   - 직선 or Orthogonal (L-shaped) 연결선
   - 스타일: 회색 계열 (워크플로우와 구분), 1-2px
   - 부모 → 수직 하강 → 수평 분기 → 수직 하강 → 자식 (orthogonal tree style)

4. 통합:
   - SkiaOverlay에서 sitemap 방향일 때만 렌더링
   - 기존 워크플로우 오버레이와 독립적 (동시 표시 가능)
```

### 3.6 고려사항

#### 성능
- 트리 레이아웃 계산: O(n) (페이지 수)
- 연결선 렌더링: O(n-1) (엣지 수 = 페이지 수 - 1)
- 기존 60fps 목표에 영향 없음 (페이지 수가 수십 개 수준)

#### parent_id 활용
- 현재 `Page.parent_id` 필드가 이미 존재하지만, 실질적으로 활용되는 곳이 제한적
- sitemap 모드 추가로 `parent_id`의 가치가 크게 증가
- PagesSection의 트리 구조(`usePageTreeData.ts`)와 일관성 유지

#### 새 페이지 추가 시 동작
- sitemap 모드에서 페이지 추가 시: 현재 선택된 페이지의 자식으로 추가 (또는 루트에 추가)
- `addPage`/`addPageWithParams` 함수에서 direction 감지 후 적절한 `parent_id` 설정

#### 기존 방향과의 전환
- horizontal/vertical/zigzag → sitemap 전환 시: `parent_id` 기반으로 트리 재구축
- sitemap → 다른 방향 전환 시: `parent_id` 무시하고 order_num 기반 배치 (기존 동작)
- 방향 전환해도 `parent_id` 데이터는 유지 (파괴적 변경 없음)

#### 버그 수정 (발견)
- `usePageManager.ts:224-232`에서 새 페이지 추가 시 항상 `maxX, 0`으로 배치
- 현재 `pageLayoutDirection`을 참조하지 않음 → 모든 방향에서 수정 필요

---

## 4. Relume에서 적용하면 좋을 추가 기능 (우선순위)

### P1 (필수 — Sitemap 방향 구현 시 함께)
| 기능 | 설명 | 비고 |
|------|------|------|
| **트리 레이아웃** | Top-Down 계층 배치 | 핵심 알고리즘 |
| **부모-자식 연결선** | SkiaOverlay에서 구조적 연결선 | workflowRenderer 재사용 |
| **parent_id 기반 배치** | 기존 parent_id 필드 본격 활용 | DB 변경 없음 |

### P2 (권장 — UX 향상)
| 기능 | 설명 | 비고 |
|------|------|------|
| **드래그로 계층 변경** | 페이지 드래그 시 부모 변경 | usePageDrag 확장 |
| **자동 재배치** | 계층 변경 후 트리 자동 정렬 | initializePagePositions 재호출 |
| **색상 코딩** | 페이지/그룹별 색상 태그 | Relume의 시각적 구분 |

### P3 (향후 — 차별화)
| 기능 | 설명 | 비고 |
|------|------|------|
| **AI 사이트맵 생성** | 프롬프트 기반 페이지 구조 자동 생성 | 기존 Groq Agent 확장 |
| **URL 사이트맵 임포트** | 기존 사이트 URL로 구조 분석 | 크롤링 + AI 분석 |
| **사이트맵 ↔ 와이어프레임 동기화** | 사이트맵 변경 시 디자인 자동 업데이트 | 양방향 바인딩 |
| **페이지 그룹(Folder)** | 빈 부모 페이지 → 폴더 역할 | parent_id 활용 |
| **Global Section** | 여러 페이지에 공유되는 전역 섹션 | Layout 시스템 확장 |

---

## 5. 구현 순서 요약

```
Phase 1: 타입 & UI (30분)
  ├─ PageLayoutDirection에 "sitemap" 추가
  └─ SettingsPanel 옵션 추가

Phase 2: 트리 레이아웃 알고리즘
  ├─ initializePagePositions에 sitemap 분기
  ├─ 서브트리 너비 계산 함수
  └─ 재귀적 위치 할당 함수

Phase 3: 연결선 렌더링
  ├─ parent_id 기반 SitemapEdge 추출
  ├─ Orthogonal 연결선 렌더링 (SkiaOverlay)
  └─ 워크플로우 오버레이와 독립 작동

Phase 4: 페이지 추가/삭제 연동
  ├─ addPage 시 sitemap 방향 반영
  ├─ 페이지 삭제 시 자식 처리 (parent 승계 or 함께 삭제)
  └─ 방향 전환 시 재배치

Phase 5: 드래그 앤 드롭 (선택적)
  └─ 드래그로 페이지 계층 변경
```

---

## 6. 참고 자료

### Relume.io 관련
- [Relume AI Site Builder](https://www.relume.io/)
- [Building a sitemap with AI](https://www.relume.io/resources/docs/building-a-sitemap-with-ai)
- [Sitemap Creation Video](https://www.relume.io/resources/series-videos/sitemap-creation)
- [AI-powered Sitemap Builder](https://www.relume.io/whats-new/june-component-day)
- [Relume AI Tutorial](https://webplacide.com/blog/relume-ai-tutorial-generate-sitemaps-and-wireframes-in-seconds/)

### XStudio 코드베이스
- **타입 정의**: `stores/canvasSettings.ts:16` — `PageLayoutDirection`
- **레이아웃 알고리즘**: `stores/elements.ts:649-681` — `initializePagePositions`
- **설정 UI**: `panels/settings/SettingsPanel.tsx:120-124` — `pageLayoutOptions`
- **페이지 관리**: `hooks/usePageManager.ts` — addPage, initializePagePositions 호출
- **워크플로우 렌더러**: `workspace/canvas/skia/workflowRenderer.ts` — 연결선 렌더링 재사용
- **페이지 트리 데이터**: `panels/nodes/tree/PageTree/usePageTreeData.ts` — parent_id 기반 트리 구축
- **Page 타입**: `types/builder/unified.types.ts:116-127` — parent_id 필드 존재
