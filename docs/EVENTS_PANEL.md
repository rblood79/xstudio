# Events Panel Smart Recommendations

## 배경
현재 Events Panel은 헤더의 + 버튼만 제공한다. 사용자들은 기본 이벤트를 보기 위해 팝오버를 열어야 하며, 이는 접근성과 발견성을 낮춘다.

## 목표
- 선택 즉시 해당 컴포넌트의 기본/추천 이벤트를 panel-contents에 노출한다.
- 이벤트 추가 동작은 기존과 동일하게 유지한다(핸들러 생성 + 선택).
- 이벤트 레지스트리/지원 이벤트 정의는 변경하지 않는다.

## 비목표
- 신규 이벤트/액션 타입 추가.
- EventTypePicker 팝오버 UI 전면 재설계.
- 핸들러 디테일 편집 플로우 변경.

## 현재 이벤트 등록/수정 플로우 (as-is)
- 요소 선택 -> 헤더에 + 표시(지원 이벤트 1개면 단일 버튼).
- + 클릭 -> EventTypePicker 팝오버(검색/카테고리/추천).
- 이벤트 선택 -> 핸들러 생성 + 자동 선택.
- 블록 편집(When -> If -> Then/Else)로 수정.
- 액션 추가는 ActionPicker 오버레이에서 선택 후 편집.

## 단점
- 발견성 낮음: 기본 이벤트가 + 뒤에 숨겨짐.
- 단계가 많음: 팝오버를 열어야 시작 가능.
- 컨텍스트 전환: 팝오버/오버레이로 리스트 흐름이 끊김.
- 가이드 부족: 각 이벤트의 일반 사용 시나리오가 즉시 보이지 않음.
- 접근성 저하: 키보드 탐색 시작점이 헤더에 집중됨.
- 개인화 부재: 추천이 프로젝트/사용 패턴을 반영하지 못함.

## 업계 트렌드 리서치 (Webflow / Framer)

### Framer
- AI 생성: 텍스트 기반으로 레이아웃/컴포넌트/번역을 생성하는 AI 플로우 제공. [1]
- CMS 강화: 인라인 편집, SEO, 협업을 강조한 디자인 중심 CMS. [2]
- 폼/데이터 수집: 코드 없이 폼을 생성하고 데이터를 수집. [3]
- 내장 분석: 개인정보 친화적(쿠키 없는) 기본 분석 제공. [4]
- 로컬라이제이션: 언어/지역별 커스터마이징 지원. [5]

### Webflow
- AI 제공: Webflow AI 제품 페이지 운영. [6]
- CMS 중심 확장: 시각적 CMS 구축을 강조. [7]
- 로컬라이제이션: 번역/현지화 도구 페이지 제공. [8]
- 인터랙션/애니메이션: 시각적 애니메이션 제작을 강조. [9]

### 트렌드 요약 (2025)
- AI 기반 생성/보조: 빠른 초기 구성과 의도 기반 생성이 기본값.
- 템플릿/레시피화: “이벤트 + 액션”의 재사용 가능한 패턴 제공.
- 내장 분석/프라이버시: 간단한 인사이트 제공과 개인정보 친화 흐름.
- 다국어/로컬라이제이션: 글로벌 배포를 위한 기본 기능화.
- 인터랙션 중심 UI: 이벤트/상태 변화의 시각적 구성 강화.

## 단계별 개선안

### P0: 추천 이벤트 노출 + 빈 상태 개선
핵심 목표: 사용자가 + 버튼 없이도 추천 이벤트를 발견하고 추가할 수 있게 한다.

| # | 항목 | 설명 |
|---|------|------|
| 1 | 추천 이벤트 chips | panel-contents 상단에 컴포넌트별 추천 이벤트를 quick add chips로 노출 |
| 2 | 빈 상태 가이드 개선 | "이벤트 핸들러가 없습니다" 메시지에 추천 이벤트 버튼 포함 |
| 3 | 인라인 설명 | 각 추천 chip에 툴팁으로 이벤트 설명/사용 예시 제공 |
| 4 | 등록된 이벤트 필터링 | 이미 등록된 이벤트는 추천 목록에서 제외 |

### P1: 추천 액션 + 레시피 템플릿
핵심 목표: 이벤트 추가 후 액션 설정까지의 흐름을 단축한다.

| # | 항목 | 설명 |
|---|------|------|
| 1 | 추천 액션 노출 | 이벤트 선택 후 THEN 블록에 추천 액션 2~3개를 chips로 표시 |
| 2 | 레시피 템플릿 | 자주 사용되는 이벤트+액션 조합(예: onSubmit → validateForm → showToast) 제공 |
| 3 | 액션 호환성 배지 | 선택된 이벤트와 호환되는 액션 표시 |
| 4 | 누락 설정 경고 | 필수 config가 없는 액션에 경고 아이콘 표시 |

### P2: AI 생성 + 고급 기능
핵심 목표: 고급 사용자를 위한 생산성 도구를 제공한다.

| # | 항목 | 설명 |
|---|------|------|
| 1 | 의도 기반 생성 | 자연어 입력 → 이벤트+액션 초안 자동 생성 (예: "버튼 클릭 시 모달 열기") |
| 2 | 키보드 커맨드 팔레트 | Ctrl/Cmd+K로 이벤트/액션 빠른 탐색 |
| 3 | 경량 시뮬레이션 | mock payload로 액션 실행 테스트 |
| 4 | 개인화 추천 | 프로젝트 내 사용 빈도 기반 추천 순서 재정렬 |
| 5 | 미리보기 힌트 | 액션 결과를 캔버스에서 미리보기 |

## UX 상태별 화면 구성

### 1. 요소 미선택
```
┌─────────────────────────────────┐
│ ⬜ Events                       │
├─────────────────────────────────┤
│                                 │
│     요소를 선택하세요             │
│                                 │
└─────────────────────────────────┘
```
- 기존 EmptyState 유지
- 추천 이벤트 없음

### 2. 요소 선택 + 핸들러 없음 (P0 핵심)
```
┌─────────────────────────────────┐
│ ⬜ Events                    [+]│
├─────────────────────────────────┤
│ 추천: [onClick] [onPress]       │  ← 추천 chips
├─────────────────────────────────┤
│                                 │
│  ⚡ 이벤트 핸들러가 없습니다      │
│  위의 추천 이벤트를 클릭하거나    │
│  + 버튼으로 추가하세요           │
│                                 │
└─────────────────────────────────┘
```
- 추천 이벤트 chips 상단 노출
- EmptyState에 가이드 메시지 추가

### 3. 요소 선택 + 핸들러 있음 (리스트)
```
┌─────────────────────────────────┐
│ ⬜ Events                    [+]│
├─────────────────────────────────┤
│ 추천: [onPress]                 │  ← 미등록 이벤트만
├─────────────────────────────────┤
│ ▸ onClick           2 actions  │
│ ▸ onMouseEnter      1 action   │
└─────────────────────────────────┘
```
- 이미 등록된 이벤트는 추천에서 제외
- 모든 추천 이벤트 등록 시 섹션 숨김

### 4. 핸들러 디테일 화면
```
┌─────────────────────────────────┐
│ ← onClick                   [🗑]│
├─────────────────────────────────┤
│ ┌─ WHEN ──────────────────────┐ │
│ │ onClick                     │ │
│ └─────────────────────────────┘ │
│         │                       │
│ ┌─ THEN ──────────────────────┐ │
│ │ [+] showToast               │ │
│ │ [+] navigate                │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```
- 추천 이벤트 섹션 숨김 (집중 편집)
- P1: THEN 블록에 추천 액션 chips 추가

## 인터랙션 명세

### 추천 이벤트 chip
| 동작 | 결과 |
|------|------|
| 클릭 | 핸들러 생성 + 자동 선택 (기존 `handleAddEvent` 경로) |
| 호버 | 툴팁 표시 (이벤트 설명 + 사용 예시) |
| Tab | 다음 chip으로 포커스 이동 |
| Enter/Space | 핸들러 생성 |

### 섹션 표시 조건
| 조건 | 표시 여부 |
|------|-----------|
| 추천 이벤트 0개 | 섹션 숨김 |
| 추천 이벤트 > 0개, 모두 등록됨 | 섹션 숨김 |
| 추천 이벤트 > 0개, 일부 미등록 | 미등록 이벤트만 표시 |
| 핸들러 디테일 화면 | 섹션 숨김 |

## 접근성
- 추천 버튼: `aria-label="Add {eventType} event handler"`
- 키보드 탐색: Tab으로 chip 순회, Enter/Space로 활성화
- 포커스 표시: 기존 버튼 포커스 링 스타일 적용
- 스크린 리더: 이벤트 설명을 `aria-describedby`로 연결

## 구현 상세

### 파일 구조
```
src/builder/panels/events/
├── EventsPanel.tsx                    # 메인 패널 (P0: 추천 이벤트 섹션 추가)
├── components/
│   └── RecommendedEventsSection.tsx   # [신규] 추천 이벤트 chips 컴포넌트
├── hooks/
│   └── useRecommendedEvents.ts        # [기존] 컴포넌트별 추천 이벤트 훅
├── data/
│   ├── eventCategories.ts             # [기존] COMPONENT_RECOMMENDED_EVENTS, EVENT_METADATA
│   ├── actionRecommendations.ts       # [신규-P1] 이벤트별 추천 액션 매핑
│   └── eventTemplates.ts              # [기존] 레시피 템플릿 데이터 (P1 확장)
└── pickers/
    └── EventTypePicker.tsx            # [기존] 이벤트 선택 팝오버
```

### 기존 데이터 소스 활용
| 데이터 | 위치 | 용도 |
|--------|------|------|
| `COMPONENT_RECOMMENDED_EVENTS` | `data/eventCategories.ts:257` | 컴포넌트별 추천 이벤트 목록 |
| `EVENT_METADATA` | `data/eventCategories.ts:58` | 이벤트 라벨, 설명, 사용률 |
| `getRecommendedEvents()` | `data/eventCategories.ts:313` | 추천 이벤트 조회 함수 |
| `useRecommendedEvents()` | `hooks/useRecommendedEvents.ts:38` | 추천 이벤트 훅 (메타데이터 포함) |
| `isImplementedEventType()` | `@/types/events/events.types` | 구현된 이벤트 필터링 |

### 신규 컴포넌트 명세 (P0)

**RecommendedEventsSection**
```tsx
interface RecommendedEventsSectionProps {
  componentType: string;              // 선택된 컴포넌트 타입
  registeredEvents: EventType[];      // 이미 등록된 이벤트 (필터링용)
  onAddEvent: (type: EventType) => void;
}
```

**배치 위치**: `EventsPanel.tsx` 내 `panel-contents` 상단
- 핸들러 없음: EmptyState와 함께 표시
- 핸들러 있음 (리스트): PropertySection 위에 표시
- 핸들러 상세: 숨김

### 스타일 가이드
- 기존 `EventTypePicker`의 추천 chip 스타일 재사용
- 클래스명: `.recommended-events-section`, `.recommended-event-chip`
- 최대 표시 개수: 4개 (overflow 시 "+N more" 표시)

## 검증 체크리스트

### P0 검증
- [ ] Button 선택 시 `onPress`, `onClick` 추천 chip 노출
- [ ] TextField 선택 시 `onChange`, `onInput`, `onFocus`, `onBlur` 추천 chip 노출
- [ ] 추천 chip 클릭 → 핸들러 생성 및 자동 선택
- [ ] 이미 등록된 이벤트는 추천 목록에서 제외
- [ ] 모든 추천 이벤트 등록 시 추천 섹션 숨김
- [ ] 핸들러 디테일 화면에서 추천 섹션 숨김
- [ ] 추천 chip에 마우스 호버 시 툴팁 표시 (이벤트 설명)
- [ ] 키보드 탐색: Tab으로 chip 간 이동, Enter/Space로 추가

### P1 검증
- [ ] 이벤트 추가 후 THEN 블록에 추천 액션 chips 표시
- [ ] 추천 액션 클릭 → 액션 추가
- [ ] 레시피 템플릿 선택 → 이벤트+액션 일괄 생성
- [ ] 액션 호환성 배지 정확성 (이벤트-액션 매핑)
- [ ] 필수 config 누락 시 경고 아이콘 표시

### P2 검증
- [ ] 자연어 입력 → 이벤트+액션 초안 생성
- [ ] Ctrl/Cmd+K → 커맨드 팔레트 열림
- [ ] 시뮬레이션 실행 → 콘솔에 mock 결과 출력
- [ ] 사용 빈도 기반 추천 순서 변경 확인

## 결정 사항

### 핸들러 디테일 화면에서 추천 노출 여부
**결정: 숨김**
- 이유: 디테일 화면은 집중 편집 모드이므로 추천 UI가 혼란을 줄 수 있음
- 대안: THEN 블록 내 "추천 액션" chips는 P1에서 별도 구현

### 추천 액션/레시피 노출 위치 (P1)
**결정: THEN 블록 상단 + 별도 레시피 섹션**
- THEN 블록: 이벤트별 추천 액션 2~3개를 chips로 표시
- 레시피 섹션: 핸들러 리스트 화면에 "Quick Start" 섹션으로 템플릿 제공

### AI 의도 입력 UX 위치 (P2)
**결정: panel-contents 상단 (검색바 형태)**
- 이유: 헤더는 공간이 제한적이고, 검색과 유사한 UX가 자연스러움
- 형태: 플레이스홀더 "무엇을 하고 싶으세요?" + Enter로 생성

## 출처
1. https://www.framer.com/ai/ (Framer AI 설명)
2. https://www.framer.com/cms/ (Framer CMS 설명)
3. https://www.framer.com/forms/ (Framer Forms 설명)
4. https://www.framer.com/analytics/ (Framer Analytics 설명)
5. https://www.framer.com/localization/ (Framer Localization 설명)
6. https://webflow.com/ai (Webflow AI 페이지)
7. https://webflow.com/cms (Webflow CMS 페이지)
8. https://webflow.com/feature/localization (Webflow Localization 페이지)
9. https://webflow.com/interactions-animations (Webflow Interactions 페이지)
