# XStudio 문서 (Documentation)

XStudio 프로젝트의 개발 가이드 및 기능 구현 문서 모음입니다.

## 📂 디렉토리 구조

```
/docs
  ├── /guides          # 개발 가이드
  └── /features        # 기능 구현 문서
```

## 📚 가이드 (Guides)

개발 가이드 및 참고 문서입니다.

- 현재 가이드 문서가 없습니다. 필요시 `/docs/guides` 디렉토리에 추가하세요.

## ⚙️ 기능 구현 문서 (Features)

각 기능의 구현 과정, 버그 수정, 동작 방식을 설명하는 문서입니다.

### 실시간 저장 모드

- [REALTIME_SAVE_MODE_IMPLEMENTATION.md](./features/REALTIME_SAVE_MODE_IMPLEMENTATION.md) - 실시간 저장 모드 구현
- [SAVESERVICE_REFACTORING.md](./features/SAVESERVICE_REFACTORING.md) - SaveService 리팩토링 (서비스 레이어 구조 개선)
- [SAVE_MODE_BEHAVIOR.md](./features/SAVE_MODE_BEHAVIOR.md) - 저장 모드 동작 방식
- [REALTIME_SAVE_BUG_FIX.md](./features/REALTIME_SAVE_BUG_FIX.md) - 실시간 저장 버그 수정

### Inspector

- [INSPECTOR_REFACTORING.md](./features/INSPECTOR_REFACTORING.md) - Inspector 리팩토링
- [INSPECTOR_INTEGRATION_TEST.md](./features/INSPECTOR_INTEGRATION_TEST.md) - Inspector 통합 테스트
- [INSPECTOR_STYLE_SYSTEM.md](./features/INSPECTOR_STYLE_SYSTEM.md) - Inspector 스타일 관리 시스템 ✨
  - Inline styles 기반 스타일 편집
  - Computed styles 수집 및 표시
  - 양방향 동기화 (Inspector ↔ Builder)
  - 직관적인 Flexbox 컨트롤

### Preview

- [PREVIEW_CHECKBOX_BEHAVIOR.md](./features/PREVIEW_CHECKBOX_BEHAVIOR.md) - Preview Checkbox 동작 방식
- [PREVIEW_STATE_RESET_BUG.md](./features/PREVIEW_STATE_RESET_BUG.md) - Preview 상태 컴포넌트 리셋 버그 수정 ✅

### Components

- [TOGGLEBUTTONGROUP_INDICATOR.md](./features/TOGGLEBUTTONGROUP_INDICATOR.md) - ToggleButtonGroup Indicator 개선 ✨
  - Opacity 기반 indicator 숨김
  - Mutually exclusive groups 지원
  - MutationObserver 활용

---

## 📝 문서 작성 가이드

새로운 문서를 추가할 때는 다음 규칙을 따라주세요:

### 가이드 문서 (`/docs/guides`)

- 개발 워크플로우
- 코드 컨벤션
- 프로젝트 설정
- 기여 가이드

### 기능 문서 (`/docs/features`)

- 기능 구현 설명
- 버그 수정 내역
- 동작 방식 문서
- 성능 개선

### 파일 명명 규칙

- 대문자와 언더스코어 사용: `FEATURE_NAME.md`
- 간결하고 명확한 이름
- 날짜 포함 불필요 (Git 히스토리 활용)

### 문서 구조

```markdown
# 제목

## 개요

간단한 설명

## 문제/배경

해결하려는 문제 또는 배경

## 해결 방법

구현 방법 또는 해결책

## 결과

최종 결과 및 영향

## 참고 자료

관련 링크 또는 참고 자료
```
