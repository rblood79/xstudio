# Preview 상태 컴포넌트 리셋 버그 수정 - 요약

## ✅ 완료된 작업

### 문제

Preview에서 **모든 상태를 가진 컴포넌트**(Checkbox, Switch, TextField, Select 등)가 body 선택 시 상태가 리셋되는 버그

### 원인

1. body 선택 → `updateElement()` 호출
2. → `elements` 배열 새 참조 생성 (Immer)
3. → `BuilderCore.tsx`의 useEffect 트리거
4. → **전체 요소를 iframe에 재전송**
5. → React 컴포넌트 재마운트
6. → Controlled 컴포넌트의 상태 초기화

### 해결

**방법 1 + 방법 2 조합**

#### 1️⃣ BuilderCore.tsx - iframe 재전송 최적화

- `elements` 배열 대신 **구조 정보**만 의존성으로 추가
- 선택 변경 시 재전송 방지 ✅

#### 2️⃣ Preview - 모든 상태 컴포넌트를 Uncontrolled로 변경

**총 11개 컴포넌트 수정**:

| 컴포넌트          | Before                      | After                                     |
| ----------------- | --------------------------- | ----------------------------------------- |
| Checkbox          | `isSelected`                | `defaultSelected`                         |
| Switch            | `isSelected`                | `defaultSelected`                         |
| RadioGroup        | `value`                     | `defaultValue`                            |
| ToggleButtonGroup | `selectedKeys`              | `defaultSelectedKeys`                     |
| Input             | `value`                     | `defaultValue`                            |
| TextField         | `value`                     | `defaultValue`                            |
| Select            | `selectedKey`               | `defaultSelectedKey`                      |
| ComboBox          | `selectedKey`, `inputValue` | `defaultSelectedKey`, `defaultInputValue` |
| ListBox           | `selectedKeys`              | `defaultSelectedKeys`                     |
| GridList          | `selectedKeys`              | `defaultSelectedKeys`                     |
| Slider            | `value`                     | `defaultValue`                            |

### 효과

- ✅ body 선택 시 iframe 재전송 안 함
- ✅ 모든 상태 컴포넌트의 값 유지
- ✅ 성능 개선 (불필요한 재렌더링 방지)
- ✅ 사용자 경험 개선

## 📁 수정된 파일

1. `/src/builder/main/BuilderCore.tsx` - useEffect 의존성 최적화
2. `/src/builder/preview/index.tsx` - 11개 컴포넌트 uncontrolled 변경
3. `/docs/features/PREVIEW_STATE_RESET_BUG.md` - 상세 문서

## 🧪 테스트 필요

- [ ] Checkbox/Switch 체크 → body 선택 → 상태 유지 확인
- [ ] TextField 입력 → body 선택 → 텍스트 유지 확인
- [ ] Select 선택 → body 선택 → 선택 유지 확인
- [ ] Slider 조작 → body 선택 → 값 유지 확인
- [ ] 모든 입력 컴포넌트 검증

---

**문서**: `/docs/features/PREVIEW_STATE_RESET_BUG.md`
