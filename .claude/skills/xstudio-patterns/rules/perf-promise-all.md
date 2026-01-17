---
title: Use Promise.all for Concurrent Operations
impact: MEDIUM
impactDescription: 응답 시간 단축, 병렬 처리 최적화
tags: [performance, async, promises]
---

독립적인 비동기 작업은 Promise.all로 병렬 실행합니다.

## Incorrect

```tsx
// ❌ 순차 실행 - 총 3초 소요
async function loadDashboard(userId: string) {
  const user = await fetchUser(userId);       // 1초
  const projects = await fetchProjects(userId); // 1초
  const settings = await fetchSettings(userId); // 1초

  return { user, projects, settings };
}
```

## Correct

```tsx
// ✅ 병렬 실행 - 총 1초 소요
async function loadDashboard(userId: string) {
  const [user, projects, settings] = await Promise.all([
    fetchUser(userId),
    fetchProjects(userId),
    fetchSettings(userId)
  ]);

  return { user, projects, settings };
}

// ✅ 일부 실패 허용 시
async function loadDashboardSafe(userId: string) {
  const results = await Promise.allSettled([
    fetchUser(userId),
    fetchProjects(userId),
    fetchNotifications(userId)  // 실패해도 OK
  ]);

  return {
    user: results[0].status === 'fulfilled' ? results[0].value : null,
    projects: results[1].status === 'fulfilled' ? results[1].value : [],
    notifications: results[2].status === 'fulfilled' ? results[2].value : []
  };
}
```
