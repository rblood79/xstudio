---
applyTo: "**/*.{ts,tsx}"
---
# Supabase Instructions
- RLS assumed; never expose service keys.
- After insert/update, refresh via .select().single().
- Put API calls in services/api/*.ts and consume via hooks.
- Separate user toasts from logging; safely serialize errors.
