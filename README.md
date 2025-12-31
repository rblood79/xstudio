# XStudio

**Visual Application Builder**

## Quick Start

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev
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
