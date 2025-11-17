# require() to import Fix

**Date**: 2025-11-17
**Status**: ✅ Fixed

## Problem

The application was crashing with a ReferenceError in the browser:

```
ThemeService.ts:402 Uncaught ReferenceError: require is not defined
    at ThemeService.subscribeToProjectThemes (ThemeService.ts:402:50)
```

## Root Cause

`ThemeService.ts` was using Node.js CommonJS `require()` syntax inside functions, which doesn't work in browser environments:

```typescript
// ❌ WRONG - Node.js syntax in browser
const { RealtimeBatcher, RealtimeFilters } = require('../../utils/realtimeBatcher');
```

This was happening in two places:
1. `subscribeToTheme()` method (line 346)
2. `subscribeToProjectThemes()` method (line 402)

## Solution

Replaced dynamic `require()` calls with static ES6 `import` statement at the top of the file:

```typescript
// ✅ CORRECT - ES6 import
import { RealtimeBatcher, RealtimeFilters } from '../../utils/realtimeBatcher';
```

### Changes Made

**File**: `src/services/theme/ThemeService.ts`

1. **Added import at top** (line 14):
```typescript
import { RealtimeBatcher, RealtimeFilters } from '../../utils/realtimeBatcher';
```

2. **Removed `require()` in `subscribeToTheme()`** (line 345-346):
```typescript
// REMOVED:
// const { RealtimeBatcher, RealtimeFilters } = require('../../utils/realtimeBatcher');
```

3. **Removed `require()` in `subscribeToProjectThemes()`** (line 399-400):
```typescript
// REMOVED:
// const { RealtimeBatcher, RealtimeFilters } = require('../../utils/realtimeBatcher');
```

## Why This Happened

The code was using dynamic `require()` to avoid importing modules that might not be needed. However:
- `require()` is a Node.js (CommonJS) feature
- Browsers only support ES6 `import/export`
- Vite/bundlers convert ES6 imports but don't polyfill `require()`

## Best Practices

### ✅ DO - Use ES6 imports
```typescript
import { MyModule } from './myModule';
```

### ❌ DON'T - Use require() in browser code
```typescript
const { MyModule } = require('./myModule'); // Won't work in browser!
```

### When to use dynamic imports
If you need lazy loading, use ES6 dynamic import:
```typescript
// ✅ CORRECT - ES6 dynamic import
const { MyModule } = await import('./myModule');
```

## Additional Fix (2025-11-17): Allow Null Theme

### Issue
After fixing `require()`, a new error appeared:
```
[getActiveTheme] NOT_FOUND_ERROR: No data returned from getActiveTheme
```

This is **not an error** - it's a normal case when a project has no active theme.

### Solution
Added `allowNull` option to `BaseApiService.handleCachedApiCall()`:

**File**: `src/services/api/BaseApiService.ts`
```typescript
protected async handleCachedApiCall<T>(
    queryKey: string,
    operation: string,
    apiCall: () => Promise<{ data: T | null; error: unknown }>,
    options: { staleTime?: number; allowNull?: boolean } = {} // Added allowNull
): Promise<T> {
    // ...
    // allowNull 옵션이 false이고 data가 null이면 에러
    if (!data && !options.allowNull) {
        throw new Error(`No data returned from ${operation}`);
    }
    return data as T; // allowNull=true면 null도 허용
}
```

**File**: `src/services/theme/ThemeService.ts`
```typescript
const result = await instance.handleCachedApiCall<DesignTheme | null>(
    queryKey,
    'getActiveTheme',
    async () => { /* ... */ },
    { staleTime: 5 * 60 * 1000, allowNull: true } // ✅ Allow null response
);
```

## Verification

- ✅ TypeScript compilation: No errors
- ✅ ESLint: No errors
- ✅ Runtime: No ReferenceError
- ✅ Theme subscriptions working correctly
- ✅ No errors when project has no active theme

## Additional Services Fixed (2025-11-17)

The same `require()` issue was found in `TokenService.ts` and fixed with the same approach:

**File**: `src/services/theme/TokenService.ts`

1. **Added import at top** (line 21):
```typescript
import { RealtimeBatcher, RealtimeFilters } from '../../utils/realtimeBatcher';
```

2. **Removed `require()` in `subscribeToTokenChanges()`** (line 393)
3. **Removed `require()` in `subscribeToProjectTokens()`** (line 447)

## Related Files

- `src/services/theme/ThemeService.ts` - Fixed (require → import)
- `src/services/theme/TokenService.ts` - Fixed (require → import)
- `src/services/api/BaseApiService.ts` - Fixed (allowNull option)
- `src/utils/realtimeBatcher.ts` - Referenced module

## Impact

- **Before**: Application crashed on theme subscription
- **After**: Theme subscriptions work correctly in browser

## Lessons Learned

1. **Always use ES6 imports** in browser code
2. **Dynamic imports** should use `import()` not `require()`
3. **Test in browser** - Node.js and browser have different module systems
4. **Linter rules** - Consider adding rule to prevent `require()` in browser code

