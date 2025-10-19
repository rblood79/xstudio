---
applyTo: "**/*.{ts,tsx}"
---
# TypeScript Instructions
- **Strict typing**: No `any` types, explicit return types.
- **DTOs location**: Type definitions in `src/types/`.
- **Import paths**: Use absolute imports (configured in tsconfig).
- Keep components and hooks thin, delegate logic to services/utilities.

## Store Module Pattern (Zustand)
- Use factory functions that receive set/get from StateCreator.
- Extract set/get types: `type SetState = Parameters<StateCreator<YourState>>[0]`.
- Enable modular, testable code with proper type inference.
- Example modules: elementCreation.ts, elementUpdate.ts, elementRemoval.ts.
