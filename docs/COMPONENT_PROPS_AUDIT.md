# XStudio Components Props Audit

전체 컴포넌트에서 React Aria 공식 문서와 비교하여 누락된 props를 찾고 추가하는 체크리스트입니다.

## 📋 감사 방법

각 컴포넌트마다:
1. ✅ React Aria 공식 문서 확인
2. ✅ 현재 구현된 props 목록 작성
3. ✅ 누락된 props 확인
4. ✅ 누락된 props 추가 구현
5. ✅ Property Editor 업데이트

---

## 🎯 Form Components (15개)

### ✅ Button
**React Aria Docs:** https://react-spectrum.adobe.com/react-aria/Button.html

**현재 Props:**
- children, className, style
- onPress, isDisabled, type
- variant, size

**누락된 Props:**
- [ ] `autoFocus` - 자동 포커스
- [ ] `isPending` - 비동기 작업 pending 상태
- [ ] `onPressStart` - 프레스 시작 이벤트
- [ ] `onPressEnd` - 프레스 종료 이벤트
- [ ] `onPressChange` - 프레스 상태 변경
- [ ] `onPressUp` - 마우스/터치 up
- [ ] `onHoverStart` - 호버 시작
- [ ] `onHoverEnd` - 호버 종료
- [ ] `onHoverChange` - 호버 상태 변경
- [ ] `onFocusChange` - 포커스 상태 변경
- [ ] `excludeFromTabOrder` - 탭 순서 제외
- [ ] `aria-label` - 접근성 레이블
- [ ] `aria-labelledby` - 레이블 참조
- [ ] `aria-describedby` - 설명 참조
- [ ] `aria-details` - 상세 정보 참조
- [ ] `aria-pressed` - 토글 상태 (ToggleButton용)
- [ ] `form` - 연결된 폼 ID
- [ ] `formAction` - 폼 액션 URL
- [ ] `formEncType` - 폼 인코딩 타입
- [ ] `formMethod` - HTTP 메서드
- [ ] `formNoValidate` - 검증 스킵
- [ ] `formTarget` - 제출 타겟
- [ ] `name` - 폼 필드 이름
- [ ] `value` - 폼 필드 값

**우선순위:** ⭐⭐⭐⭐⭐ (매우 높음)

---

### ✅ TextField
**React Aria Docs:** https://react-spectrum.adobe.com/react-aria/TextField.html

**현재 Props:**
- label, description, errorMessage
- value, onChange, onBlur
- type, placeholder
- isDisabled, isReadOnly, isRequired

**누락된 Props:**
- [ ] `autoFocus` - 자동 포커스
- [ ] `autoComplete` - 자동완성 타입
- [ ] `maxLength` - 최대 길이
- [ ] `minLength` - 최소 길이
- [ ] `pattern` - 정규식 패턴
- [ ] `inputMode` - 모바일 키보드 타입
- [ ] `validate` - 커스텀 검증 함수
- [ ] `validationBehavior` - 'native' | 'aria'
- [ ] `validationState` - 'valid' | 'invalid'
- [ ] `onInvalid` - 검증 실패 이벤트
- [ ] `onFocus` - 포커스 이벤트
- [ ] `onFocusChange` - 포커스 상태 변경
- [ ] `onBlur` - 블러 이벤트
- [ ] `onKeyDown` - 키다운 이벤트
- [ ] `onKeyUp` - 키업 이벤트
- [ ] `onCopy` - 복사 이벤트
- [ ] `onCut` - 잘라내기 이벤트
- [ ] `onPaste` - 붙여넣기 이벤트
- [ ] `onCompositionStart` - IME 입력 시작
- [ ] `onCompositionEnd` - IME 입력 종료
- [ ] `onCompositionUpdate` - IME 입력 업데이트
- [ ] `onBeforeInput` - 입력 전 이벤트
- [ ] `onInput` - 입력 이벤트
- [ ] `name` - 폼 필드 이름
- [ ] `form` - 연결된 폼 ID
- [ ] `aria-label` - 접근성 레이블
- [ ] `aria-labelledby` - 레이블 참조
- [ ] `aria-describedby` - 설명 참조
- [ ] `aria-details` - 상세 정보 참조
- [ ] `excludeFromTabOrder` - 탭 순서 제외

**우선순위:** ⭐⭐⭐⭐⭐ (매우 높음)

---

### ✅ NumberField
**React Aria Docs:** https://react-spectrum.adobe.com/react-aria/NumberField.html

**현재 Props:**
- label, description, errorMessage
- value, onChange
- isDisabled, isReadOnly, isRequired

**누락된 Props:**
- [ ] `minValue` - 최소값
- [ ] `maxValue` - 최대값
- [ ] `step` - 증감 단위
- [ ] `formatOptions` - Intl.NumberFormat 옵션
- [ ] `autoFocus` - 자동 포커스
- [ ] `validate` - 커스텀 검증 함수
- [ ] `validationBehavior` - 'native' | 'aria'
- [ ] `onFocus` - 포커스 이벤트
- [ ] `onBlur` - 블러 이벤트
- [ ] `onFocusChange` - 포커스 상태 변경
- [ ] `onKeyDown` - 키다운 이벤트
- [ ] `onKeyUp` - 키업 이벤트
- [ ] `decrementAriaLabel` - 감소 버튼 레이블
- [ ] `incrementAriaLabel` - 증가 버튼 레이블
- [ ] `name` - 폼 필드 이름
- [ ] `aria-label` - 접근성 레이블

**우선순위:** ⭐⭐⭐⭐

---

### ✅ DatePicker
**React Aria Docs:** https://react-spectrum.adobe.com/react-aria/DatePicker.html

**현재 Props:**
- label, description, errorMessage
- value, onChange
- minValue, maxValue
- isDisabled, isReadOnly, isRequired
- showCalendarIcon, includeTime

**누락된 Props:**
- [ ] `autoFocus` - 자동 포커스
- [ ] `placeholderValue` - 플레이스홀더 날짜
- [ ] `granularity` - 'day' | 'hour' | 'minute' | 'second'
- [ ] `hideTimeZone` - 타임존 숨김
- [ ] `hourCycle` - 12시간/24시간 형식
- [ ] `shouldForceLeadingZeros` - 앞자리 0 강제
- [ ] `validate` - 커스텀 검증 함수
- [ ] `validationBehavior` - 'native' | 'aria'
- [ ] `onFocus` - 포커스 이벤트
- [ ] `onBlur` - 블러 이벤트
- [ ] `onFocusChange` - 포커스 상태 변경
- [ ] `onKeyDown` - 키다운 이벤트
- [ ] `onKeyUp` - 키업 이벤트
- [ ] `isDateUnavailable` - 사용 불가 날짜 함수
- [ ] `pageBehavior` - 캘린더 페이지 동작
- [ ] `visibleMonths` - 표시할 월 수
- [ ] `name` - 폼 필드 이름
- [ ] `aria-label` - 접근성 레이블

**우선순위:** ⭐⭐⭐⭐

---

### ✅ Checkbox
**React Aria Docs:** https://react-spectrum.adobe.com/react-aria/Checkbox.html

**현재 Props:**
- children, className
- isSelected, onChange
- isDisabled, isReadOnly
- variant, size

**누락된 Props:**
- [ ] `autoFocus` - 자동 포커스
- [ ] `isIndeterminate` - 중간 상태 (부분 선택)
- [ ] `value` - 폼 값
- [ ] `name` - 폼 필드 이름
- [ ] `validationBehavior` - 'native' | 'aria'
- [ ] `isRequired` - 필수 여부
- [ ] `isInvalid` - 검증 실패 상태
- [ ] `validate` - 커스텀 검증 함수
- [ ] `onFocus` - 포커스 이벤트
- [ ] `onBlur` - 블러 이벤트
- [ ] `onFocusChange` - 포커스 상태 변경
- [ ] `onKeyDown` - 키다운 이벤트
- [ ] `onKeyUp` - 키업 이벤트
- [ ] `aria-label` - 접근성 레이블
- [ ] `aria-labelledby` - 레이블 참조
- [ ] `aria-describedby` - 설명 참조
- [ ] `excludeFromTabOrder` - 탭 순서 제외

**우선순위:** ⭐⭐⭐⭐

---

### ✅ CheckboxGroup
**React Aria Docs:** https://react-spectrum.adobe.com/react-aria/CheckboxGroup.html

**현재 Props:**
- children, label, description, errorMessage
- value, onChange
- isDisabled, isReadOnly
- variant, size

**누락된 Props:**
- [ ] `name` - 폼 필드 이름
- [ ] `isRequired` - 필수 여부
- [ ] `isInvalid` - 검증 실패 상태
- [ ] `validate` - 커스텀 검증 함수
- [ ] `validationBehavior` - 'native' | 'aria'
- [ ] `orientation` - 'horizontal' | 'vertical'
- [ ] `aria-label` - 접근성 레이블
- [ ] `aria-labelledby` - 레이블 참조
- [ ] `aria-describedby` - 설명 참조
- [ ] `aria-details` - 상세 정보 참조

**우선순위:** ⭐⭐⭐

---

### ✅ RadioGroup
**React Aria Docs:** https://react-spectrum.adobe.com/react-aria/RadioGroup.html

**현재 Props:**
- children, label, description, errorMessage
- value, onChange
- isDisabled, isReadOnly
- variant, size

**누락된 Props:**
- [ ] `name` - 폼 필드 이름
- [ ] `isRequired` - 필수 여부
- [ ] `isInvalid` - 검증 실패 상태
- [ ] `validate` - 커스텀 검증 함수
- [ ] `validationBehavior` - 'native' | 'aria'
- [ ] `orientation` - 'horizontal' | 'vertical'
- [ ] `onFocus` - 포커스 이벤트
- [ ] `onBlur` - 블러 이벤트
- [ ] `onFocusChange` - 포커스 상태 변경
- [ ] `aria-label` - 접근성 레이블
- [ ] `aria-labelledby` - 레이블 참조
- [ ] `aria-describedby` - 설명 참조

**우선순위:** ⭐⭐⭐

---

### ✅ Switch
**React Aria Docs:** https://react-spectrum.adobe.com/react-aria/Switch.html

**현재 Props:**
- children, className
- isSelected, onChange
- isDisabled, isReadOnly

**누락된 Props:**
- [ ] `autoFocus` - 자동 포커스
- [ ] `value` - 폼 값
- [ ] `name` - 폼 필드 이름
- [ ] `isRequired` - 필수 여부
- [ ] `isInvalid` - 검증 실패 상태
- [ ] `validate` - 커스텀 검증 함수
- [ ] `validationBehavior` - 'native' | 'aria'
- [ ] `onFocus` - 포커스 이벤트
- [ ] `onBlur` - 블러 이벤트
- [ ] `onFocusChange` - 포커스 상태 변경
- [ ] `onKeyDown` - 키다운 이벤트
- [ ] `onKeyUp` - 키업 이벤트
- [ ] `aria-label` - 접근성 레이블
- [ ] `aria-labelledby` - 레이블 참조
- [ ] `aria-describedby` - 설명 참조
- [ ] `excludeFromTabOrder` - 탭 순서 제외

**우선순위:** ⭐⭐⭐

---

### ✅ Slider
**React Aria Docs:** https://react-spectrum.adobe.com/react-aria/Slider.html

**현재 Props:**
- label, value, onChange
- minValue, maxValue, step
- isDisabled
- variant, size

**누락된 Props:**
- [ ] `formatOptions` - Intl.NumberFormat 옵션
- [ ] `orientation` - 'horizontal' | 'vertical'
- [ ] `isValueShown` - 값 표시 여부
- [ ] `getValueLabel` - 커스텀 값 레이블 함수
- [ ] `name` - 폼 필드 이름
- [ ] `onChangeEnd` - 변경 완료 이벤트
- [ ] `aria-label` - 접근성 레이블
- [ ] `aria-labelledby` - 레이블 참조
- [ ] `aria-describedby` - 설명 참조

**우선순위:** ⭐⭐⭐

---

## 🎯 Selection Components (10개)

### ✅ Select
**React Aria Docs:** https://react-spectrum.adobe.com/react-aria/Select.html

**현재 Props:**
- children, label, description, errorMessage
- selectedKey, onSelectionChange
- isDisabled, isRequired
- placeholder

**누락된 Props:**
- [ ] `autoFocus` - 자동 포커스
- [ ] `name` - 폼 필드 이름
- [ ] `isInvalid` - 검증 실패 상태
- [ ] `validate` - 커스텀 검증 함수
- [ ] `validationBehavior` - 'native' | 'aria'
- [ ] `onFocus` - 포커스 이벤트
- [ ] `onBlur` - 블러 이벤트
- [ ] `onFocusChange` - 포커스 상태 변경
- [ ] `onKeyDown` - 키다운 이벤트
- [ ] `onKeyUp` - 키업 이벤트
- [ ] `aria-label` - 접근성 레이블
- [ ] `aria-labelledby` - 레이블 참조
- [ ] `aria-describedby` - 설명 참조
- [ ] `disabledKeys` - 비활성화할 키 목록
- [ ] `items` - Collection items

**우선순위:** ⭐⭐⭐⭐⭐

---

### ✅ ComboBox
**React Aria Docs:** https://react-spectrum.adobe.com/react-aria/ComboBox.html

**현재 Props:**
- children, label, description, errorMessage
- selectedKey, onSelectionChange
- inputValue, onInputChange
- isDisabled, isRequired
- placeholder

**누락된 Props:**
- [ ] `autoFocus` - 자동 포커스
- [ ] `menuTrigger` - 'focus' | 'input' | 'manual'
- [ ] `allowsCustomValue` - 커스텀 값 허용
- [ ] `allowsEmptyCollection` - 빈 컬렉션 허용
- [ ] `shouldCloseOnBlur` - 블러 시 닫기
- [ ] `isReadOnly` - 읽기 전용
- [ ] `name` - 폼 필드 이름
- [ ] `isInvalid` - 검증 실패 상태
- [ ] `validate` - 커스텀 검증 함수
- [ ] `validationBehavior` - 'native' | 'aria'
- [ ] `onFocus` - 포커스 이벤트
- [ ] `onBlur` - 블러 이벤트
- [ ] `onFocusChange` - 포커스 상태 변경
- [ ] `onKeyDown` - 키다운 이벤트
- [ ] `onKeyUp` - 키업 이벤트
- [ ] `onOpenChange` - 열림 상태 변경
- [ ] `aria-label` - 접근성 레이블
- [ ] `disabledKeys` - 비활성화할 키 목록
- [ ] `items` - Collection items

**우선순위:** ⭐⭐⭐⭐⭐

---

### ✅ ListBox
**React Aria Docs:** https://react-spectrum.adobe.com/react-aria/ListBox.html

**현재 Props:**
- children, items
- selectionMode, selectedKeys, onSelectionChange
- disabledKeys
- aria-label

**누락된 Props:**
- [ ] `autoFocus` - 자동 포커스
- [ ] `shouldFocusWrap` - 포커스 순환
- [ ] `disallowEmptySelection` - 빈 선택 금지
- [ ] `selectionBehavior` - 'toggle' | 'replace'
- [ ] `onFocus` - 포커스 이벤트
- [ ] `onBlur` - 블러 이벤트
- [ ] `onFocusChange` - 포커스 상태 변경
- [ ] `onKeyDown` - 키다운 이벤트
- [ ] `onKeyUp` - 키업 이벤트
- [ ] `onAction` - 아이템 액션 이벤트
- [ ] `renderEmptyState` - 빈 상태 렌더링
- [ ] `aria-labelledby` - 레이블 참조
- [ ] `aria-describedby` - 설명 참조

**우선순위:** ⭐⭐⭐⭐

---

## 🎯 Collection Components (10개)

### ✅ Table
**React Aria Docs:** https://react-spectrum.adobe.com/react-aria/Table.html

**현재 Props:**
- columns, data
- selectionMode, selectedKeys, onSelectionChange
- sortDescriptor, onSortChange
- aria-label

**누락된 Props:**
- [ ] `autoFocus` - 자동 포커스
- [ ] `shouldFocusWrap` - 포커스 순환
- [ ] `disallowEmptySelection` - 빈 선택 금지
- [ ] `selectionBehavior` - 'toggle' | 'replace'
- [ ] `onFocus` - 포커스 이벤트
- [ ] `onBlur` - 블러 이벤트
- [ ] `onFocusChange` - 포커스 상태 변경
- [ ] `onKeyDown` - 키다운 이벤트
- [ ] `onKeyUp` - 키업 이벤트
- [ ] `onAction` - 아이템 액션 이벤트
- [ ] `onRowAction` - 행 액션 이벤트
- [ ] `onCellAction` - 셀 액션 이벤트
- [ ] `disabledKeys` - 비활성화할 키 목록
- [ ] `onScroll` - 스크롤 이벤트
- [ ] `renderEmptyState` - 빈 상태 렌더링

**우선순위:** ⭐⭐⭐⭐

---

### ✅ Tree
**React Aria Docs:** https://react-spectrum.adobe.com/react-aria/Tree.html

**현재 Props:**
- children, items
- selectionMode, selectedKeys, onSelectionChange
- expandedKeys, onExpandedChange

**누락된 Props:**
- [ ] `autoFocus` - 자동 포커스
- [ ] `shouldFocusWrap` - 포커스 순환
- [ ] `disallowEmptySelection` - 빈 선택 금지
- [ ] `selectionBehavior` - 'toggle' | 'replace'
- [ ] `onFocus` - 포커스 이벤트
- [ ] `onBlur` - 블러 이벤트
- [ ] `onAction` - 아이템 액션 이벤트
- [ ] `disabledKeys` - 비활성화할 키 목록
- [ ] `aria-label` - 접근성 레이블

**우선순위:** ⭐⭐⭐⭐

---

### ✅ Menu
**React Aria Docs:** https://react-spectrum.adobe.com/react-aria/Menu.html

**현재 Props:**
- children, items
- onAction
- aria-label

**누락된 Props:**
- [ ] `autoFocus` - 자동 포커스
- [ ] `shouldFocusWrap` - 포커스 순환
- [ ] `disabledKeys` - 비활성화할 키 목록
- [ ] `selectionMode` - 'none' | 'single' | 'multiple'
- [ ] `selectedKeys` - 선택된 키
- [ ] `onSelectionChange` - 선택 변경
- [ ] `disallowEmptySelection` - 빈 선택 금지
- [ ] `onClose` - 닫힘 이벤트
- [ ] `onFocus` - 포커스 이벤트
- [ ] `onBlur` - 블러 이벤트
- [ ] `aria-labelledby` - 레이블 참조

**우선순위:** ⭐⭐⭐⭐

---

## 🎯 Overlay Components (5개)

### ✅ Dialog
**React Aria Docs:** https://react-spectrum.adobe.com/react-aria/Dialog.html

**현재 Props:**
- children, className
- role
- aria-label

**누락된 Props:**
- [ ] `isDismissable` - ESC/외부 클릭으로 닫기
- [ ] `isKeyboardDismissDisabled` - 키보드 닫기 비활성화
- [ ] `onDismiss` - 닫힘 이벤트
- [ ] `shouldCloseOnInteractOutside` - 외부 인터랙션 시 닫기
- [ ] `aria-labelledby` - 레이블 참조
- [ ] `aria-describedby` - 설명 참조

**우선순위:** ⭐⭐⭐⭐

---

### ✅ Popover
**React Aria Docs:** https://react-spectrum.adobe.com/react-aria/Popover.html

**현재 Props:**
- children, className
- placement
- offset, crossOffset
- isOpen, onOpenChange

**누락된 Props:**
- [ ] `containerPadding` - 컨테이너 패딩
- [ ] `shouldFlip` - 자동 반전
- [ ] `shouldUpdatePosition` - 위치 자동 업데이트
- [ ] `boundaryElement` - 경계 요소
- [ ] `scrollRef` - 스크롤 참조
- [ ] `maxHeight` - 최대 높이
- [ ] `arrowSize` - 화살표 크기
- [ ] `isNonModal` - 모달 아님
- [ ] `isKeyboardDismissDisabled` - 키보드 닫기 비활성화
- [ ] `shouldCloseOnBlur` - 블러 시 닫기
- [ ] `onOpenChange` - 열림 상태 변경

**우선순위:** ⭐⭐⭐

---

### ✅ Tooltip
**React Aria Docs:** https://react-spectrum.adobe.com/react-aria/Tooltip.html

**현재 Props:**
- children
- delay
- closeDelay
- placement

**누락된 Props:**
- [ ] `offset` - 오프셋
- [ ] `crossOffset` - 교차 오프셋
- [ ] `shouldFlip` - 자동 반전
- [ ] `containerPadding` - 컨테이너 패딩
- [ ] `trigger` - 트리거 타입
- [ ] `isOpen` - 열림 상태
- [ ] `defaultOpen` - 기본 열림
- [ ] `onOpenChange` - 열림 상태 변경
- [ ] `isDisabled` - 비활성화

**우선순위:** ⭐⭐⭐

---

## 📊 감사 진행 상황

| 카테고리 | 전체 | 완료 | 진행률 |
|---------|------|------|--------|
| Form Components | 15 | 0 | 0% |
| Selection Components | 10 | 0 | 0% |
| Collection Components | 10 | 0 | 0% |
| Overlay Components | 5 | 0 | 0% |
| Button/Toggle Components | 8 | 0 | 0% |
| Layout Components | 7 | 0 | 0% |
| Color Components | 6 | 0 | 0% |
| **Total** | **61** | **0** | **0%** |

---

## 🚀 다음 단계

1. **Phase 1**: Form Components 감사 및 누락 props 추가 (2-3일)
2. **Phase 2**: Selection Components 감사 (1-2일)
3. **Phase 3**: Collection Components 감사 (2일)
4. **Phase 4**: Overlay Components 감사 (1일)
5. **Phase 5**: 나머지 컴포넌트 감사 (2일)
6. **Phase 6**: 전체 테스트 및 검증 (1일)

**총 예상 기간:** 약 9-11일

---

## 📝 작업 방법

각 컴포넌트마다:

1. **Component.tsx 업데이트**
   - Props 인터페이스에 누락된 props 추가
   - 기본값 설정
   - 로직 구현

2. **ComponentEditor.tsx 업데이트**
   - Inspector에 누락된 props 컨트롤 추가
   - PropertyInput, PropertySwitch, PropertySelect 등 사용

3. **테스트**
   - Preview에서 동작 확인
   - Inspector에서 값 변경 테스트
   - 접근성 테스트

4. **문서 업데이트**
   - 완료된 컴포넌트 체크리스트 표시
   - 진행률 업데이트
