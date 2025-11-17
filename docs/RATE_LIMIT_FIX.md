# Rate Limit Error Fix

**Date**: 2025-11-17
**Status**: ✅ Fixed

## Problem

The application was experiencing rate limiting errors during project initialization:

```
[getPagesByProjectId] RATE_LIMIT_ERROR: Rate limit exceeded. Please try again later.
```

## Root Causes

### 1. Rate Limit Check Timing Issue

The rate limit check in `BaseApiService.ts` was happening **before** cache and deduplication checks, causing all requests (even cached ones) to count toward the limit.

```typescript
// ❌ BEFORE - Rate limit checked too early
protected async handleCachedApiCall<T>(...) {
    await this.rateLimitCheck(operation); // Checked FIRST
    
    // Cache check
    if (cached) return cached.data;
    
    // Deduplication
    await globalRequestDeduplicator.deduplicate(...);
}
```

### 2. Function Reference Instability

`fetchElements` and `initializeProject` in `usePageManager` hook were not memoized, causing:
- New function references created on every render
- `useEffect` dependencies triggering infinite re-renders
- Multiple simultaneous initialization calls

```typescript
// ❌ BEFORE - No memoization
const initializeProject = async (projectId: string) => { ... };

// Components with this in dependency array:
useEffect(() => {
    initializeProject(projectId);
}, [projectId, initializeProject]); // ❌ Infinite loop!
```

### 3. Multiple Initialization Points

Both `BuilderCore.tsx` and `NodesPanel.tsx` were calling `initializeProject` independently, causing duplicate requests.

## Update (2025-11-17 - Infinite Loading Fix)

### Additional Issue: Infinite Loop in useCallback Dependencies

After the initial fix, an infinite loading issue was discovered caused by unstable dependency arrays in `useCallback`:

**Problem:**
- `pageList` from `useListData` returns a new object on every render
- Including `pageList` in dependency array caused `initializeProject` to be recreated every render
- This triggered `useEffect` in components that depend on `initializeProject`
- Result: Infinite re-render loop

**Solution:**
- Removed `pageList` from dependency array (access directly in function body)
- Removed Zustand functions (`setPages`, `setCurrentPageId`) as they have stable references
- Simplified dependency arrays to only truly necessary external dependencies:
  - `fetchElements`: `[requestAutoSelectAfterUpdate]`
  - `initializeProject`: `[fetchElements]`

## Solutions Applied

### 1. Fixed Rate Limit Timing (BaseApiService.ts)

Moved rate limit check to only apply to **actual API calls**:

```typescript
// ✅ AFTER - Rate limit checked only for real API calls
protected async handleCachedApiCall<T>(...) {
    // 1. Check cache first (no rate limit)
    const cached = globalQueryCache.get(queryKey);
    if (cached && age < staleTime) {
        return cached.data; // ✅ Cache hit - bypass rate limit
    }
    
    // 2. Check deduplication
    const wasDeduplicated = globalRequestDeduplicator.isPending(queryKey);
    
    // 3. Rate limit check ONLY if not deduplicated
    if (!wasDeduplicated) {
        await this.rateLimitCheck(operation); // ✅ Only for real calls
    }
    
    // 4. Make API call
    await globalRequestDeduplicator.deduplicate(...);
}
```

**Benefits**:
- Cached responses don't count toward rate limit
- Deduplicated requests don't count toward rate limit
- Only actual API calls are rate-limited

### 2. Memoized Functions with Minimal Dependencies (usePageManager.ts)

Wrapped critical functions in `useCallback` with **minimal stable dependencies**:

```typescript
// ✅ AFTER - Properly memoized with stable dependencies only
const fetchElements = useCallback(async (pageId: string) => {
    // Zustand functions accessed via getState() - no dependency needed
    const { setElements, setSelectedElement } = useStore.getState();
    // ... implementation
}, [requestAutoSelectAfterUpdate]); // Only external dependency

const initializeProject = useCallback(async (projectId: string) => {
    // pageList accessed directly - no dependency needed (prevents infinite loop)
    // Zustand functions have stable references - no dependency needed
    // ... implementation
}, [fetchElements]); // Only depends on fetchElements
```

**Benefits**:
- Stable function references prevent infinite re-renders
- No circular dependencies between functions
- Components can safely include these functions in dependency arrays
- `useListData` objects (pageList) not in dependencies - prevents infinite loops

### 3. Updated Documentation

Updated hook documentation to reflect the change:

```typescript
/**
 * usePageManager - React Stately useListData 기반 페이지 관리
 *
 * wrapper 함수 불필요: 모든 함수가 에러를 return으로 처리
 * useCallback 사용: fetchElements, initializeProject는 메모이제이션됨 (무한 재렌더 방지)
 */
```

## Impact

### Before Fix
- **Rate Limit**: Triggered after 30-1000 total requests (including cached)
- **Performance**: Multiple duplicate initialization calls
- **User Experience**: Application failed to load with rate limit errors

### After Fix
- **Rate Limit**: Only actual API calls count (typical: 1-2 per initialization)
- **Performance**: Single initialization call per component
- **User Experience**: Smooth loading without errors

## Testing

To verify the fix:

1. **Clear browser cache** and reload
2. **Monitor console** - Should see:
   - `📦 [Cache HIT]` messages (no rate limit impact)
   - `🔄 프로젝트 초기화 시작` (only once per component)
   - No rate limit errors

3. **Check initialization flow**:
   - NodesPanel initializes once
   - BuilderCore initializes once
   - No duplicate calls to `getPagesByProjectId`

## Files Modified

1. `src/services/api/BaseApiService.ts`
   - Lines 129-156: Reordered cache/deduplication/rate-limit checks

2. `src/builder/hooks/usePageManager.ts` (Updated 2x)
   - Line 1: Added `useCallback` import
   - Lines 35-38: Updated documentation
   - Lines 69-133: Wrapped `fetchElements` in `useCallback` with minimal dependencies
   - Lines 216-281: Wrapped `initializeProject` in `useCallback` with minimal dependencies
   - Fixed: Removed `pageList`, `setPages`, `setCurrentPageId` from dependency arrays (infinite loop prevention)

## Related Issues

- Rate limiting affecting development workflow
- Multiple initialization attempts on page load
- Infinite re-render loops in effect dependencies
- Infinite loading screen caused by unstable useCallback dependencies

## Lessons Learned

1. **Rate Limiting**: Should only apply to actual API calls, not cached/deduplicated requests
2. **useCallback Dependencies**: 
   - Only include truly external dependencies
   - Zustand selectors return stable function references (can be excluded)
   - `useListData` returns new objects every render (must not be in dependencies)
   - Access stable values via `ref` or direct access in function body
3. **Initialization Patterns**: Guard against duplicate calls with refs, not just state

## Future Improvements

Consider:
- **Smart rate limiting** - Different limits for different operation types
- **Exponential backoff** - Retry with increasing delays
- **Request batching** - Combine multiple requests into one
- **Initialization deduplication** - Global singleton for project initialization

