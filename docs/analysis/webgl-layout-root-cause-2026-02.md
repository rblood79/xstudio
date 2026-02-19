# WebGL 레이아웃 엔진 근본 원인 재분석 (main 기준, 2026-02)

## TL;DR

main 브랜치 코드 기준으로, 특정 버튼 사례를 넘어 **전반적인 레이아웃 불일치가 구조적으로 발생할 수 있는 지점**은 아래 7가지다.

1. **Taffy 입력 공간을 항상 Definite로 고정**해 `auto` 컨텍스트가 사라짐
2. **Flex/Grid 부모 높이를 항상 강제 주입**해 cross-axis/stretch 결과가 왜곡됨
3. **CSS 단위 해석이 px 중심으로 축소**되어 `rem/em/vh/vw/%/calc/var()` 계열이 오차를 유발
4. **Flex 2-pass 재계산 트리거 조건의 비교 기준이 부정확**해 과/미재계산 발생
5. **Block 엔진 inline-run 구현이 실제 CSS inline formatting context와 다름**
6. **`width/height: auto, fit-content` 처리 경로가 엔진별로 분기되어 일관성이 깨짐**
7. **부모 `display`/`flex-direction` 변화 시 자식 배치 규칙이 blockification/엔진경계에서 틀어질 수 있음**

---


## 컨테이너-자식 상관관계 관점의 핵심 원인 (요약)

현재 버그가 많은 이유는 개별 속성 구현 미스보다, **컨테이너가 자식을 배치할 때 지켜야 할 CSS 불변식(invariant)이 엔진 경계에서 깨지기 때문**이다.

- **불변식 A: 부모의 available space 모델과 자식의 sizing 모델은 동일한 기준이어야 함**
  - 실제 구현은 부모는 Definite로 고정되고, 자식은 auto/intrinsic 추정을 섞어서 계산된다.
- **불변식 B: 부모 display 변경 전후에도 자식의 의미(display semantics)가 보존되어야 함**
  - 실제 구현은 blockification + 엔진 교체로 자식의 내부/외부 display 의미가 달라질 수 있다.
- **불변식 C: auto/fit-content/min-content는 엔진이 달라도 동일 규칙으로 해석되어야 함**
  - 실제 구현은 Taffy/Dropflow 경로마다 해석 시점·방식이 다르다.

즉, `display:flex`, `display:block` 자체가 문제라기보다,
**"부모 배치 규칙"과 "자식 크기 결정 규칙"이 동일한 좌표계에서 계산되지 않는 것**이 근본 원인이다.

---

## 1) AvailableSpace를 항상 Definite로 주는 계약 문제

### 관찰
- WASM 브리지에서 `compute_layout` 호출 시 width/height를 모두 `AvailableSpace::Definite`로 고정한다.
- 즉, 부모가 CSS적으로 `height:auto`인 상황이라도 레이아웃 계산 관점에서는 항상 "확정된 공간"이 된다.

### 영향
- 콘텐츠 기반으로 늘어나야 할 컨테이너가 제한된 공간 안에서 배치되어,
  줄바꿈, stretch, overflow 판단이 CSS Preview와 달라질 수 있다.
- 특히 flex/grid에서 cross-axis sizing 및 min-content 계열 계산이 왜곡될 여지가 크다.

---

## 2) Flex/Grid 엔진에서 부모 height를 항상 주입하는 문제

### 관찰
- `TaffyFlexEngine`과 `TaffyGridEngine` 모두 부모 스타일에
  `parentStyle.height = availableHeight`를 강제한다.
- 이후 `computeLayout(rootHandle, availableWidth, availableHeight)`를 다시 호출한다.

### 영향
- "부모 높이 미지정(auto)" 상태가 엔진 내부에서 사실상 "고정 높이"로 변환된다.
- 기본 `align-items: stretch` 문맥에서 자식 높이가 CSS와 다르게 늘어나거나,
  반대로 텍스트 2줄 높이가 충분히 반영되지 않는 케이스가 생긴다.
- 버튼/폼 컴포넌트처럼 intrinsic height에 민감한 요소에서 오차가 체감된다.

---

## 3) CSS 단위 해석 축소(파서)로 인한 전역 오차

### 관찰
- Flex/Grid 엔진의 `parseCSSProp()`는 문자열 값에 대해 `parseFloat` 기반으로 숫자만 추출한다.
  - 예: `"2rem" -> 2`(px로 오인), `"50vh" -> 50`, `"calc(... )" -> NaN -> undefined`
- `elementToTaffyStyle` 시그니처는 `_computedStyle`를 받지만 실제 변환에 거의 활용하지 않는다.

### 영향
- 단위 변환의 기준(px 환산, viewport 기준, inherited font-size 기반 em/rem 계산)이 깨져
  동일 스타일이 iframe Preview와 WebGL에서 다르게 계산된다.
- 레이아웃 엔진 교체(Dropflow/Taffy)와 무관하게,
  "입력 스타일 정규화 계층"에서 이미 오차가 만들어지는 구조다.

---

## 4) Flex 2-pass 보정의 비교 기준 오류

### 관찰
- 2-pass 재계산 필요 여부를 판단할 때,
  `layout.width`를 "해당 자식의 1차 enrichment 기준"이 아닌 `availableWidth`(부모 너비)와 비교한다.

### 영향
- row 컨테이너에서 자식의 실제 할당 너비가 부모 너비와 다른 것은 정상인데,
  이 조건 때문에 불필요한 2-pass가 자주 발생하거나,
  반대로 필요한 케이스에서 정확한 조건을 놓칠 수 있다.
- 결과적으로 고정 폭 버튼 + 텍스트 줄바꿈 시 높이 재측정이 일관되지 않다.

---

## 5) DropflowBlockEngine의 inline-run 단순화로 인한 스펙 편차

### 관찰
- inline-block 혼합 경로(`_mixedCalculate` + `layoutInlineRun`)는
  line box/baseline/white-space/line-height 처리의 상당 부분을 단순화한다.
- 세그먼트 전환 시 `currentY` 계산이 margin collapse, line box ascender/descender,
  replaced element baseline 규칙과 완전히 일치하지 않는다.

### 영향
- "버튼 여러 개 + 중간에 block 요소 삽입 + 스타일 변경" 같은 실제 편집 플로우에서
  줄 간격, y-offset, wrapping 포인트가 CSS와 달라질 수 있다.
- 즉, Block 엔진 교체 후에도 "CSS 렌더러와 동형"이 되지 않는 이유가 남는다.

---

## 6) `width/height: auto, fit-content` 처리의 엔진 간 비일관성

### 관찰
- Taffy 경로는 `auto`를 `undefined`로 보내고,
  `fit-content/min-content/max-content`는 `enrichWithIntrinsicSize()`에서 사전 주입에 의존한다.
- Dropflow inline-run 경로의 `resolveCSSLength()`는 intrinsic 키워드/센티넬을 `0`으로 처리하는 방어 로직이 있어,
  enrichment 실패/누락 시 폭/높이가 0 근처로 붕괴될 수 있다.

### 영향
- 같은 스타일(`auto`, `fit-content`)이라도 부모 엔진(flex/grid/block)에 따라
  계산 결과가 달라질 수 있다.
- 특히 부모 display가 바뀌면서 엔진이 교체되는 순간,
  자식이 같은 속성을 갖고도 width/height 결과가 튀는 현상이 생길 수 있다.

---

## 7) 부모 display/flex-direction 변화 시 자식 배치 규칙 경계 문제

### 관찰
- 디스패처는 부모가 flex/grid일 때 자식 `display`에 blockification을 적용한다.
  (`inline -> block`, `inline-block -> block`, `inline-flex -> flex`, `inline-grid -> grid`)
- 동시에 Flex/Grid 엔진은 부모를 각각 `display: flex/grid`로 강제하고,
  자식은 해당 엔진 문맥으로 재해석된다.

### 영향
- 부모가 `block -> flex(row/column)` 또는 `flex-direction` 변경될 때,
  자식의 "원래 inline/inline-block 의도"가 blockification + 엔진 경계에서 달라져
  줄바꿈, 폭 수축(shrink), 높이 확장(stretch) 결과가 CSS 기대와 어긋날 수 있다.
- 즉, "부모 display/방향 변경 시 자식이 깨진다"는 제보와 직접 연결되는 구조다.

---

## 왜 특정 사례가 아니라 'main 전반 이슈'인가

위 문제들은 모두 **개별 컴포넌트 버그가 아니라 엔진 계약/스타일 해석 계층의 구조 문제**다.

- 입력 공간 모델(Definite vs Auto)
- 부모 크기 주입 정책
- 단위 정규화 정책
- 재계산 트리거 정책
- inline formatting 구현 수준
- intrinsic(auto/fit-content) 처리 일관성
- 부모 display 변경 시 blockification/엔진 경계 처리

따라서 Button 외에도 Badge/Tag/Chip/TextField/inline 폼 컨트롤,
그리고 flex/grid 하위의 대부분 UI 요소에서 재현 가능성이 있다.

---

## 우선순위 제안 (원인 제거 관점)

1. **브리지/엔진 계약 수정**: available height를 auto/indefinite로 전달할 수 있는 경로 확보
2. **부모 height 강제 주입 제거**: 실제 CSS 지정이 있을 때만 height 전달
3. **스타일 정규화 통합**: `cssResolver + cssValueParser`를 Taffy 입력 변환의 단일 소스로 사용
4. **intrinsic 정책 통합**: `auto/fit-content/min-content/max-content`를 엔진 공통 규칙으로 처리
5. **2-pass 기준 교정**: 자식별 1차 입력폭 대비 실제폭 비교로 변경
6. **blockification 경계 검증**: display 전환 시 자식 의도(display semantics) 보존 규칙 정의
7. **inline formatting 고도화**: line box/baseline/white-space 규칙을 Dropflow 경로와 정합

이 순서대로 진행해야 "증상 패치"가 아닌 근본 개선이 가능하다.

---

## 추가 점검: WebGL에서 CSS와 다르게 보일 가능성이 높은 항목

아래 항목은 현재 구조에서 **재현 가능성이 높은 차이 지점**이다.

### A. 컨테이너(flex/block/grid) ↔ 자식 상호작용
- `align-items: stretch` + 자식 `height:auto` 조합에서 자식 높이 과확장/과축소
- `flex-direction: row/column` 전환 시 동일 자식의 wrap 기준점 변화
- 부모 `display` 변경(block ↔ flex ↔ grid) 시 자식 `inline/inline-block` 의미 변화
- `overflow:auto/scroll`에서 콘텐츠 경계 계산과 실제 스크롤 max 불일치

### B. 크기/단위 해석
- `width/height: auto`가 엔진별로 다른 시점에 해석되어 결과 불일치
- `fit-content/min-content/max-content`가 사전 주입 실패 시 0 근처로 붕괴
- `rem/em/vh/vw/calc()/var()` 조합에서 parseFloat 기반 축약으로 오차 누적
- `min/max-width/height` 제약이 부모의 Definite 공간 강제와 충돌

### C. 자식 텍스트/인라인 포맷팅
- 고정 width + 긴 텍스트(2줄 이상)에서 실제 줄바꿈 높이와 계산 높이 차이
- baseline/middle 정렬이 line box 규칙과 달라 y-offset 누적
- inline-block 연속 배치 중간에 block 자식이 삽입될 때 line break 불연속

### D. 위치/오프셋/특수 케이스
- `position: relative` + `%` 오프셋이 0 처리되어 CSS 대비 위치 오차
- `position: absolute/fixed` 자식의 containing block 해석 차이
- grid `repeat(auto-fill/auto-fit)`와 gap 계산에서 트랙 수 차이
- margin collapse가 block 경계/세그먼트 전환에서 CSS와 다르게 적용

## 실무 권장: 버그 리포트 최소 재현 템플릿

문제 제보 시 아래 5가지를 함께 기록하면 원인 분류가 빠르다.

1. 부모 `display`, `flex-direction`, `align-items/justify-content`
2. 자식의 `width/height/min/max`와 단위(px/%/rem/calc/var)
3. 자식 텍스트 길이, `white-space`, 줄 수 변화 여부
4. 부모/자식 `position`, `overflow`, `gap`, `margin/padding`
5. 같은 트리를 iframe CSS Preview와 WebGL에서 캡처한 비교 이미지
