# XStudio Global Copilot Instructions
- Stack: React 19 + TypeScript + RAC + Zustand + Tailwind v4 + Supabase JS v2
- Styling: **No inline Tailwind in .tsx**. Use semantic classes via tv() and style in CSS with @apply.
- Data: Supabase with RLS; service modules + hooks; never expose secrets.
- Routing: React Router v7; Suspense allowed.
- Testing: Vitest + RTL; Playwright for E2E.
- Storybook: CSF3 + Controls/Interactions.
- Messaging: Validate postMessage origin; queue before PREVIEW_READY.
- Tokens: Prefer CSS variables (--color-*, --radius-*, --spacing-*).
