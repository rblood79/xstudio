# TypeScript 오류 분석 보고서

**생성일**: 2025-11-14
**분석 대상**: XStudio 프로젝트 전체
**총 오류 수**: 50개
**영향받는 파일**: 13개

## 📊 요약

TypeScript 버전 업그레이드 및 라이브러리 업데이트로 인해 타입 체크가 더 엄격해지면서 발생한 오류들입니다. 모든 오류는 **Property Editors** 파일에 집중되어 있으며, 주로 **JSX 구문 오류**입니다.

### 오류 분포

```
src/builder/panels/properties/editors/
├── BreadcrumbsEditor.tsx          3 errors
├── CheckboxGroupEditor.tsx        3 errors
├── ColumnGroupEditor.tsx          6 errors
├── ComboBoxEditor.tsx            10 errors
├── FieldEditor.tsx                1 error
├── GridListEditor.tsx             2 errors
├── ListBoxEditor.tsx              3 errors
├── ListBoxItemEditor.tsx          5 errors
├── RadioGroupEditor.tsx           3 errors
├── SelectEditor.tsx               3 errors
├── TableEditor.tsx                3 errors
├── TagGroupEditor.tsx             3 errors
└── ToggleButtonGroupEditor.tsx    3 errors

Total: 50 errors across 13 files
```

## 🔍 오류 카테고리 분석

### 1. Import 구문 오류 (1개)

**파일**: `FieldEditor.tsx`
**라인**: 6
**오류 코드**: TS1003

```typescript
// ❌ WRONG - 쉼표가 앞에 위치
, PropertySection} from '../../common';

// ✅ CORRECT
  PropertySection } from '../../common';
```

**원인**: Import 구문에서 쉼표가 잘못 위치함
**영향도**: 🔴 Critical - 파일 컴파일 불가

---

### 2. JSX 태그 불일치 오류 (32개)

가장 빈번한 오류 유형입니다. 주로 `PropertySection` 또는 `div` 태그의 여는 태그와 닫는 태그가 불일치합니다.

#### 2.1 PropertySection 태그 불일치 (12개)

**패턴**: `</PropertySection>` 닫는 태그가 있지만 여는 태그가 없음

**영향받는 파일**:
- BreadcrumbsEditor.tsx: line 82
- CheckboxGroupEditor.tsx: line 168
- ColumnGroupEditor.tsx: line 40
- GridListEditor.tsx: line 162
- ListBoxEditor.tsx: line 147
- ListBoxItemEditor.tsx: line 129
- RadioGroupEditor.tsx: line 138
- SelectEditor.tsx: line 134
- TagGroupEditor.tsx: line 113
- ToggleButtonGroupEditor.tsx: line 116
- ComboBoxEditor.tsx: line 170

**예시** (BreadcrumbsEditor.tsx:54-82):
```tsx
// ❌ WRONG
return (
    <>
        <div className="properties-aria">
            <PropertyInput ... />
            <PropertyInput ... />
        </PropertySection>  {/* 여는 태그 없음! */}
        ...
    </div>
);

// ✅ CORRECT - Option 1: PropertySection 제거
return (
    <>
        <div className="properties-aria">
            <PropertyInput ... />
            <PropertyInput ... />
        </div>
        ...
    </div>
);

// ✅ CORRECT - Option 2: PropertySection 추가
return (
    <>
        <PropertySection title="Basic Properties">
            <PropertyInput ... />
            <PropertyInput ... />
        </PropertySection>
        ...
    </div>
);
```

**원인 분석**:
- 코드 리팩토링 중 `<PropertySection>` 여는 태그 삭제
- 또는 `div`를 `PropertySection`으로 변경하다가 중단
- 닫는 태그만 남아있음

**수정 방법**:
1. **Option 1 (권장)**: 불필요한 닫는 태그 제거
2. **Option 2**: 적절한 여는 태그 추가

---

#### 2.2 div 태그 불일치 (15개)

**패턴**: `<div>` 여는 태그가 있지만 닫는 태그가 없음

**영향받는 파일**:
- BreadcrumbsEditor.tsx: line 92
- CheckboxGroupEditor.tsx: line 179
- ColumnGroupEditor.tsx: lines 43, 95, 116
- GridListEditor.tsx: line 163
- ListBoxEditor.tsx: line 158
- ListBoxItemEditor.tsx: lines 130, 227
- RadioGroupEditor.tsx: line 149
- SelectEditor.tsx: line 145
- TableEditor.tsx: lines 419, 535, 582
- TagGroupEditor.tsx: line 123
- ToggleButtonGroupEditor.tsx: line 127

**예시** (CheckboxGroupEditor.tsx:165-180):
```tsx
// ❌ WRONG
<div className='tab-actions'>
    <button onClick={...}>
        Back to CheckboxGroup Settings
    </button>
</div>  {/* 이 </div>에 대응하는 여는 태그가 없거나, JSX fragment가 잘못 닫힘 */
```

**원인**:
- JSX fragment `<>...</>` 와 `div` 태그의 중첩 구조 불일치
- 조건부 렌더링에서 태그 구조 깨짐

---

### 3. JSX Fragment 오류 (12개)

**패턴**: JSX fragment `<>...</>` 닫는 태그 누락 또는 불일치

**영향받는 파일**:
- BreadcrumbsEditor.tsx: line 92
- CheckboxGroupEditor.tsx: line 179
- ColumnGroupEditor.tsx: line 40
- ComboBoxEditor.tsx: lines 171, 176, 188
- GridListEditor.tsx: line 162
- ListBoxEditor.tsx: line 158
- ListBoxItemEditor.tsx: lines 130, 147
- RadioGroupEditor.tsx: line 149
- SelectEditor.tsx: line 145
- TagGroupEditor.tsx: line 123
- ToggleButtonGroupEditor.tsx: line 127

**오류 코드**: TS17015

```typescript
// ❌ WRONG
<>
    <div>...</div>
    <div>...</div>
// Fragment가 닫히지 않음

// ✅ CORRECT
<>
    <div>...</div>
    <div>...</div>
</>
```

---

### 4. Expression Expected 오류 (6개)

**패턴**: JSX 구조가 깨져서 TypeScript가 표현식을 기대하는 위치에 다른 토큰이 옴

**영향받는 파일**:
- BreadcrumbsEditor.tsx: line 93
- CheckboxGroupEditor.tsx: line 180
- GridListEditor.tsx: line 163
- ListBoxEditor.tsx: line 159
- ListBoxItemEditor.tsx: line 131
- RadioGroupEditor.tsx: line 150
- SelectEditor.tsx: line 146
- TagGroupEditor.tsx: line 124
- ToggleButtonGroupEditor.tsx: line 128

**오류 코드**: TS1109

**원인**: 앞선 JSX 태그 불일치로 인한 연쇄 오류

---

### 5. Unexpected Token 오류 (4개)

**패턴**: JSX에서 비교 연산자 `<`, `>` 를 태그로 잘못 해석

**영향받는 파일**:
- ColumnGroupEditor.tsx: line 40
- ComboBoxEditor.tsx: lines 188, 371, 372
- ListBoxItemEditor.tsx: line 147

**오류 코드**: TS1382

```tsx
// ❌ WRONG (TypeScript가 JSX 태그로 해석)
{items.length > 0 && <div>...</div>}  {/* > 가 태그로 해석됨 */}

// ✅ CORRECT
{items.length > 0 && <div>...</div>}  {/* 실제로는 맥락에 따라 다를 수 있음 */}
```

**원인**: JSX 컨텍스트에서 비교 연산자 사용 시 괄호 누락 또는 JSX 구조 깨짐

---

### 6. Identifier Expected 오류 (4개)

**패턴**: 식별자가 예상되는 위치에 다른 토큰이 옴

**영향받는 파일**:
- ColumnGroupEditor.tsx: line 115
- ComboBoxEditor.tsx: lines 367, 369
- ListBoxItemEditor.tsx: line 275

**오류 코드**: TS1003

**원인**: JSX 구조 깨짐으로 인한 연쇄 오류

---

### 7. Closing Tag Expected 오류 (2개)

**패턴**: JSX fragment 또는 div의 닫는 태그 누락

**영향받는 파일**:
- ComboBoxEditor.tsx: line 372

**오류 코드**: TS1005

---

## 🎯 우선순위별 수정 계획

### Priority 1: Critical (1개) 🔴

**FieldEditor.tsx - Import 구문 오류**
- **파일**: `src/builder/panels/properties/editors/FieldEditor.tsx`
- **라인**: 6
- **수정**: 쉼표 위치 조정

```diff
- , PropertySection} from '../../common';
+   PropertySection } from '../../common';
```

---

### Priority 2: High (12개) 🟠

**PropertySection 태그 불일치**

각 파일에서 불필요한 `</PropertySection>` 닫는 태그 제거:

1. **BreadcrumbsEditor.tsx:82**
2. **CheckboxGroupEditor.tsx:168**
3. **ColumnGroupEditor.tsx:40**
4. **GridListEditor.tsx:162** (+ Fragment 오류)
5. **ListBoxEditor.tsx:147**
6. **ListBoxItemEditor.tsx:129**
7. **RadioGroupEditor.tsx:138**
8. **SelectEditor.tsx:134**
9. **TagGroupEditor.tsx:113**
10. **ToggleButtonGroupEditor.tsx:116**
11. **ComboBoxEditor.tsx:170**

**수정 방법**:
- 각 파일의 해당 라인에서 `</PropertySection>` 제거
- 또는 적절한 `<PropertySection title="...">` 여는 태그 추가

---

### Priority 3: Medium (37개) 🟡

**JSX 구조 정리**

나머지 JSX fragment, div 태그, 연쇄 오류들을 수정:

- **BreadcrumbsEditor.tsx**: 2개 (lines 92, 93)
- **CheckboxGroupEditor.tsx**: 2개 (lines 179, 180)
- **ColumnGroupEditor.tsx**: 5개 (lines 40, 43, 95, 115, 116)
- **ComboBoxEditor.tsx**: 9개 (lines 171, 172, 176, 188, 367, 369, 371, 372)
- **GridListEditor.tsx**: 1개 (line 163)
- **ListBoxEditor.tsx**: 2개 (lines 158, 159)
- **ListBoxItemEditor.tsx**: 4개 (lines 130, 131, 147, 227, 275)
- **RadioGroupEditor.tsx**: 2개 (lines 149, 150)
- **SelectEditor.tsx**: 2개 (lines 145, 146)
- **TableEditor.tsx**: 3개 (lines 419, 535, 582)
- **TagGroupEditor.tsx**: 2개 (lines 123, 124)
- **ToggleButtonGroupEditor.tsx**: 2개 (lines 127, 128)

**수정 방법**:
1. JSX fragment 닫는 태그 `</>` 추가
2. `div` 태그 균형 맞추기
3. 조건부 렌더링에서 괄호 확인

---

## 🛠️ 수정 가이드

### 1. FieldEditor.tsx (가장 간단)

```diff
import {
  PropertyInput,
  PropertySelect,
  PropertySwitch,
  PropertyCustomId,
- , PropertySection} from '../../common';
+   PropertySection } from '../../common';
```

---

### 2. 일반적인 PropertySection 패턴

대부분의 파일에서 동일한 패턴:

```tsx
// ❌ BEFORE (오류)
return (
    <>
        <div className="properties-aria">
            <PropertyInput ... />
        </PropertySection>  {/* 여는 태그 없음 */}

        <div className='tab-actions'>
            <button>Back</button>
        </div>
    </div>  {/* Fragment 닫는 태그 없음 */}
);

// ✅ AFTER (수정)
return (
    <>
        <div className="properties-aria">
            <PropertyInput ... />
        </div>  {/* PropertySection → div 또는 제거 */}

        <div className='tab-actions'>
            <button>Back</button>
        </div>
    </>  {/* Fragment 닫는 태그 추가 */}
);
```

---

### 3. 자동화된 수정 스크립트

각 파일별로 수동 수정이 필요하지만, 패턴이 반복되므로 다음 순서로 진행:

1. **FieldEditor.tsx** - Import 수정 (1분)
2. **나머지 12개 파일** - PropertySection 제거 (각 2-3분)
3. **JSX 구조 정리** - Fragment 및 div 태그 균형 (각 5-10분)

**예상 소요 시간**: 2-3시간

---

## 📝 검증 방법

수정 후 다음 명령어로 검증:

```bash
# TypeScript 타입 체크
npx tsc --project tsconfig.app.json --noEmit

# 빌드 테스트
npm run build

# 개발 서버 실행 테스트
npm run dev
```

---

## 🔗 관련 문서

- [CLAUDE.md](../CLAUDE.md) - TypeScript 코딩 규칙
- [CHANGELOG.md](./CHANGELOG.md) - 프로젝트 변경 이력

---

## 📌 참고사항

### TypeScript 설정

현재 프로젝트의 TypeScript 설정 (`tsconfig.json`):

```json
{
  "compilerOptions": {
    "strict": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- **strict 모드**: 모든 엄격한 타입 체크 활성화
- 라이브러리 업데이트로 JSX 구문 검사가 더 엄격해짐

### 향후 예방 방법

1. **ESLint 규칙 추가**: JSX 구조 검증
2. **Pre-commit Hook**: TypeScript 체크 자동화
3. **코드 리뷰**: JSX 태그 균형 확인

---

**마지막 업데이트**: 2025-11-14
**분석자**: Claude Code
