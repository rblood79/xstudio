# XStudio

**Visual Application Builder**

## Quick Start

```bash
# 의존성 설치 (자동으로 specs 빌드 포함)
pnpm install

# 개발 서버 실행
pnpm dev
```

### 다른 PC에서 작업한 내용 동기화 후

```bash
# Git pull 후
git pull

# 의존성 및 빌드 산출물 동기화
pnpm install  # specs 자동 빌드됨

# WASM 바인딩이 변경된 경우 (선택사항)
pnpm wasm:build
```

## Project Structure

```
xstudio/
├── apps/
│   ├── builder/     # 메인 빌더 앱 (@xstudio/builder)
│   └── publish/     # 배포 런타임 (@xstudio/publish)
├── packages/
│   ├── shared/      # 공유 타입/유틸 (@xstudio/shared)
│   └── config/      # 공유 설정 (@xstudio/config)
└── docs/            # 문서
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | 개발 서버 실행 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm type-check` | 타입 검사 |
| `pnpm lint` | 린트 실행 |
| `pnpm test` | 테스트 실행 |
| `pnpm storybook` | Storybook 실행 |

## Documentation

- [모노레포 구조](./docs/MONOREPO.md)
- [변경 이력](./CHANGELOG.md)
