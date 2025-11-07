# XStudio 컴포넌트 라이브러리 통합 개선 계획

**작성일**: 2025-11-06
**최종 업데이트**: 2025-11-07
**상태**: 검증 완료 (Validation Report 참조), Phase 0.4 완료
**예상 소요 시간**: 39-52시간 (약 6-8주)

---

## 📋 Executive Summary

XStudio 컴포넌트 라이브러리의 3가지 핵심 문제를 해결하기 위한 통합 마이그레이션 계획입니다:

1. **테마 시스템 문제**: 200+ 팔레트 변수 직접 참조 (--color-gray-*, --color-primary-* 등)
2. **구조적 문제**: Card, Panel 컴포넌트의 안티패턴 (잘못된 명칭, 수동 className 조합)
3. **완성도 문제**: 45개 컴포넌트 중 단 1개(Button)만 variant/size 구현 (95.6% 누락)

---

## 🎯 목표

### Before (현재 상태)
- ❌ 팔레트 직접 참조: 200+개
- ❌ 안티패턴 컴포넌트: 2개 (Card, Panel)
- ❌ variant/size 구현: 2.2% (1/45)
- ❌ tv() 사용: 2.2% (1/45)
- ❌ 표준 size 값: 불일치 (small/medium/large vs sm/md/lg)

### After (완료 후)
- ✅ 팔레트 직접 참조: 0개
- ✅ 안티패턴 컴포넌트: 0개
- ✅ variant/size 구현: 100% (45/45)
- ✅ tv() 사용: 100% (필요한 컴포넌트 모두)
- ✅ 표준 size 값: 통일 (xs/sm/md/lg/xl)
- ✅ 시멘틱 토큰: 100% 기반
- ✅ ThemeStudio 완전 통합

---

## 🗺️ Phase 개요

| Phase | 작업 내용 | 예상 시간 | 우선순위 | 상태 |
|-------|----------|-----------|----------|------|
| **Phase 0** | 기반 인프라 구축 + Inspector ✅ | 3-4시간 | Critical | 부분 완료 |
| **Phase 1** | 안티패턴 제거 (Card, Panel) | 3-4시간 | Critical | 대기 중 |
| **Phase 2** | Button.css 시멘틱 토큰 전환 | 1-1.5시간 | High | 대기 중 |
| **Phase 3** | Tier 1 Form 컴포넌트 (6개) | 10-14시간 | High | 대기 중 |
| **Phase 4** | Tier 2 Navigation (4개) | 6-8시간 | Medium | 대기 중 |
| **Phase 5** | 고우선순위 CSS 마이그레이션 | 6-8시간 | High | 대기 중 |
| **Phase 6** | Tier 3 & 나머지 컴포넌트 | 8-10시간 | Medium | 대기 중 |
| **Phase 7** | 검증, 테스트, 문서화 | 3-4시간 | Critical | 대기 중 |
| **합계** | | **39-52시간** | | |

**주요 업데이트 (2025-11-07)**:
- ✅ Phase 0.4: Inspector Property Component System 완료 (9개 컴포넌트)
- ✅ 시멘틱 토큰 50+ 개 이미 존재 (Phase 0.1 부분 완료)

---

## 📊 Phase 상세

### Phase 0: 기반 인프라 구축 (3-4시간)

#### 0.1 시멘틱 토큰 확장 (1.5-2시간)
**파일**: `src/builder/components/theme.css`

**추가할 토큰 (~25개)**:
- 버튼 변형 토큰 (10개): border, hover, surface, outline, ghost
- 필드 변형 토큰 (5개): border, hover, focus, filled
- 인터랙티브 상태 (6개): hover, active, focus
- 유틸리티 (9개): icon, divider, text-on-primary/secondary

**중요**: 기존 fallback 패턴 따르기
```css
--button-primary-border: var(--color-button-primary-border, var(--color-primary-600));
```

#### 0.2 공통 타입 정의 생성 (30-40분)
**파일**: `src/types/componentVariants.ts` (신규)

**정의할 타입**:
- `ComponentSize`: "xs" | "sm" | "md" | "lg" | "xl"
- `ComponentSizeSubset`: "sm" | "md" | "lg"
- `DensitySize`: "compact" | "comfortable" | "relaxed" | "spacious"
- `ButtonVariant`, `FieldVariant`, `CardVariant`, `PanelVariant` 등

#### 0.3 Gold Standard 문서화 (30min)
- Button 패턴 분석
- 리팩토링 템플릿 작성
- CLAUDE.md 임시 노트 추가

#### 0.4 Inspector Property Component Pattern ✅ (완료됨)
**상태**: 2025-11-07 완료 (commit 2114448)

**완료된 작업**:
- ✅ Property 컴포넌트 라이브러리 구축 (9개)
  - PropertyFieldset, PropertyInput, PropertyCheckbox
  - PropertySelect, PropertySwitch, PropertySlider
  - PropertyUnitInput, PropertyColor, PropertyCustomId
- ✅ Events Tab 리팩토링 (676 lines)
  - TextField → PropertyInput
  - Inline `<select>` → PropertySelect
  - Inline `<input type="checkbox">` → PropertyCheckbox
- ✅ 일관된 패턴 적용
  - 모든 Inspector 탭에서 동일 컴포넌트 사용
  - PropertyFieldset wrapper로 통일된 레이아웃
  - Debounced saves (blur/enter to commit)

**참고**: Inspector는 빌더 UI의 별도 시스템으로, 컴포넌트 라이브러리 마이그레이션과는 독립적입니다.

**✅ 완료 조건**:
- [x] 25개 시멘틱 토큰 추가 (라이트 + 다크) - 50+ 토큰 이미 존재
- [ ] componentVariants.ts 생성
- [ ] 템플릿 문서 작성
- [x] Inspector Property 컴포넌트 패턴 구축 (완료됨)

---

### Phase 1: 안티패턴 제거 (3-4시간)

#### 1.1 Card.tsx 완전 리팩토링 (2-2.5시간)

**문제점 5가지**:
1. ❌ `variantClasses`, `sizeClasses` (잘못된 복수형 명칭)
2. ❌ `size: "small" | "medium" | "large"` (비표준)
3. ❌ 수동 className 조합
4. ❌ `isSelected`, `isFocused` props (비표준)
5. ❌ CSS 하드코딩

**작업**:
- tv() 패턴 적용
- size 값 통일: "sm" | "md" | "lg"
- 비표준 props 제거
- Card.css 시멘틱 토큰 전환
- 모든 사용처 업데이트

#### 1.2 Panel.tsx 리팩토링 (1-1.5시간)

**작업**:
- `variantClasses` 제거
- tv() 패턴 적용
- 수동 className 조합 제거

**✅ 완료 조건**:
- [ ] Card/Panel에서 모든 안티패턴 제거
- [ ] tv() 패턴 적용
- [ ] TypeScript 에러 없음

---

### Phase 2: Button.css 시멘틱 토큰 마이그레이션 (1-1.5시간)

**팔레트 참조 7개 제거**:
- Line 37: `--color-primary-600` → `--button-primary-border`
- Line 43: `--color-secondary-600` → `--button-secondary-border`
- Line 47: `--color-surface-500` → `--button-surface-bg`
- Line 48: `--color-white` → `--button-surface-text`
- Line 49: `--color-surface-600` → `--button-surface-border`
- Line 54: `--color-gray-800` → `--button-outline-text`
- Line 55: `--color-gray-300` → `--button-outline-border`
- Line 60: `--color-gray-800` → `--button-ghost-text`

**검증**:
- 5 variants × 5 sizes = 25개 조합 테스트
- 라이트/다크 모드 확인

**✅ 완료 조건**:
- [ ] 팔레트 참조 0개
- [ ] 시멘틱 토큰 100%
- [ ] 모든 조합 정상 작동

---

### Phase 3: Tier 1 Form 컴포넌트 (10-14시간)

**대상 컴포넌트 (6개)**:
1. TextField (2-2.5시간)
2. Select (2-2.5시간)
3. ComboBox (2-2.5시간)
4. Checkbox (2시간)
5. Radio (2시간)
6. Switch (2시간)

**각 컴포넌트 작업**:
- `variant: FieldVariant` 추가 (TextField, Select, ComboBox)
- `size: ComponentSize` 추가 (모두)
- tv() 패턴 적용
- CSS 파일 생성/수정 (시멘틱 토큰)
- Editor 업데이트

**✅ 완료 조건**:
- [ ] 6개 컴포넌트 variant/size 구현
- [ ] 모든 CSS가 시멘틱 토큰 기반
- [ ] Inspector 통합 완료

---

### Phase 4: Tier 2 Navigation & Layout (6-8시간)

**대상 컴포넌트 (4개)**:
1. Menu (2시간) - size: DensitySize, variant: MenuVariant
2. Tabs (2시간) - variant: TabsVariant, size: ComponentSize
3. Dialog/Modal (2-3시간) - size + "fullscreen", variant: DialogVariant
4. Breadcrumbs (1시간) - size: ComponentSize, variant

**✅ 완료 조건**:
- [ ] Navigation 컴포넌트 variant/size 완성
- [ ] 기존 팔레트 참조 제거

---

### Phase 5: 고우선순위 CSS 마이그레이션 (6-8시간)

**팔레트 참조 50+ 파일들**:
1. ActionList.css (60+ 참조) - 2시간
2. EventPalette.css (45+ 참조) - 1.5시간
3. EventTemplateLibrary.css (55+ 참조) - 1.5시간
4. Table.css (40+ 참조) - 2-3시간
5. SimpleFlowView.css + ReactFlowCanvas.css (55+ 참조) - 1.5시간

**작업**:
- 팔레트 변수 → 시멘틱 토큰 일괄 전환
- hover, focus, active 상태 시멘틱 토큰 적용

**✅ 완료 조건**:
- [ ] 최다 팔레트 참조 파일들 전환 완료
- [ ] grep 검색 결과 대폭 감소

---

### Phase 6: Tier 3 & 나머지 컴포넌트 (8-10시간)

**Collection Components (4시간)**:
- ListBox, GridList, Tree, TagGroup
- `size: DensitySize` 추가

**Feedback Components (2시간)**:
- ProgressBar, Meter, Tooltip
- `variant: FeedbackVariant`, `size: ComponentSize` 추가

**기타 Input Components (2시간)**:
- Slider, ToggleButton, DatePicker, ColorPicker, NumberField, SearchField
- `size: ComponentSize` 추가

**중우선순위 CSS (2시간)**:
- Chat 컴포넌트들
- Menu, GridList, Card 등 나머지

**✅ 완료 조건**:
- [ ] 모든 인터랙티브 컴포넌트 variant/size 완성
- [ ] 모든 CSS 파일 시멘틱 토큰 전환

---

### Phase 7: 검증, 테스트, 문서화 (3-4시간)

#### 7.1 통합 테스트 (1.5시간)
```bash
# 팔레트 참조 완전 제거 확인
grep -r "color-gray-\|color-primary-\|color-surface-" src/builder/components/styles/

# TypeScript 검증
npm run type-check

# 시각적 회귀 테스트
npm run dev
npm run storybook
```

#### 7.2 Storybook 업데이트 (1시간)
- 모든 컴포넌트 Story에 variant/size controls 추가

#### 7.3 CLAUDE.md 업데이트 (30min)
- Component Variant/Size System 섹션 작성

#### 7.4 마이그레이션 가이드 (1시간)
- Before/After 예제
- 개발자 가이드

**✅ 완료 조건**:
- [ ] 팔레트 참조 0개 확인
- [ ] TypeScript 에러 없음
- [ ] 시각적 회귀 없음
- [ ] 문서 완성

---

## ⚠️ 리스크 평가

### 🔴 HIGH RISK: 없음

### 🟡 MEDIUM RISK

**1. 토큰 패턴 변경**
- **문제**: theme.css가 fallback 패턴 사용
- **해결**: 새 토큰 추가 시 `var(--token, var(--fallback))` 패턴 필수
- **영향**: Phase 0.1

**2. Phase 1.2 이미 구현됨**
- **문제**: Token injection 시스템이 이미 완성됨
- **해결**: Phase 1.2 건너뛰기, 문서화만
- **영향**: -1시간 절약

**3. 컴포넌트 수 증가** (59→60)
- **문제**: 새 컴포넌트가 있을 수 있음
- **해결**: Phase 3.1에서 재감사
- **영향**: +0.5시간

### 🟢 LOW RISK

**4. Card/Panel 안티패턴**
- 검증 완료, 정확히 분석됨
- 리스크 없음

**5. 팔레트 변수 존재**
- 검증 완료, 200+ 참조 확인됨
- 리스크 없음

---

## 📋 Phase별 Go/No-Go

| Phase | 상태 | 권장사항 | 수정사항 |
|-------|------|---------|---------|
| 0.1 - 시멘틱 토큰 | ⚠️ GO | Fallback 패턴 사용 | 패턴 조정 필요 |
| 0.2 - 타입 정의 | ✅ GO | 그대로 진행 | 없음 |
| 0.3 - 문서화 | ✅ GO | 그대로 진행 | 없음 |
| 1.1 - Card 리팩토링 | ✅ GO | 그대로 진행 | 없음 |
| 1.2 - Panel 리팩토링 | ✅ GO | 그대로 진행 | 없음 |
| 2 - Button CSS | ✅ GO | 그대로 진행 | 없음 |
| 3 - Tier 1 Form | ✅ GO | 그대로 진행 | 없음 |
| 4 - Navigation | ✅ GO | 그대로 진행 | 없음 |
| 5 - CSS 마이그레이션 | ✅ GO | 그대로 진행 | 없음 |
| 6 - 나머지 | ✅ GO | 그대로 진행 | 없음 |
| 7 - 검증/문서 | ✅ GO | 그대로 진행 | 없음 |

---

## ⏱️ 타임라인

### 전체 예상 시간: 39-52시간

**주당 8-10시간 투입 기준**: 6-8주

**집중 투입 시나리오** (주당 20시간):
- Week 1: Phase 0-2 완료
- Week 2-3: Phase 3-4 완료
- Week 4: Phase 5-6 완료
- Week 5: Phase 7 + 버퍼

---

## 🎯 성공 지표

### 정량적 지표
- [ ] 팔레트 변수 참조: 200+ → 0개 (100% 감소)
- [ ] variant/size 구현률: 2.2% → 100% (98% 증가)
- [ ] tv() 사용률: 2.2% → 100% (필요 컴포넌트)
- [ ] 시멘틱 토큰 커버리지: 100%
- [ ] TypeScript 에러: 0개
- [ ] 시각적 회귀: 0건

### 정성적 지표
- [ ] ThemeStudio AI 테마 생성 완벽 작동
- [ ] 라이트/다크 모드 일관성
- [ ] 컴포넌트 사용 API 통일성
- [ ] 개발자 경험 개선
- [ ] 유지보수성 향상

---

## 🔗 관련 문서

- [세부 실행 단계](./MIGRATION_DETAILED_STEPS.md)
- [리팩토링 템플릿](./COMPONENT_REFACTORING_TEMPLATE.md)
- [검증 리포트](./VALIDATION_REPORT.md)
- [시멘틱 토큰 레퍼런스](../SEMANTIC_TOKENS.md)

---

## 📝 진행 현황

**마지막 업데이트**: 2025-11-06
**현재 Phase**: Phase 0 준비 중
**완료율**: 0%

### 체크리스트

- [ ] Phase 0: 기반 인프라
- [ ] Phase 1: 안티패턴 제거
- [ ] Phase 2: Button 마이그레이션
- [ ] Phase 3: Tier 1 Form
- [ ] Phase 4: Navigation
- [ ] Phase 5: CSS 마이그레이션
- [ ] Phase 6: 나머지 컴포넌트
- [ ] Phase 7: 검증 & 문서

---

**승인 상태**: ✅ 검증 완료, 실행 대기 중
**신뢰도**: 85% (High Confidence)
