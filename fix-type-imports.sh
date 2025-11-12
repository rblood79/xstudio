#!/bin/bash

# TypeScript 타입 import 경로 수정 스크립트
# src/builder/에서 ../types를 사용하는 모든 파일을 src/types로 수정

echo "🔍 타입 import 경로 수정 시작..."

# 1. src/builder/events/actions/*.tsx - from "../../types" → from "../../../../types/events/events.types"
echo "📝 Fixing src/builder/events/actions/*.tsx..."
find src/builder/events/actions -name "*.tsx" -type f -exec sed -i '' \
  's|from "../../types"|from "../../../../types/events/events.types"|g' {} +

# 2. src/builder/events/actions/*.tsx - from "../types/eventTypes" → from "../../../../types/events/events.types"
find src/builder/events/actions -name "*.tsx" -type f -exec sed -i '' \
  's|from "../types/eventTypes"|from "../../../../types/events/events.types"|g' {} +

# 3. src/builder/events/*.tsx - from "../types" → from "../../../types/events/events.types"
echo "📝 Fixing src/builder/events/*.tsx..."
find src/builder/events -maxdepth 1 -name "*.tsx" -type f -exec sed -i '' \
  's|from "../types"|from "../../../types/events/events.types"|g' {} +

# 4. src/builder/events/components/*.tsx - from "../types" → from "../../../../types/events/events.types"
echo "📝 Fixing src/builder/events/components/*.tsx..."
find src/builder/events/components -name "*.tsx" -type f -exec sed -i '' \
  's|from "../types"|from "../../../../types/events/events.types"|g' {} +

# 5. src/builder/events/components/visualMode/*.tsx - from "../../types" → from "../../../../../types/events/events.types"
echo "📝 Fixing src/builder/events/components/visualMode/*.tsx..."
find src/builder/events/components/visualMode -name "*.tsx" -type f -exec sed -i '' \
  's|from "../../types"|from "../../../../../types/events/events.types"|g' {} +

# 6. src/builder/events/state/*.ts - from '../types' → from '../../../../types/events/events.types'
echo "📝 Fixing src/builder/events/state/*.ts..."
find src/builder/events/state -name "*.ts" -type f -exec sed -i '' \
  "s|from '../types'|from '../../../../types/events/events.types'|g" {} +

# 7. src/builder/events/hooks/*.ts - from "../types" → from "../../../../types/events/events.types"
echo "📝 Fixing src/builder/events/hooks/*.ts..."
find src/builder/events/hooks -name "*.ts" -type f -exec sed -i '' \
  's|from "../types"|from "../../../../types/events/events.types"|g' {} +

# 8. src/builder/events/utils/*.ts - from "../types" → from "../../../../types/events/events.types"
echo "📝 Fixing src/builder/events/utils/*.ts..."
find src/builder/events/utils -name "*.ts" -type f -exec sed -i '' \
  's|from "../types"|from "../../../../types/events/events.types"|g' {} +

# 9. src/builder/events/execution/*.ts - from "../types/eventTypes" → from "../../../../types/events/events.types"
echo "📝 Fixing src/builder/events/execution/*.ts..."
find src/builder/events/execution -name "*.ts" -type f -exec sed -i '' \
  's|from "../types/eventTypes"|from "../../../../types/events/events.types"|g' {} +

# 10. src/utils/*.ts - from '../types/theme' → from '../types/theme/theme.types'
echo "📝 Fixing src/utils/*.ts (theme imports)..."
find src/utils -name "*.ts" -type f -exec sed -i '' \
  "s|from '../types/theme'|from '../types/theme/theme.types'|g" {} +

# 11. src/utils/*.ts - from './types/theme' → from '../types/theme/theme.types'
find src/utils -name "*.ts" -type f -exec sed -i '' \
  "s|from './types/theme'|from '../types/theme/theme.types'|g" {} +

# 12. src/utils/element/*.ts - from '../types/builder/unified.types' 경로 확인
echo "📝 Fixing src/utils/element/*.ts..."
find src/utils/element -name "*.ts" -type f -exec sed -i '' \
  's|from "../types/builder/unified.types"|from "../../types/builder/unified.types"|g' {} +

# 13. src/utils/element/*.ts - from '../types/core/store.types'
find src/utils/element -name "*.ts" -type f -exec sed -i '' \
  's|from "../types/core/store.types"|from "../../types/core/store.types"|g' {} +

# 14. src/utils/events/*.ts - from '../types/core/store.types'
echo "📝 Fixing src/utils/events/*.ts..."
find src/utils/events -name "*.ts" -type f -exec sed -i '' \
  's|from "../types/core/store.types"|from "../../types/core/store.types"|g' {} +

# 15. src/utils/events/*.ts - from '../types/events/events.types'
find src/utils/events -name "*.ts" -type f -exec sed -i '' \
  's|from "../types/events/events.types"|from "../../types/events/events.types"|g' {} +

# 16. src/utils/dom/*.ts - from '../types/theme'
echo "📝 Fixing src/utils/dom/*.ts..."
find src/utils/dom -name "*.ts" -type f -exec sed -i '' \
  "s|from '../types/theme'|from '../../types/theme/theme.types'|g" {} +

# 17. src/utils/dom/*.ts - from './elementUtils'
find src/utils/dom -name "*.ts" -type f -exec sed -i '' \
  "s|from './elementUtils'|from '../element/elementUtils'|g" {} +

echo "✅ 타입 import 경로 수정 완료!"
echo ""
echo "📊 수정된 파일 확인:"
grep -r 'from "../../../../types/events/events.types"' src/builder/events/ | wc -l
grep -r "from '../../../../types/events/events.types'" src/builder/events/ | wc -l
