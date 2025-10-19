---
applyTo: "**/*.{ts,tsx}"
---
# Supabase Instructions
- **Always use Row Level Security (RLS)**.
- Never expose secrets in client code.
- Use service modules (`src/services/api/*`) for all database operations.
- Use hooks for reactive queries (not direct Supabase calls in components).
- After insert/update, refresh via .select().single().
- Separate user toasts from logging; safely serialize errors.
