#!/bin/bash

echo "🔧 Fixing all theme-related import paths..."

# 1. Fix useAsyncMutation imports in themes/components/
echo "📝 Fixing useAsyncMutation imports..."
find src/builder/panels/themes/components -name "*.tsx" -type f -exec sed -i '' \
  "s|from '../../hooks/useAsyncMutation'|from '../../../hooks/useAsyncMutation'|g" {} \;

# 2. Fix hooks/theme imports (src/hooks/theme not src/builder/hooks/theme)
echo "📝 Fixing hooks/theme imports..."
find src/builder/panels/themes -name "*.tsx" -type f -exec sed -i '' \
  "s|from '../../hooks/theme'|from '../../../hooks/theme'|g" {} \;

find src/builder/panels/themes -name "*.tsx" -type f -exec sed -i '' \
  "s|from '../../../hooks/theme'|from '../../../../hooks/theme'|g" {} \;

find src/builder/panels/settings -name "*.tsx" -type f -exec sed -i '' \
  "s|from '../../hooks/theme/useThemes'|from '../../../hooks/theme/useThemes'|g" {} \;

# 3. Fix services/theme imports
echo "📝 Fixing services/theme imports..."
find src/builder/panels/themes/components -name "*.tsx" -type f -exec sed -i '' \
  "s|from '../../../services/theme'|from '../../../../services/theme'|g" {} \;

# 4. Fix components/list imports (should be from ../../components/)
echo "📝 Fixing components/list imports..."
find src/builder/panels/themes -name "*.tsx" -type f -exec sed -i '' \
  "s|from '../components/list'|from '../../../components'|g" {} \;

find src/builder/panels/themes/components -name "*.tsx" -type f -exec sed -i '' \
  "s|from '../../components/list'|from '../../../../components'|g" {} \;

# 5. Fix ../components/index.css imports
echo "📝 Fixing components/index.css imports..."
find src/builder/panels/themes -name "*.tsx" -type f -exec sed -i '' \
  "s|from '../components/index.css'|from '../../../components/index.css'|g" {} \;

# 6. Fix inspector components imports in shared/ui
echo "📝 Fixing inspector hooks imports in shared/ui..."
find src/builder/shared/ui -name "*.tsx" -type f -exec sed -i '' \
  "s|from \"../hooks/useInspectorState\"|from \"../../inspector/hooks/useInspectorState\"|g" {} \;

# 7. Fix sidebar theme import
echo "📝 Fixing sidebar theme import..."
sed -i '' "s|from '../theme'|from '../panels/themes'|g" src/builder/sidebar/index.tsx

# 8. Fix inspector components import
echo "📝 Fixing inspector components import..."
sed -i '' "s|from \"../components\"|from \"../../shared/ui\"|g" src/builder/inspector/sections/StyleSection.tsx

# 9. Fix useTheme import in ThemeEditor
echo "📝 Fixing useTheme imports..."
find src/builder/panels/themes -name "ThemeEditor.tsx" -type f -exec sed -i '' \
  "s|from '../../hooks/useTheme'|from '../../../hooks/useTheme'|g" {} \;

# 10. Fix themeStore imports
echo "📝 Fixing themeStore imports..."
find src/builder/panels/themes -name "*.tsx" -type f -exec sed -i '' \
  "s|from '../../stores/themeStore'|from '../../../stores/themeStore'|g" {} \;

echo "✅ All imports fixed!"
