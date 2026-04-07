# ADR-031: Card 컴포넌트 React Spectrum S2 마이그레이션

## Status

Accepted (2026-03-09)

- Phase 1 완료 (2026-03-09): Variant 통일 + normalizeCardVariant() 하위 호환
- Phase 2 완료 (2026-03-09): CardPreview + CardFooter 서브컴포넌트 도입
- Phase 3 완료 (2026-03-09): cardType prop (asset/user/product) + CSS 변형 + CollectionCardPreview

## Context

### 문제 정의

composition의 Card 컴포넌트는 초기 구현 시 React Aria 기반으로 자체 설계되었다. 이후 ADR-022/023에서 S2 토큰/variant 체계로 전환했으나, **Spec(S2 네이밍)과 React/CSS(레거시 네이밍)가 불일치**하며, S2의 핵심 설계 패턴(슬롯 기반 컴포지션, Card 변형, CardPreview)이 미도입 상태다.

### 현재 상태 (전수 조사 기준)

| 영역                      | 문제                                                                                                                        |    심각도    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- | :----------: |
| **Variant 네이밍**        | Spec(`primary/secondary/tertiary`) ↔ React/CSS(`default/elevated/outlined`) ↔ Editor(`filled/elevated/outlined`) 3중 불일치 | **CRITICAL** |
| **CardPreview**           | S2의 이미지/일러스트 미리보기 컴포넌트 미구현 — `preview` string prop만 존재                                                |   **HIGH**   |
| **Footer**                | `<Footer>` 구조적 자식 미구현 — `footer` string prop만 존재                                                                 |   **HIGH**   |
| **Card 변형**             | UserCard, ProductCard, AssetCard 특화 변형 미구현                                                                           |  **MEDIUM**  |
| **CollectionCardPreview** | 다중 이미지 grid preview (1 hero + 3 small) 미구현                                                                          |  **MEDIUM**  |
| **S2 Props**              | `onAction`, `textValue`, `download` 누락                                                                                    |   **LOW**    |

### Variant 불일치 상세

| 소스            | 파일                         | 값                                                                                     |
| --------------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| Spec (S2)       | `Card.spec.ts`               | `primary` / `secondary` / `tertiary` / `quiet`                                         |
| TypeScript 타입 | `componentVariants.types.ts` | `default` / `outlined` / `elevated`                                                    |
| CSS 셀렉터      | `Card.css`                   | `[data-variant="default"]` / `[data-variant="outlined"]` / `[data-variant="elevated"]` |
| Property Editor | `CardEditor.tsx`             | `filled` / `elevated` / `outlined`                                                     |
| Preview 렌더러  | `LayoutRenderers.tsx`        | `default` / `elevated` / `outlined`                                                    |

> **Editor에서 `filled` 선택 시 CSS `[data-variant="filled"]` 셀렉터 없음 → 스타일 미적용 버그**

### React Spectrum S2 Card 구조

```tsx
// S2 기본 패턴
<Card variant="primary" size="M" density="regular">
  <CardPreview>
    <Image src="..." alt="..." />
  </CardPreview>
  <Content>
    <Text slot="title">Title</Text>
    <ActionMenu />
    <Text slot="description">Description</Text>
  </Content>
  <Footer>
    <StatusLight variant="positive">Published</StatusLight>
  </Footer>
</Card>
```

**S2 Card 변형:**

| 변형          | 용도      | 고유 구조                                                                     |
| ------------- | --------- | ----------------------------------------------------------------------------- |
| `Card`        | 범용 카드 | CardPreview + Content + Footer                                                |
| `AssetCard`   | 파일/에셋 | CardPreview(Image/Illustration) + Content                                     |
| `UserCard`    | 프로필    | CardPreview + Avatar + Content + Footer                                       |
| `ProductCard` | 상품      | CardPreview(slot="preview") + Image(slot="thumbnail") + Content + Footer(CTA) |

### composition 현재 구조

```
Card (parent)
├── CardHeader        → 투명 div 컨테이너
│   └── Heading       → 제목 텍스트
└── CardContent       → 투명 div 컨테이너
    └── Description   → 설명 텍스트
```

**누락:**

- `CardPreview` (이미지/미디어 영역)
- `CardFooter` (하단 액션 영역)
- Card 변형 (UserCard, ProductCard 등)
- Content 슬롯 패턴 (`slot="title"`, `slot="description"`)

### Hard Constraints

- 기존 Spec/Factory/Renderer/CSS 4계층 아키텍처 유지
- S2 토큰 체계(ADR-022) 준수
- Skia 캔버스 렌더링 60fps 유지
- Taffy WASM 레이아웃 엔진 호환
- 기존 Card 데이터 하위 호환 (variant 매핑 필수)
- COMPLEX_COMPONENT_TAGS 계약 유지 (Card 이미 등록)
- Compositional child 패턴 유지 (CardHeader/CardContent 기존 구조)

### 외부 리서치: React Spectrum S2 Card 문서 분석

> 출처: `.claude/skills/react-spectrum-s2/references/components/Card.md`

**1. 컴포지셔널 슬롯 패턴**

S2 Card는 고정 자식이 아닌 **슬롯 기반 컴포지션**으로 구성된다:

- `<CardPreview>` — 이미지/일러스트/비디오 미리보기 영역
- `<Content>` — `slot="title"` + `slot="description"` 텍스트 슬롯 + ActionMenu
- `<Footer>` — StatusLight, Button, Badge 등 자유 배치

composition의 구조적 자식 모드(CardHeader/CardContent)와 유사하지만, S2는 `slot` 속성으로 역할을 명시하는 점이 다르다. composition에서는 태그 이름(`CardHeader`, `CardContent`)이 역할을 대체하므로 slot 없이도 동일 구조 표현 가능.

**2. 4가지 Card 변형 (별도 컴포넌트)**

| S2 컴포넌트   | 고유 구조                          | composition 대응 전략                   |
| ------------- | ---------------------------------- | --------------------------------------- |
| `Card`        | CardPreview + Content + Footer     | 기존 Card 확장 (Phase 2)                |
| `AssetCard`   | CardPreview + Content (파일 특화)  | Card + `cardType: "asset"` prop         |
| `UserCard`    | CardPreview + Avatar + Content     | Card + `cardType: "user"` + Avatar 자식 |
| `ProductCard` | dual-image + Content + Footer(CTA) | Card + `cardType: "product"` prop       |

> **설계 결정**: 별도 태그(`AssetCard`, `UserCard`)로 분리하지 않고, 기존 `Card` 태그에 `cardType` prop을 추가하여 Spec/CSS 분기. 이유: Factory/Renderer/Editor 중복 최소화 + 기존 CardView 호환.

**3. CollectionCardPreview + Gallery**

- `CollectionCardPreview`: 최대 4개 이미지를 1 hero + 3 small grid로 자동 배치. composition에서는 CardPreview 내 Image children 개수에 따라 CSS Grid 레이아웃 전환으로 구현.
- Gallery: Content 없이 CardPreview만 표시. `variant: "quiet"` + CardView `layout: "waterfall"` 조합.

**4. S2 Card Props API**

- `variant`: `"primary" | "secondary" | "tertiary" | "quiet"` (기본 `"primary"`)
- `size`: `"XS" | "S" | "M" | "L" | "XL"` (기본 `"M"`)
- `density`: `"compact" | "regular" | "spacious"` (기본 `"regular"`)
- 이벤트: `onAction`, `onPress`, `onPressChange`, `onPressStart`, `onPressEnd`, `onPressUp`
- 링크: `href`, `target`, `rel`, `download`, `ping`, `referrerPolicy`, `hrefLang`, `routerOptions`
- 접근성: `textValue`, `id`, `isDisabled`
- Skeleton: `<Skeleton isLoading>` 래퍼 패턴 — Phase 3 이후 검토

---

## Alternatives Considered

### 대안 A: 전체 일괄 마이그레이션

- 설명: Variant 통일 + CardPreview/Footer + Card 변형 + S2 Props를 한 번에 구현
- 위험:
  - 기술: **H** — 기존 Card 데이터 마이그레이션 + 신규 서브컴포넌트 동시 처리
  - 성능: **L** — 서브컴포넌트 추가 정도
  - 유지보수: **H** — 변경 범위 과대 (Spec + React + CSS + Factory + Renderer + Editor + Publish)
  - 마이그레이션: **H** — 기존 프로젝트의 Card variant 값 일괄 전환 필요

### 대안 B: 3-Phase 점진 마이그레이션 (안→밖)

- 설명: Phase 1(Variant 통일 + 버그 수정) → Phase 2(CardPreview + CardFooter 서브컴포넌트) → Phase 3(Card 변형 + 고급 기능)
- 위험:
  - 기술: **L** — Phase별 독립 검증, 기존 데이터 호환 레이어 포함
  - 성능: **L** — 단계별 추가
  - 유지보수: **L** — Phase별 3~5파일 규모
  - 마이그레이션: **M** — Phase 1에서 variant 매핑 호환 레이어 필요

### 대안 C: Variant 통일만 수행, 구조 변경 보류

- 설명: CRITICAL 이슈(variant 불일치 버그)만 수정, 나머지 S2 정합성은 보류
- 위험:
  - 기술: **L** — 최소 변경
  - 성능: **L** — 변경 없음
  - 유지보수: **M** — S2 정합성 부채 유지
  - 마이그레이션: **L** — variant 값만 변경

### Risk Threshold Check

대안 A가 **HIGH 위험 3개** (기술/유지보수/마이그레이션) → Step 4 트리거.

- **HIGH ≥ 2개 조건 충족** → 대안 분할/추가 생성 필수
- 대안 B: 대안 A의 범위를 3-Phase로 분할하여 각 Phase의 위험을 LOW~MEDIUM으로 저감
- 대안 C: CRITICAL 이슈만 수정하는 최소 범위로 위험 최소화

## Decision

**대안 B: 3-Phase 점진 마이그레이션** 채택

위험 수용 근거: Phase 1에서 CRITICAL 버그(variant 불일치)를 즉시 해소하고, Phase 2~3에서 S2 구조를 점진 도입. 대안 A의 HIGH 위험(기술/유지보수/마이그레이션)을 단계 분할로 해소. 대안 C는 S2 정합성 부채가 누적되어 향후 비용 증가.

---

## Gates

| Gate | 시점            | 통과 조건                              | 실패 시 대안                                                 |
| :--: | --------------- | -------------------------------------- | ------------------------------------------------------------ |
|  G1  | Phase 1 완료 후 | 기존 프로젝트 Card variant 정상 렌더링 | `normalizeCardVariant()` 매핑 범위 확대 또는 DB 마이그레이션 |
|  G2  | Phase 1 완료 후 | `pnpm type-check` 통과                 | variant 타입 union 확장 (레거시 값 포함)                     |
|  G3  | Phase 2 완료 후 | Canvas FPS 60fps 유지                  | CardPreview Spec shapes 최적화 또는 Phase 3 보류             |
|  G4  | Phase 2 완료 후 | CardHeader/CardContent 기존 구조 정상  | CardPreview/CardFooter를 opt-in으로 전환 (Factory 미포함)    |

---

## 구현 계획

### Phase 1: Variant 통일 + 버그 수정 (CRITICAL)

> **목적**: 3중 variant 불일치 해소, Editor `filled` 버그 수정

#### 1-1. Variant 네이밍 S2 통일

S2 기준 `primary`/`secondary`/`tertiary`/`quiet`로 통일:

| S2 (목표)   | 현재 React/CSS | 현재 Editor | 시각적 스타일        |
| ----------- | -------------- | ----------- | -------------------- |
| `primary`   | `default`      | `filled`    | 배경 + 미니멀 border |
| `secondary` | `outlined`     | `outlined`  | 테두리 강조          |
| `tertiary`  | `elevated`     | `elevated`  | 흰색 배경 + 그림자   |
| `quiet`     | `quiet`        | (없음)      | 투명 배경            |

**변경 대상 파일:**

| #   | 파일                         | 변경 내용                                                                                                  |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | `componentVariants.types.ts` | `CardVariant` 타입을 `"primary" \| "secondary" \| "tertiary" \| "quiet"`로 변경                            |
| 2   | `Card.css`                   | `[data-variant="default"]` → `[data-variant="primary"]`, `outlined` → `secondary`, `elevated` → `tertiary` |
| 3   | `Card.tsx`                   | variant prop 기본값 `"default"` → `"primary"`, 내부 로직 동기화                                            |
| 4   | `CardEditor.tsx`             | 옵션 `filled/elevated/outlined` → `primary/secondary/tertiary/quiet`                                       |
| 5   | `LayoutRenderers.tsx`        | `renderCard` variant 캐스팅 `"default"` → `"primary"` 등                                                   |
| 6   | `LayoutComponents.ts`        | Factory `variant: "default"` → `"primary"`                                                                 |

#### 1-2. 하위 호환 매핑

기존 프로젝트 데이터에 `variant: "default"` 등 레거시 값이 저장되어 있으므로 런타임 매핑 추가:

```typescript
// Card.tsx 또는 공유 유틸
function normalizeCardVariant(variant?: string): CardVariant {
  const LEGACY_MAP: Record<string, CardVariant> = {
    default: "primary",
    filled: "primary",
    outlined: "secondary",
    elevated: "tertiary",
  };
  return LEGACY_MAP[variant ?? ""] ?? (variant as CardVariant) ?? "primary";
}
```

#### 1-3. S2 누락 Props 추가

| Props       | 타입                | 용도                                    |
| ----------- | ------------------- | --------------------------------------- |
| `onAction`  | `() => void`        | 카드 액션 핸들러 (CardView 내에서 사용) |
| `textValue` | `string`            | typeahead 검색용 텍스트 표현            |
| `download`  | `string \| boolean` | 파일 다운로드 속성 (href와 함께)        |

**Phase 1 변경 파일 수**: ~8파일

---

### Phase 2: CardPreview + CardFooter 서브컴포넌트 도입

> **목적**: S2의 핵심 구조 패턴(이미지 미리보기 + 하단 액션) 도입

#### 2-1. CardPreview 컴포넌트

```
Card
├── CardPreview (신규)      → 이미지/일러스트 영역
│   └── Image / Illustration
├── CardHeader (기존 유지)
│   └── Heading
└── CardContent (기존 유지)
    └── Description
```

**구현 체크리스트:**

| #   | 작업                          | 파일                                                                     |
| --- | ----------------------------- | ------------------------------------------------------------------------ |
| 1   | `CardPreview` Spec 정의       | `packages/specs/src/components/CardPreview.spec.ts`                      |
| 2   | Spec export                   | `packages/specs/src/components/index.ts` + `packages/specs/src/index.ts` |
| 3   | TAG_SPEC_MAP 등록             | `ElementSprite.tsx`                                                      |
| 4   | Preview 렌더러                | `LayoutRenderers.tsx` `renderCardPreview`                                |
| 5   | Publish 레지스트리            | `ComponentRegistry.tsx`                                                  |
| 6   | Factory 업데이트              | `LayoutComponents.ts` `createCardDefinition()`                           |
| 7   | CSS 스타일                    | `Card.css` `.card-preview` 섹션                                          |
| 8   | child-composition.md 업데이트 | `CardPreviewSpec` 등록                                                   |

**CardPreview Props:**

| Props         | 타입                                              | 기본값   | 설명                                  |
| ------------- | ------------------------------------------------- | -------- | ------------------------------------- |
| `aspectRatio` | `"square" \| "landscape" \| "portrait" \| "auto"` | `"auto"` | 미리보기 영역 비율                    |
| `children`    | `ReactNode`                                       | —        | Image, Illustration, Badge overlay 등 |

#### 2-2. CardFooter 컴포넌트

```
Card
├── CardPreview (Phase 2-1)
├── CardHeader (기존)
├── CardContent (기존)
└── CardFooter (신규)     → 하단 액션/상태 영역
    └── StatusLight / Button / Badge 등
```

**CardFooter Props:**

| Props       | 타입                                              | 설명                                    |
| ----------- | ------------------------------------------------- | --------------------------------------- |
| `children`  | `ReactNode`                                       | StatusLight, Button, Badge 등 자유 배치 |
| `alignment` | `"start" \| "center" \| "end" \| "space-between"` | 정렬                                    |

**구현 체크리스트**: CardPreview와 동일 패턴 (Spec + TAG_SPEC_MAP + Renderer + Publish + Factory + CSS)

#### 2-3. Factory 업데이트

`createCardDefinition()` 변경:

```
Card (parent)
├── CardPreview (신규, order_num: 1)
│   └── Image (placeholder)
├── CardHeader (기존, order_num: 2)
│   └── Heading
├── CardContent (기존, order_num: 3)
│   └── Description
└── CardFooter (신규, order_num: 4)
    └── (빈 상태 — 사용자가 추가)
```

> **하위 호환**: 기존 CardHeader/CardContent만 있는 Card 데이터는 정상 동작 유지. CardPreview/CardFooter 없으면 해당 영역 미렌더링.

#### 2-4. Card.tsx 구조 확장

기존 `structuralChildren` 모드에서 CardPreview/CardFooter 인식 추가:

```typescript
const hasPreview = allChildren.some((c) => c.tag === "CardPreview");
const hasFooter = allChildren.some((c) => c.tag === "CardFooter");
```

**Phase 2 변경 파일 수**: ~15파일 (신규 2 Spec + 기존 파일 업데이트)

---

### Phase 3: Card 변형 + 고급 기능

> **목적**: S2 특화 카드 변형 도입으로 디자인 시스템 완성도 향상

#### 3-1. AssetCard

파일/에셋 표시 특화 카드. 기존 Card의 `asset`/`assetSrc` props를 독립 컴포넌트로 분리.

```tsx
<AssetCard>
  <CardPreview>
    <Image src="photo.jpg" /> {/* 또는 <Illustration /> */}
  </CardPreview>
  <Content>
    <Text slot="title">photo.jpg</Text>
    <ActionMenu />
    <Text slot="description">2.4 MB</Text>
  </Content>
</AssetCard>
```

**구현**: Card Spec 재활용 + `asset` prop 특화 로직 + Factory 정의

#### 3-2. UserCard

프로필/사용자 표시 특화 카드. Avatar 포함.

```tsx
<UserCard>
  <CardPreview>
    <Image src="cover.jpg" />
  </CardPreview>
  <Avatar src="avatar.jpg" />
  <Content>
    <Text slot="title">User Name</Text>
    <Text slot="description">Role</Text>
  </Content>
</UserCard>
```

**구현**: Card Spec 확장 + Avatar 자식 위치 특수 처리 + Factory 정의

#### 3-3. ProductCard

상품 표시 특화 카드. Thumbnail + CTA.

```tsx
<ProductCard>
  <CardPreview>
    <Image slot="preview" src="product.jpg" />
  </CardPreview>
  <Image slot="thumbnail" src="brand-logo.png" />
  <Content>
    <Text slot="title">Product Name</Text>
    <Text slot="description">$99.99</Text>
  </Content>
  <Footer>
    <Button variant="accent">Buy Now</Button>
  </Footer>
</ProductCard>
```

**구현**: Card Spec 확장 + dual-image slot + Factory 정의

#### 3-4. CollectionCardPreview

다중 이미지 갤러리 미리보기 (1 hero + 3 small grid).

**구현**: CardPreview 확장 — children Image 개수에 따라 레이아웃 자동 전환

#### 3-5. Gallery 카드 레이아웃

Content 없이 preview만 표시하는 카드 (waterfall/masonry 레이아웃).

**구현**: CardView `layout: "waterfall"` + Card `variant: "quiet"` 조합

**Phase 3 변경 파일 수**: ~20파일 (신규 3 Spec + Factory + Renderer + CSS + Editor)

---

## Phase별 작업량 추정

| Phase    |             컴포넌트 수              | 파일 변경 | 핵심 작업                                |
| -------- | :----------------------------------: | :-------: | ---------------------------------------- |
| **1**    |            0 (기존 수정)             |    ~8     | Variant 통일 + 하위 호환 매핑 + S2 Props |
| **2**    |     2 (CardPreview, CardFooter)      |    ~15    | 서브컴포넌트 Spec/Renderer/Factory/CSS   |
| **3**    | 3 (AssetCard, UserCard, ProductCard) |    ~20    | 특화 카드 변형 + Gallery 레이아웃        |
| **합계** |                **5**                 |  **~43**  |                                          |

---

## 컴포넌트별 구현 체크리스트

### Phase 1 체크리스트

```
[ ] 1. componentVariants.types.ts CardVariant 타입 변경
[ ] 2. Card.css variant 셀렉터 리네이밍
[ ] 3. Card.tsx variant 기본값 + normalizeCardVariant 매핑
[ ] 4. CardEditor.tsx variant 옵션 S2 통일
[ ] 5. LayoutRenderers.tsx renderCard variant 캐스팅
[ ] 6. LayoutComponents.ts Factory variant 기본값
[ ] 7. Card.spec.ts 기존 variant 정합성 확인
[ ] 8. pnpm type-check 통과
```

### Phase 2~3 체크리스트 (서브컴포넌트/변형 공통)

```
[ ] 1. Spec 정의: packages/specs/src/components/{Name}.spec.ts
[ ] 2. Spec export: packages/specs/src/components/index.ts + packages/specs/src/index.ts
[ ] 3. pnpm build:specs
[ ] 4. TAG_SPEC_MAP 등록: ElementSprite.tsx
[ ] 5. Factory 정의/업데이트: LayoutComponents.ts
[ ] 6. Preview 렌더러: LayoutRenderers.tsx + rendererMap
[ ] 7. CSS 스타일: Card.css 확장
[ ] 8. Publish 레지스트리: ComponentRegistry.tsx
[ ] 9. Property Editor 업데이트: CardEditor.tsx
[ ] 10. child-composition.md 업데이트
[ ] 11. pnpm type-check 통과
```

---

## Consequences

### Positive

- Variant 3중 불일치 해소 → Editor `filled` 스타일 미적용 버그 수정
- S2 Card 구조(CardPreview/Content/Footer) 도입으로 디자인 시스템 완성도 향상
- 노코드 빌더에서 실무 카드 패턴(상품 카드, 프로필 카드, 에셋 카드) 직접 지원
- 기존 CardHeader/CardContent 구조와 하위 호환 유지

### Negative

- Phase 1의 variant 리네이밍은 기존 프로젝트 데이터에 런타임 매핑 필요 (영구적 호환 레이어)
- Phase 2~3에서 Card 서브컴포넌트 추가로 복잡도 증가 (5개 태그 → 최대 10개 태그)
- Card 변형(AssetCard, UserCard, ProductCard)은 각각 별도 Spec/Factory 필요 — 유지보수 비용 증가
- S2의 slot 기반 Content 패턴은 composition의 구조적 자식 모드와 설계 철학이 다름 — 완전한 1:1 매핑 불가

---

## 참조

| 문서                   | 경로                                                             |
| ---------------------- | ---------------------------------------------------------------- |
| React Spectrum S2 Card | `.claude/skills/react-spectrum-s2/references/components/Card.md` |
| 현재 Card Spec         | `packages/specs/src/components/Card.spec.ts`                     |
| 현재 Card React        | `packages/shared/src/components/Card.tsx`                        |
| 현재 Card CSS          | `packages/shared/src/components/styles/Card.css`                 |
| S2 색상 토큰           | `docs/adr/completed/022-s2-color-token-migration.md`             |
| S2 Variant Props       | `docs/adr/completed/023-s2-component-variant-props.md`           |
| ADR-030 컴포넌트 체계  | `docs/adr/completed/030-s2-spectrum-only-components.md`          |
| CSS 토큰 규칙          | `.claude/rules/css-tokens.md`                                    |
