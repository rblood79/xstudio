# Preview 체크박스/스위치 상태 리셋 버그 수정

**날짜**: 2025-10-09  
**문제**: Preview에서 체크박스/스위치를 조작한 후 body를 선택하면 상태가 리셋됨

## 🐛 문제 상황

### 영향받는 컴포넌트 (모든 상태 컴포넌트)

body 선택 시 **상태가 리셋되는 모든 컴포넌트**:

1. **선택 상태 컴포넌트**:

   - ✅ `Checkbox` - `isSelected` → `defaultSelected`
   - ✅ `Switch` - `isSelected` → `defaultSelected`
   - ❌ `Radio` / `RadioGroup` - `value` → `defaultValue`
   - ❌ `ToggleButton` / `ToggleButtonGroup` - `selectedKeys` → `defaultSelectedKeys`

2. **입력 컴포넌트**:

   - ❌ `Input` - `value` → `defaultValue`
   - ❌ `TextField` - `value` → `defaultValue`
   - ❌ `ComboBox` - `selectedKey`, `inputValue` → `defaultSelectedKey`, `defaultInputValue`

3. **선택 컴포넌트**:

   - ❌ `Select` - `selectedKey` → `defaultSelectedKey`
   - ❌ `ListBox` - `selectedKeys` → `defaultSelectedKeys`
   - ❌ `GridList` - `selectedKeys` → `defaultSelectedKeys`

4. **범위 컴포넌트**:

   - ❌ `Slider` - `value` → `defaultValue`
   - ❌ `DatePicker` - `value` → `defaultValue`
   - ❌ `DateRangePicker` - `value` → `defaultValue`

5. **탭 컴포넌트**:
   - ✅ `Tabs` - 이미 `defaultSelectedKey` 사용 중

### 재현 단계

1. Preview에서 체크박스를 체크하거나 스위치를 ON으로 변경
2. Preview의 body 요소를 클릭하여 선택
3. → **체크박스가 uncheck되고, 스위치가 OFF로 리셋됨**

### 에러 로그 분석

```
useSyncWithBuilder.ts:52 🔄 useSyncWithBuilder - 동기화 시작:
  {elementId: '042a24e0-ae8a-4222-97bd-da0404b951db', elementType: 'body', ...}

useSyncWithBuilder.ts:62 📤 useSyncWithBuilder - updateElement 호출:
  {elementId: '042a24e0-ae8a-4222-97bd-da0404b951db', update: {...}}

elements.ts:682 🔄 updateElement 호출:
  {elementId: '042a24e0-ae8a-4222-97bd-da0404b951db', elementTag: 'body', ...}

BuilderCore.tsx:194 🚀 프로젝트 초기화 후 프리뷰 전송:
  {projectId: '...', elementCount: 3, elementIds: [...]}

useIframeMessenger.ts:58 📤 Sent 3 elements to iframe
```

## 🔍 원인 분석

### 문제 흐름

```
1. body 선택
   ↓
2. useSyncWithBuilder → updateElement() 호출
   ↓
3. elements 배열이 새 참조로 변경 (Immer produce)
   ↓
4. BuilderCore.tsx의 useEffect 트리거
   useEffect(() => {
     if (projectId && elements.length > 0 && iframeReadyState === "ready") {
       sendElementsToIframe(elements); // 전체 요소 재전송 ❌
     }
   }, [projectId, elements, iframeReadyState, sendElementsToIframe]);
   ↓
5. Preview iframe이 전체 재렌더링
   ↓
6. 체크박스/스위치의 controlled state가 초기값으로 리셋
```

### 핵심 문제

- **BuilderCore.tsx의 useEffect가 `elements` 배열을 의존성으로 가짐**
- `updateElement()`가 Immer를 통해 새 배열 참조를 생성
- body 선택 시에도 `updateElement()`가 호출됨 (선택 상태 업데이트)
- → 전체 요소를 iframe에 재전송 → React 컴포넌트 재마운트
- → 체크박스/스위치의 uncontrolled state 초기화

## 🛠️ 해결 방안

### 방법 1: 선택 변경 시 iframe 재전송 방지 (권장)

**아이디어**: body 선택은 UI 상태 변경일 뿐, Preview에 영향을 주지 않아야 함

#### 수정: BuilderCore.tsx

```typescript
// ❌ 기존: elements 배열 전체를 의존성으로
useEffect(() => {
  if (projectId && elements.length > 0 && iframeReadyState === "ready") {
    sendElementsToIframe(elements);
  }
}, [projectId, elements, iframeReadyState, sendElementsToIframe]);

// ✅ 개선: elements의 실제 데이터 변경만 감지
useEffect(() => {
  if (projectId && elements.length > 0 && iframeReadyState === "ready") {
    const timeoutId = setTimeout(() => {
      sendElementsToIframe(elements);
    }, 100);
    return () => clearTimeout(timeoutId);
  }
}, [
  projectId,
  iframeReadyState,
  sendElementsToIframe,
  // elements 배열 자체가 아닌 개수만 추적
  elements.length,
  // 또는 요소 ID 목록만 추적 (순서 변경 감지)
  // elements.map(el => el.id).join(',')
]);
```

**장점**: 선택 변경 시 iframe 재전송 안 함  
**단점**: 요소 props 변경 시 감지 못함

---

### 방법 2: Preview 컴포넌트에서 uncontrolled state 유지

**아이디어**: 체크박스/스위치를 uncontrolled 컴포넌트로 만들어 React 외부에서 상태 관리

#### 수정: src/builder/preview/index.tsx

```typescript
// Checkbox 렌더링 시 defaultSelected 사용
case "Checkbox":
  return (
    <Checkbox
      key={element.id}
      id={element.id}
      defaultSelected={element.props?.defaultSelected || false} // controlled → uncontrolled
      onChange={(isSelected) => {
        // 상태를 Zustand에 저장 (optional)
        updateElementProps(element.id, { defaultSelected: isSelected });
      }}
    >
      {element.text || "Checkbox"}
    </Checkbox>
  );

// Switch도 동일하게
case "Switch":
  return (
    <Switch
      key={element.id}
      id={element.id}
      defaultSelected={element.props?.defaultSelected || false}
      onChange={(isSelected) => {
        updateElementProps(element.id, { defaultSelected: isSelected });
      }}
    >
      {element.text || "Switch"}
    </Switch>
  );
```

**장점**: iframe 재전송되어도 DOM 상태 유지  
**단점**: React 상태와 DOM 상태 불일치 가능

---

### 방법 3: 요소 변경 타입 구분

**아이디어**: 선택 변경과 데이터 변경을 구분하여 iframe 재전송 조건 세분화

#### 수정: elements.ts

```typescript
// updateElement에 changeType 추가
updateElement: async (
  elementId,
  updates,
  changeType?: "selection" | "data"
) => {
  // ...기존 로직

  // changeType을 store에 저장
  set({ lastChangeType: changeType });
};
```

#### 수정: BuilderCore.tsx

```typescript
const lastChangeType = useStore((state) => state.lastChangeType);

useEffect(() => {
  // 선택 변경이 아닌 경우만 iframe 재전송
  if (
    projectId &&
    elements.length > 0 &&
    iframeReadyState === "ready" &&
    lastChangeType !== "selection"
  ) {
    sendElementsToIframe(elements);
  }
}, [projectId, elements, iframeReadyState, lastChangeType]);
```

**장점**: 세밀한 제어 가능  
**단점**: 코드 복잡도 증가

---

### 방법 4: Preview iframe에서 postMessage로 개별 업데이트 (최선)

**아이디어**: 전체 재전송이 아닌 변경된 요소만 업데이트

#### 새 파일: src/builder/hooks/useElementSync.ts

```typescript
export function useElementSync() {
  const prevElementsRef = useRef<Element[]>([]);

  useEffect(() => {
    const changedElements = elements.filter((el, index) => {
      const prevEl = prevElementsRef.current[index];
      return !prevEl || !isEqual(el, prevEl);
    });

    if (
      changedElements.length > 0 &&
      changedElements.length < elements.length
    ) {
      // 일부만 변경 → 개별 업데이트
      postMessage({ type: "UPDATE_ELEMENTS", elements: changedElements });
    } else if (changedElements.length === elements.length) {
      // 전체 변경 → 전체 재전송
      sendElementsToIframe(elements);
    }

    prevElementsRef.current = elements;
  }, [elements]);
}
```

**장점**: 최적화된 성능, 상태 보존  
**단점**: 구현 복잡도 높음

---

## ✅ 권장 해결책

**방법 1 + 방법 2 조합**:

1. **BuilderCore.tsx**: `elements.length`만 의존성으로 (구조 변경만 감지)
2. **Preview 컴포넌트**: Checkbox/Switch를 `defaultSelected` (uncontrolled)로 변경

이 조합으로:

- 요소 추가/삭제 시에만 iframe 재전송
- 선택 변경 시 iframe 재전송 안 함
- 체크박스/스위치 상태는 DOM에서 자체 유지

---

## 🔧 구현 완료 ✅

### 적용된 해결책: 방법 1 + 방법 2 조합

#### 1. BuilderCore.tsx - iframe 재전송 최적화

**변경 내용**:

- `elements` 배열 전체 대신 **요소 구조(ID, tag, parent_id)**만 의존성으로 추가
- 선택 변경 시 재전송 방지, 요소 추가/삭제/구조 변경 시에만 재전송

```typescript
// ✅ 구현됨
const elementStructure = React.useMemo(
  () => elements.map((el) => `${el.id}:${el.tag}:${el.parent_id}`).join(","),
  [elements]
);

useEffect(() => {
  if (projectId && elements.length > 0 && iframeReadyState === "ready") {
    const timeoutId = setTimeout(() => {
      sendElementsToIframe(elements);
    }, 100);
    return () => clearTimeout(timeoutId);
  }
}, [projectId, elementStructure, iframeReadyState, sendElementsToIframe]);
```

#### 2. Preview - 모든 상태 컴포넌트를 uncontrolled로 변경

**변경된 컴포넌트** (총 11개):

| 컴포넌트            | 변경 전 (Controlled)           | 변경 후 (Uncontrolled)                    | 상태 |
| ------------------- | ------------------------------ | ----------------------------------------- | ---- |
| `Checkbox`          | `isSelected`                   | `defaultSelected`                         | ✅   |
| `Switch`            | `isSelected`                   | `defaultSelected`                         | ✅   |
| `RadioGroup`        | `value`                        | `defaultValue`                            | ✅   |
| `ToggleButtonGroup` | `selectedKeys`                 | `defaultSelectedKeys`                     | ✅   |
| `Input`             | `value`                        | `defaultValue`                            | ✅   |
| `TextField`         | `value`                        | `defaultValue`                            | ✅   |
| `Select`            | `selectedKey`                  | `defaultSelectedKey`                      | ✅   |
| `ComboBox`          | `selectedKey`, `inputValue`    | `defaultSelectedKey`, `defaultInputValue` | ✅   |
| `ListBox`           | `selectedKeys`                 | `defaultSelectedKeys`                     | ✅   |
| `GridList`          | `selectedKeys`                 | `defaultSelectedKeys`                     | ✅   |
| `Slider`            | `value`                        | `defaultValue`                            | ✅   |
| `Tabs`              | 이미 `defaultSelectedKey` 사용 | -                                         | ✅   |

**공통 패턴**:

```typescript
// ❌ Controlled (문제 발생)
<Component
  value={el.props.value}
  onChange={(value) => updateElementProps(el.id, { value })}
/>

// ✅ Uncontrolled (문제 해결)
<Component
  defaultValue={el.props.value}
  onChange={(value) => updateElementProps(el.id, { value })}
/>
```

**핵심 원리**:

- `defaultValue` / `defaultSelected` - **초기값만 설정**, React가 내부 상태 관리
- iframe 재전송 시에도 DOM 상태 유지
- `onChange`로 Zustand store는 계속 업데이트

---

## 📋 구현 체크리스트

- [x] BuilderCore.tsx useEffect 의존성 수정 (`elementStructure`만 추적)
- [x] Preview의 Checkbox를 `defaultSelected` 기반으로 변경
- [x] Preview의 Switch를 `defaultSelected` 기반으로 변경
- [x] Preview의 RadioGroup을 `defaultValue` 기반으로 변경
- [x] Preview의 ToggleButtonGroup을 `defaultSelectedKeys` 기반으로 변경
- [x] Preview의 Input을 `defaultValue` 기반으로 변경
- [x] Preview의 TextField를 `defaultValue` 기반으로 변경
- [x] Preview의 Select를 `defaultSelectedKey` 기반으로 변경
- [x] Preview의 ComboBox를 `defaultSelectedKey`, `defaultInputValue` 기반으로 변경
- [x] Preview의 ListBox를 `defaultSelectedKeys` 기반으로 변경
- [x] Preview의 GridList를 `defaultSelectedKeys` 기반으로 변경
- [x] Preview의 Slider를 `defaultValue` 기반으로 변경
- [ ] **테스트**: 모든 상태 컴포넌트에서 상태 유지 확인
- [ ] **테스트**: body 선택 시 상태 리셋 안 됨 확인
- [ ] **테스트**: 요소 추가/삭제 시 iframe 재전송 확인

---

## 🎯 예상 결과

### Before (버그 발생)

1. 체크박스 체크 ✅
2. TextField에 텍스트 입력 ✅
3. Select에서 옵션 선택 ✅
4. body 선택 → **전체 요소 재전송**
5. → 모든 상태 리셋 ❌

### After (수정 완료)

1. 체크박스 체크 ✅
2. TextField에 텍스트 입력 ✅
3. Select에서 옵션 선택 ✅
4. body 선택 → **iframe 재전송 안 함**
5. → 모든 상태 유지 ✅

---

## � 구현 체크리스트

- [ ] BuilderCore.tsx useEffect 의존성 수정 (`elements.length`만 추적)
- [ ] Preview의 Checkbox를 `defaultSelected` 기반으로 변경
- [ ] Preview의 Switch를 `defaultSelected` 기반으로 변경
- [ ] 다른 상태 컴포넌트도 확인 (RadioGroup, Select 등)
- [ ] 테스트: 체크박스 체크 → body 선택 → 상태 유지 확인
- [ ] 테스트: 요소 추가/삭제 시 iframe 재전송 확인

---

## 📚 참고

- [React Controlled vs Uncontrolled Components](https://react.dev/learn/sharing-state-between-components#controlled-and-uncontrolled-components)
- [React Aria - Checkbox defaultSelected](https://react-spectrum.adobe.com/react-aria/Checkbox.html#uncontrolled)
- [Immer produce 불변성](https://immerjs.github.io/immer/)
