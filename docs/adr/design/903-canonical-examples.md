# ADR-903 Canonical Format Examples

> 본 문서는 [ADR-903](../903-ref-descendants-slot-composition-format-migration-plan.md)의 P0 산출물이다.
> canonical document format의 전형적인 4가지 구성 패턴을 JSON 예제로 보여준다.
> 예제 JSON은 [breakdown 문서](903-ref-descendants-slot-composition-format-migration-plan-breakdown.md)의
> §Canonical 포맷 초안을 정확히 재인용한 것이다.

## 1. 재사용 가능한 컴포넌트 정의 (reusable 원본)

```json
{
  "id": "round-button",
  "type": "frame",
  "reusable": true,
  "name": "Round Button",
  "fill": "#333333",
  "clip": true,
  "children": [
    {
      "id": "label",
      "type": "text",
      "content": "Submit",
      "fill": "#FFFFFF"
    }
  ]
}
```

**설명**:

- `reusable: true` — 이 노드가 재사용 가능한 컴포넌트/레이아웃 원본임을 선언한다. legacy `componentRole: "master"` 대체.
- `name` — 모든 노드에 사용자 표시 이름을 허용한다. legacy `componentName` (reusable 전용) 대체. LayerTree/DesignKit 카탈로그 표시에 사용.
- `clip: true` — Frame 전용 필드. children이 frame 경계를 넘으면 clip. composition의 `overflow: hidden`과 매핑.
- `id` 형식 제약: 노드 id에 slash (`/`) 포함 금지. slash는 `descendants` key의 경로 구분자로만 해석됨.
- 자식 `label`의 `id: "label"` — 이 id가 이후 `descendants` key에서 경로 구성 요소로 사용된다.

## 2. ref 인스턴스 + descendants 속성 오버라이드 (mode A)

```json
{
  "id": "danger-button",
  "type": "ref",
  "ref": "round-button",
  "fill": "#D92D20",
  "descendants": {
    "label": {
      "content": "Delete",
      "fill": "#FFFFFF"
    }
  }
}
```

**설명**:

- `type: "ref"` — reusable 노드의 인스턴스임을 선언한다. legacy `componentRole: "instance"` + `masterId` 조합 대체.
- `ref: "round-button"` — 인스턴스가 참조하는 원본 노드 id. legacy `masterId` 대체.
- 인스턴스 root level의 `fill: "#D92D20"` — 원본의 같은 필드 위에 override. legacy `overrides` 필드 대체.
- `descendants.label` — stable id path로 자손 노드를 정밀 지정. `label`은 원본 `round-button`의 직접 자식 id.
  - **`id`/`type`/`children` 키가 전부 없음 → 속성 patch 모드 (mode A)**. 제공된 속성(`content`, `fill`)만 원본 위에 merge.
  - pencil.dev 공식: _"only the customized properties are present. The `id`, `type` and `children` properties must not be specified"_
- 중첩 경로 예: `"ok-button/label"` — `ok-button` 자식의 `label` 자손을 의미. 이처럼 slash로 depth를 표현한다 (노드 id 자체에 slash 포함 금지와 구분).

## 3. slot 선언이 있는 레이아웃/컨테이너

```json
{
  "id": "app-shell",
  "type": "frame",
  "reusable": true,
  "name": "App Shell Layout",
  "clip": true,
  "children": [
    {
      "id": "header",
      "type": "ref",
      "ref": "header-shell"
    },
    {
      "id": "left",
      "type": "ref",
      "ref": "left-nav"
    },
    {
      "id": "main",
      "type": "frame",
      "placeholder": true,
      "slot": ["dashboard-hero", "table-card", "icon-button"]
    }
  ]
}
```

**설명**:

- `slot: ["dashboard-hero", "table-card", "icon-button"]` — Frame 전용 필드. 이 컨테이너가 "교체 가능한 컨텐츠 홀더"임을 선언한다. legacy `tag="Slot"` + `slot_name` 특수 노드 대체.
  - 배열의 각 원소는 "이 slot에 삽입 가능한 추천 reusable 컴포넌트 ID". 에디터가 원클릭 삽입 UI를 제공할 수 있다.
  - `slot: false`로 설정하면 slot 기능 비활성화.
- `placeholder: true` — Frame 전용 필드. slot이 채워지지 않았을 때 에디터/캔버스에서 시각적 플레이스홀더를 렌더한다.
- 자식 `header`와 `left`는 각각 다른 reusable 노드의 `ref` 인스턴스. app shell은 이들을 레이아웃 구조로 조합.
- `id: "main"` — 이 id가 이후 인스턴스의 `descendants["main"]` key로 참조되어 slot 내용 채우기에 사용된다.

## 4. page 인스턴스에서 slot 영역 채우기 (mode C + mode A 조합)

```json
{
  "id": "dashboard-page",
  "type": "ref",
  "ref": "app-shell",
  "descendants": {
    "header/title": {
      "content": "Dashboard"
    },
    "main": {
      "children": [
        {
          "id": "hero",
          "type": "ref",
          "ref": "dashboard-hero"
        },
        {
          "id": "table",
          "type": "ref",
          "ref": "table-card"
        }
      ]
    }
  }
}
```

**설명**:

- `type: "ref"`, `ref: "app-shell"` — `app-shell` 레이아웃 원본의 인스턴스. legacy `Page.layout_id` 외래키 방식 대체.
- `descendants["main"]` — `children`만 존재하고 `type`이 없음 → **children replacement 모드 (mode C)**. `main` 프레임 자체는 유지하되 children 배열만 교체. slot 채우기가 이 모드를 사용한다.
- `descendants["header/title"]` — `id`/`type`/`children` 전부 없음 → **속성 patch 모드 (mode A)**. `header` 자식의 `title` 노드에 `content` 속성만 override.
- **mode 조합**: 하나의 인스턴스에서 서로 다른 descendants key마다 다른 mode 사용 가능. 단, 하나의 key 내에서 복수 mode 조건을 동시에 만족하면 resolver가 error 처리 (silent merge 금지).

## 5. 문서 root (version/themes/variables/imports 포함)

```json
{
  "version": "composition-1.0",
  "themes": {
    "mode": ["light", "dark"],
    "tint": ["blue", "purple", "green"]
  },
  "variables": {
    "primary": { "type": "color", "value": "#3B82F6" },
    "spacing-md": { "type": "number", "value": 16 }
  },
  "imports": {
    "basic-kit": "./kits/basic.pen",
    "icons": "@composition/icon-kit"
  },
  "children": []
}
```

**설명**:

- `version: "composition-1.0"` — 문서 포맷 버전. **`composition-*` 네임스페이스로 고정**. breaking change 시 major 증가 (`"composition-2.0"`), additive 변경 시 minor 증가 (`"composition-1.1"`). pencil `"2.10"` 같은 외부 네임스페이스 사용 금지 — 외부 도구가 pencil 파일로 오인하는 위험 방지.
- `themes` — ADR-021 Theme 시스템 (Tint/Dark) 투영. `mode: ["light", "dark"]` + `tint: ["blue", "purple", ...]`. 엔티티 level에서 `theme?` 필드로 축별 override 가능.
- `variables` — ADR-022 TokenRef + composition Spec preset 통합. 필드 값에서 `{ $var: "primary" }` 형태로 inline 참조. legacy `variableBindings?: string[]` 배열 필드 대체.
- `imports` — 참조형 import hook. 외부 `.pen` 또는 canonical 문서를 URL/path로 참조. import된 reusable 노드는 `ref: "basic-kit:round-button"` 형식으로 인스턴스화 가능. **P0에서는 타입 스텁만 존재, 실제 resolver/fetch는 Phase 5 이후 연기**.
  - composition 기존 `kitLoader.ts`/`kitExporter.ts`는 복사-적용 파이프라인 (snapshot JSON + `localId → new UUID` 재발급)이므로 `imports` 와 의미가 다름 — DesignKit은 별도 migration track 유지 (ADR-903 R7).
- `children` — document root의 canonical node 배열. page, reusable frame, component master 등이 이 배열에 위치.

## Descendants 3-Mode 판정 요약

|           Mode           | 판정 조건                        | 의미                                               |
| :----------------------: | -------------------------------- | -------------------------------------------------- |
|      A (속성 patch)      | `id`/`type`/`children` 전부 없음 | 기존 노드 속성 위에 제공된 속성만 merge            |
|   B (node replacement)   | `type` 존재                      | 해당 경로 노드를 완전히 새 노드 서브트리로 교체    |
| C (children replacement) | `children` 배열 있고 `type` 없음 | 부모 노드 유지, children 배열만 교체 (slot 채우기) |

- 복수 조건 충족 시 resolver가 **error 처리** (silent merge 금지). validation 단계에서 발견.
- pencil.dev 공식: mode A는 _"only the customized properties are present. The `id`, `type` and `children` properties must not be specified"_

## 금지 패턴

- **id에 slash (`/`) 포함 금지** — descendants path 파싱 모호성. `"ok-button/label"`은 ok-button의 label 자식을 가리키는 경로이며, id 자체가 slash를 포함하는 것과 구분 불가.
- **pencil primitive 10종을 canonical 노드 `type` 값으로 직접 사용 금지** — `rectangle`/`ellipse`/`line`/`polygon`/`path`/`text`/`note`/`prompt`/`context`/`icon_font` 직접 사용 금지. import adapter 경유 매핑만 허용 (예: pencil `text` → composition `Text` component).
- **`version` 필드에 pencil 네임스페이스 사용 금지** — `"2.10"` 등 pencil 버전 문자열 금지. `composition-*` 고정.
- **descendants 단일 key에서 mode 복합 충족 금지** — mode A/B/C는 상호 배제. `type`과 `children`을 동시에 지정하거나, `id`/`type` 없이 `children`만 있는데 다른 속성도 함께 지정하는 것은 mode B/C 혼용 → resolver error.
- **`imports`를 DesignKit 복사-적용 파이프라인과 혼동 금지** — `imports`는 참조형 hook (P5 이후 구현). DesignKit(`kitLoader`/`kitExporter`)은 별도 track.
