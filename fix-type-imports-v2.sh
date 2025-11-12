#!/bin/bash

# TypeScript 타입 import 경로 수정 스크립트 v2
# 정확한 상대 경로 계산

echo "🔍 타입 import 경로 수정 시작 (v2)..."

# 1. src/builder/events/actions/*.tsx
# from "../../../../types/events/events.types" → from "../../../types/events/events.types"
echo "📝 Fixing src/builder/events/actions/*.tsx..."
find src/builder/events/actions -name "*.tsx" -type f -exec sed -i '' \
  's|from "../../../../types/events/events.types"|from "../../../types/events/events.types"|g' {} +

# 2. src/builder/events/components/*.tsx
# from "../../../../types/events/events.types" → from "../../../types/events/events.types"
echo "📝 Fixing src/builder/events/components/*.tsx..."
find src/builder/events/components -maxdepth 1 -name "*.tsx" -type f -exec sed -i '' \
  's|from "../../../../types/events/events.types"|from "../../../types/events/events.types"|g' {} +

# 3. src/builder/events/components/visualMode/*.tsx
# from "../../../../../types/events/events.types" → from "../../../../types/events/events.types"
echo "📝 Fixing src/builder/events/components/visualMode/*.tsx..."
find src/builder/events/components/visualMode -name "*.tsx" -type f -exec sed -i '' \
  's|from "../../../../../types/events/events.types"|from "../../../../types/events/events.types"|g' {} +

# 4. src/builder/events/state/*.ts
# from '../../../../types/events/events.types' → from '../../../types/events/events.types'
echo "📝 Fixing src/builder/events/state/*.ts..."
find src/builder/events/state -name "*.ts" -type f -exec sed -i '' \
  "s|from '../../../../types/events/events.types'|from '../../../types/events/events.types'|g" {} +

# 5. src/builder/events/hooks/*.ts
# from "../../../../types/events/events.types" → from "../../../types/events/events.types"
echo "📝 Fixing src/builder/events/hooks/*.ts..."
find src/builder/events/hooks -name "*.ts" -type f -exec sed -i '' \
  's|from "../../../../types/events/events.types"|from "../../../types/events/events.types"|g' {} +

# 6. src/builder/events/utils/*.ts
# from "../../../../types/events/events.types" → from "../../../types/events/events.types"
echo "📝 Fixing src/builder/events/utils/*.ts..."
find src/builder/events/utils -name "*.ts" -type f -exec sed -i '' \
  's|from "../../../../types/events/events.types"|from "../../../types/events/events.types"|g' {} +

# 7. src/builder/events/execution/*.ts
# from "../../../../types/events/events.types" → from "../../../types/events/events.types"
echo "📝 Fixing src/builder/events/execution/*.ts..."
find src/builder/events/execution -name "*.ts" -type f -exec sed -i '' \
  's|from "../../../../types/events/events.types"|from "../../../types/events/events.types"|g' {} +

echo "✅ 타입 import 경로 수정 완료 (v2)!"
