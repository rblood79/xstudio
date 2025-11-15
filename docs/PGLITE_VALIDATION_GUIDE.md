# PGlite 검증 및 프로덕션 준비 가이드

**작성일**: 2025-11-07
**목적**: PGlite 배포 전 성능/안정성/백업/동기화 전략 검증

---

## 📋 검증 체크리스트

배포 전 반드시 완료해야 할 검증 항목:

- [ ] **1. 성능 벤치마킹** (예상 시간: 1-2일)
  - [ ] CRUD 성능 측정
  - [ ] RPC 함수 성능 측정
  - [ ] 동시성 테스트
  - [ ] 대용량 데이터 처리

- [ ] **2. 데이터 관리 전략** (예상 시간: 1일)
  - [ ] 저장 경로 정책
  - [ ] 백업 전략
  - [ ] 데이터 마이그레이션
  - [ ] 디스크 공간 관리

- [ ] **3. 동기화 프로토타입** (예상 시간: 2-3일)
  - [ ] 증분 동기화 설계
  - [ ] 충돌 해결 정책
  - [ ] 오프라인 큐잉
  - [ ] 재연결 로직

- [ ] **4. 안정성 테스트** (예상 시간: 1-2일)
  - [ ] 크래시 복구
  - [ ] 데이터 무결성
  - [ ] 트랜잭션 롤백
  - [ ] 메모리 누수

---

## 1️⃣ 성능 벤치마킹

### 1.1. CRUD 성능 측정

#### 테스트 시나리오

```typescript
// tests/benchmarks/crud-performance.test.ts
import { performance } from 'perf_hooks';
import { db } from '../../src/services/database';

describe('PGlite CRUD Performance Benchmarks', () => {
  let testProjectId: string;

  beforeAll(async () => {
    await db.initialize();

    // 테스트 프로젝트 생성
    const [project] = await db.insert('projects', {
      name: 'Performance Test Project',
    });
    testProjectId = project.id;
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    await db.delete('projects', testProjectId);
    await db.close();
  });

  describe('INSERT Performance', () => {
    it('should insert 1,000 elements in < 2 seconds', async () => {
      const elements = Array.from({ length: 1000 }, (_, i) => ({
        page_id: testProjectId,
        tag: 'Button',
        props: { variant: 'primary', label: `Button ${i}` },
        order_num: i,
      }));

      const start = performance.now();
      await db.insert('elements', elements);
      const duration = performance.now() - start;

      console.log(`✅ Inserted 1,000 elements in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(2000); // < 2초
    });

    it('should batch insert 10,000 elements in < 10 seconds', async () => {
      const batchSize = 1000;
      const totalElements = 10000;
      const start = performance.now();

      for (let i = 0; i < totalElements; i += batchSize) {
        const batch = Array.from({ length: batchSize }, (_, j) => ({
          page_id: testProjectId,
          tag: 'Text',
          props: { content: `Text ${i + j}` },
          order_num: i + j,
        }));

        await db.insert('elements', batch);
      }

      const duration = performance.now() - start;

      console.log(`✅ Batch inserted 10,000 elements in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(10000); // < 10초
    });
  });

  describe('SELECT Performance', () => {
    beforeAll(async () => {
      // 10,000개 요소 삽입
      const elements = Array.from({ length: 10000 }, (_, i) => ({
        page_id: testProjectId,
        tag: 'Button',
        props: { variant: i % 3 === 0 ? 'primary' : 'secondary', label: `Button ${i}` },
        order_num: i,
      }));
      await db.insert('elements', elements);
    });

    it('should select 10,000 elements in < 500ms', async () => {
      const start = performance.now();
      const elements = await db.select('elements', {
        where: { page_id: testProjectId },
        orderBy: [{ column: 'order_num', ascending: true }],
      });
      const duration = performance.now() - start;

      console.log(`✅ Selected ${elements.length} elements in ${duration.toFixed(2)}ms`);
      expect(elements.length).toBe(10000);
      expect(duration).toBeLessThan(500); // < 500ms
    });

    it('should filter by JSONB property in < 200ms', async () => {
      const start = performance.now();
      const primaryButtons = await db.query(
        "SELECT * FROM elements WHERE props->>'variant' = $1",
        ['primary']
      );
      const duration = performance.now() - start;

      console.log(`✅ Filtered ${primaryButtons.length} elements by JSONB in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(200); // < 200ms
    });
  });

  describe('UPDATE Performance', () => {
    it('should update 1,000 elements in < 1 second', async () => {
      const elements = await db.select('elements', {
        where: { page_id: testProjectId },
        limit: 1000,
      });

      const start = performance.now();
      for (const element of elements) {
        await db.update('elements', element.id, {
          props: { ...element.props, updated: true },
        });
      }
      const duration = performance.now() - start;

      console.log(`✅ Updated 1,000 elements in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(1000); // < 1초
    });

    it('should batch update with transaction in < 500ms', async () => {
      const elements = await db.select('elements', {
        where: { page_id: testProjectId },
        limit: 1000,
      });

      const start = performance.now();
      await db.transaction(async (tx) => {
        for (const element of elements) {
          await tx.query(
            'UPDATE elements SET props = $1 WHERE id = $2',
            [JSON.stringify({ ...element.props, batch_updated: true }), element.id]
          );
        }
      });
      const duration = performance.now() - start;

      console.log(`✅ Batch updated 1,000 elements in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(500); // < 500ms
    });
  });

  describe('DELETE Performance', () => {
    it('should delete 1,000 elements in < 500ms', async () => {
      const elements = await db.select('elements', {
        where: { page_id: testProjectId },
        limit: 1000,
      });

      const start = performance.now();
      for (const element of elements) {
        await db.delete('elements', element.id);
      }
      const duration = performance.now() - start;

      console.log(`✅ Deleted 1,000 elements in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(500); // < 500ms
    });

    it('should cascade delete page with 10,000 elements in < 2 seconds', async () => {
      // 새 페이지 생성
      const [page] = await db.insert('pages', {
        project_id: testProjectId,
        title: 'Cascade Test Page',
        slug: 'cascade-test',
      });

      // 10,000개 요소 삽입
      const elements = Array.from({ length: 10000 }, (_, i) => ({
        page_id: page.id,
        tag: 'Text',
        props: { content: `Text ${i}` },
        order_num: i,
      }));
      await db.insert('elements', elements);

      // 페이지 삭제 (CASCADE로 모든 요소도 삭제됨)
      const start = performance.now();
      await db.delete('pages', page.id);
      const duration = performance.now() - start;

      console.log(`✅ Cascade deleted page with 10,000 elements in ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(2000); // < 2초
    });
  });
});
```

#### 성능 기준 (권장)

| 작업 | 데이터 크기 | 목표 시간 | 허용 시간 |
|------|------------|----------|----------|
| INSERT (단일) | 1개 | < 5ms | < 20ms |
| INSERT (배치) | 1,000개 | < 500ms | < 2초 |
| SELECT (전체) | 10,000개 | < 200ms | < 500ms |
| SELECT (JSONB 필터) | 10,000개 | < 100ms | < 200ms |
| UPDATE (단일) | 1개 | < 5ms | < 20ms |
| UPDATE (트랜잭션) | 1,000개 | < 200ms | < 500ms |
| DELETE (단일) | 1개 | < 5ms | < 20ms |
| DELETE (CASCADE) | 10,000개 | < 1초 | < 2초 |

---

### 1.2. RPC 함수 성능 측정

#### 테스트 시나리오

```typescript
// tests/benchmarks/rpc-performance.test.ts
import { performance } from 'perf_hooks';
import { db } from '../../src/services/database';

describe('PGlite RPC Performance Benchmarks', () => {
  let testThemeId: string;
  let parentThemeId: string;

  beforeAll(async () => {
    await db.initialize();

    // 테스트 프로젝트 및 테마 생성
    const [project] = await db.insert('projects', {
      name: 'RPC Test Project',
    });

    // 부모 테마 생성
    const [parentTheme] = await db.insert('design_themes', {
      project_id: project.id,
      name: 'Parent Theme',
      status: 'active',
    });
    parentThemeId = parentTheme.id;

    // 자식 테마 생성 (상속)
    const [childTheme] = await db.insert('design_themes', {
      project_id: project.id,
      name: 'Child Theme',
      parent_theme_id: parentThemeId,
      status: 'active',
    });
    testThemeId = childTheme.id;

    // 부모 테마에 토큰 1,000개 삽입
    const tokens = Array.from({ length: 1000 }, (_, i) => ({
      project_id: project.id,
      theme_id: parentThemeId,
      name: `color.shade.${i}`,
      type: 'color',
      value: { h: i % 360, s: 50, l: 50, a: 1 },
      scope: 'raw',
    }));
    await db.insert('design_tokens', tokens);

    // 자식 테마에 토큰 100개 삽입 (오버라이드)
    const childTokens = Array.from({ length: 100 }, (_, i) => ({
      project_id: project.id,
      theme_id: testThemeId,
      name: `color.shade.${i}`,
      type: 'color',
      value: { h: i % 360, s: 70, l: 60, a: 1 },
      scope: 'raw',
    }));
    await db.insert('design_tokens', childTokens);
  });

  describe('resolve_theme_tokens', () => {
    it('should resolve 1,100 tokens (with inheritance) in < 200ms', async () => {
      const start = performance.now();
      const tokens = await db.rpc('resolve_theme_tokens', {
        p_theme_id: testThemeId,
      });
      const duration = performance.now() - start;

      console.log(`✅ Resolved ${tokens.length} tokens in ${duration.toFixed(2)}ms`);
      expect(tokens.length).toBe(1100); // 100 (child) + 1000 (parent)
      expect(duration).toBeLessThan(200); // < 200ms
    });

    it('should handle 5-level deep inheritance in < 500ms', async () => {
      // 5단계 상속 구조 생성
      let currentThemeId = parentThemeId;
      const [project] = await db.select('projects', { limit: 1 });

      for (let i = 1; i <= 5; i++) {
        const [theme] = await db.insert('design_themes', {
          project_id: project.id,
          name: `Level ${i} Theme`,
          parent_theme_id: currentThemeId,
          status: 'active',
        });

        // 각 레벨에 토큰 50개 추가
        const tokens = Array.from({ length: 50 }, (_, j) => ({
          project_id: project.id,
          theme_id: theme.id,
          name: `level${i}.token.${j}`,
          type: 'color',
          value: { h: j * 7, s: 50, l: 50, a: 1 },
          scope: 'raw',
        }));
        await db.insert('design_tokens', tokens);

        currentThemeId = theme.id;
      }

      // 가장 깊은 레벨 테마의 토큰 해석
      const start = performance.now();
      const tokens = await db.rpc('resolve_theme_tokens', {
        p_theme_id: currentThemeId,
      });
      const duration = performance.now() - start;

      console.log(`✅ Resolved ${tokens.length} tokens (5-level) in ${duration.toFixed(2)}ms`);
      expect(tokens.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500); // < 500ms
    });
  });

  describe('duplicate_theme', () => {
    it('should duplicate theme with 1,000 tokens in < 1 second', async () => {
      const start = performance.now();
      const newThemeId = await db.rpc('duplicate_theme', {
        p_source_theme_id: parentThemeId,
        p_new_name: 'Duplicated Theme',
        p_inherit: false, // 토큰 복사
      });
      const duration = performance.now() - start;

      console.log(`✅ Duplicated theme with 1,000 tokens in ${duration.toFixed(2)}ms`);
      expect(newThemeId).toBeTruthy();
      expect(duration).toBeLessThan(1000); // < 1초

      // 토큰 복사 확인
      const tokens = await db.select('design_tokens', {
        where: { theme_id: newThemeId },
      });
      expect(tokens.length).toBe(1000);
    });

    it('should create inherited theme (no token copy) in < 50ms', async () => {
      const start = performance.now();
      const newThemeId = await db.rpc('duplicate_theme', {
        p_source_theme_id: parentThemeId,
        p_new_name: 'Inherited Theme',
        p_inherit: true, // 토큰 복사 안 함
      });
      const duration = performance.now() - start;

      console.log(`✅ Created inherited theme in ${duration.toFixed(2)}ms`);
      expect(newThemeId).toBeTruthy();
      expect(duration).toBeLessThan(50); // < 50ms

      // 토큰 복사 안 됨 확인
      const tokens = await db.select('design_tokens', {
        where: { theme_id: newThemeId },
      });
      expect(tokens.length).toBe(0);
    });
  });

  describe('search_tokens', () => {
    it('should search 1,000 tokens in < 100ms', async () => {
      const start = performance.now();
      const results = await db.rpc('search_tokens', {
        p_theme_id: testThemeId,
        p_query: 'color',
        p_include_inherited: true,
      });
      const duration = performance.now() - start;

      console.log(`✅ Searched ${results.length} tokens in ${duration.toFixed(2)}ms`);
      expect(results.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100); // < 100ms
    });
  });

  describe('bulk_upsert_tokens', () => {
    it('should upsert 500 tokens in < 500ms', async () => {
      const [project] = await db.select('projects', { limit: 1 });
      const [theme] = await db.select('design_themes', { limit: 1 });

      const tokens = Array.from({ length: 500 }, (_, i) => ({
        project_id: project.id,
        theme_id: theme.id,
        name: `bulk.token.${i}`,
        type: 'spacing',
        value: { value: i * 4, unit: 'px' },
        scope: 'raw',
      }));

      const start = performance.now();
      const count = await db.rpc('bulk_upsert_tokens', {
        p_tokens: tokens,
      });
      const duration = performance.now() - start;

      console.log(`✅ Bulk upserted ${count} tokens in ${duration.toFixed(2)}ms`);
      expect(count).toBe(500);
      expect(duration).toBeLessThan(500); // < 500ms
    });
  });
});
```

#### RPC 성능 기준 (권장)

| RPC 함수 | 데이터 크기 | 목표 시간 | 허용 시간 |
|----------|------------|----------|----------|
| `resolve_theme_tokens` | 1,000 토큰 | < 100ms | < 200ms |
| `resolve_theme_tokens` (5-level) | 250 토큰 | < 200ms | < 500ms |
| `duplicate_theme` (복사) | 1,000 토큰 | < 500ms | < 1초 |
| `duplicate_theme` (상속) | 0 토큰 | < 20ms | < 50ms |
| `search_tokens` | 1,000 토큰 | < 50ms | < 100ms |
| `bulk_upsert_tokens` | 500 토큰 | < 200ms | < 500ms |

---

### 1.3. 동시성 테스트

#### 테스트 시나리오

```typescript
// tests/benchmarks/concurrency.test.ts
import { performance } from 'perf_hooks';
import { db } from '../../src/services/database';

describe('PGlite Concurrency Tests', () => {
  it('should handle 10 concurrent inserts without errors', async () => {
    const [project] = await db.insert('projects', { name: 'Concurrency Test' });

    const start = performance.now();

    // 10개 동시 삽입
    const promises = Array.from({ length: 10 }, (_, i) =>
      db.insert('elements', {
        page_id: project.id,
        tag: 'Button',
        props: { label: `Button ${i}` },
        order_num: i,
      })
    );

    const results = await Promise.all(promises);
    const duration = performance.now() - start;

    console.log(`✅ 10 concurrent inserts completed in ${duration.toFixed(2)}ms`);
    expect(results.length).toBe(10);
    expect(duration).toBeLessThan(200); // < 200ms
  });

  it('should handle transaction isolation correctly', async () => {
    const [project] = await db.insert('projects', { name: 'Transaction Test' });
    const [element] = await db.insert('elements', {
      page_id: project.id,
      tag: 'Counter',
      props: { count: 0 },
      order_num: 0,
    });

    // 2개 트랜잭션 동시 실행 (카운터 증가)
    const tx1 = db.transaction(async (tx) => {
      const [el] = await tx.query('SELECT * FROM elements WHERE id = $1', [element.id]);
      await new Promise(resolve => setTimeout(resolve, 100)); // 의도적 지연
      await tx.query('UPDATE elements SET props = $1 WHERE id = $2', [
        JSON.stringify({ count: el.props.count + 1 }),
        element.id,
      ]);
    });

    const tx2 = db.transaction(async (tx) => {
      const [el] = await tx.query('SELECT * FROM elements WHERE id = $1', [element.id]);
      await new Promise(resolve => setTimeout(resolve, 100)); // 의도적 지연
      await tx.query('UPDATE elements SET props = $1 WHERE id = $2', [
        JSON.stringify({ count: el.props.count + 1 }),
        element.id,
      ]);
    });

    await Promise.all([tx1, tx2]);

    // 최종 카운트 확인
    const [finalElement] = await db.query('SELECT * FROM elements WHERE id = $1', [element.id]);

    console.log(`✅ Final count: ${finalElement.props.count}`);

    // 트랜잭션 격리로 인해 카운트가 2여야 함
    expect(finalElement.props.count).toBe(2);
  });
});
```

---

### 1.4. 대용량 데이터 처리

#### 테스트 시나리오

```typescript
// tests/benchmarks/large-data.test.ts
import { performance } from 'perf_hooks';
import { db } from '../../src/services/database';

describe('PGlite Large Data Tests', () => {
  it('should handle 100,000 elements without memory issues', async () => {
    const [project] = await db.insert('projects', { name: 'Large Data Test' });
    const [page] = await db.insert('pages', {
      project_id: project.id,
      title: 'Large Page',
      slug: 'large-page',
    });

    const batchSize = 1000;
    const totalElements = 100000;

    const start = performance.now();

    for (let i = 0; i < totalElements; i += batchSize) {
      const batch = Array.from({ length: batchSize }, (_, j) => ({
        page_id: page.id,
        tag: 'Text',
        props: { content: `Text ${i + j}` },
        order_num: i + j,
      }));

      await db.insert('elements', batch);

      // 메모리 사용량 체크
      if (i % 10000 === 0) {
        const memUsage = process.memoryUsage();
        console.log(`   ${i} elements inserted - Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      }
    }

    const duration = performance.now() - start;

    console.log(`✅ Inserted 100,000 elements in ${(duration / 1000).toFixed(2)}s`);
    expect(duration).toBeLessThan(60000); // < 60초

    // 데이터베이스 크기 확인
    const dbSize = await db.getDbSize();
    console.log(`   Database size: ${(dbSize / 1024 / 1024).toFixed(2)} MB`);
  });

  it('should query 100,000 elements with pagination efficiently', async () => {
    const pageSize = 100;
    const totalPages = 1000; // 100,000 / 100 = 1,000 페이지

    const start = performance.now();

    for (let page = 0; page < 10; page++) { // 처음 10 페이지만 테스트
      const results = await db.query(
        'SELECT * FROM elements ORDER BY order_num LIMIT $1 OFFSET $2',
        [pageSize, page * pageSize]
      );

      expect(results.length).toBe(pageSize);
    }

    const duration = performance.now() - start;

    console.log(`✅ Paginated through 1,000 elements in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(500); // < 500ms for 10 pages
  });
});
```

---

## 2️⃣ 데이터 관리 전략

### 2.1. 저장 경로 정책

#### 운영 체제별 기본 경로

```typescript
// src/services/database/paths.ts

/**
 * Get PGlite database path based on OS
 */
export function getDefaultDbPath(): string {
  const platform = process.platform;
  const appName = 'xstudio';

  switch (platform) {
    case 'darwin': // macOS
      return `${process.env.HOME}/Library/Application Support/${appName}/database`;

    case 'win32': // Windows
      return `${process.env.APPDATA}\\${appName}\\database`;

    case 'linux': // Linux
      return `${process.env.HOME}/.config/${appName}/database`;

    default:
      return `./${appName}.pglite`;
  }
}

/**
 * Get backup directory path
 */
export function getBackupPath(): string {
  const dbPath = getDefaultDbPath();
  const backupDir = `${dbPath}_backups`;

  // Create backup directory if not exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  return backupDir;
}
```

#### 사용자 정의 경로 설정

```typescript
// electron/main.ts

import { app, dialog } from 'electron';

// Settings 메뉴에 추가
ipcMain.handle('db:change-path', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Database Location',
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const newPath = result.filePaths[0];

    // 기존 데이터베이스 백업
    await backupDatabase();

    // 새 경로로 이동
    await moveDatabase(getCurrentDbPath(), newPath);

    // 설정 저장
    app.setPath('userData', newPath);

    return { success: true, path: newPath };
  }

  return { success: false };
});
```

---

### 2.2. 백업 전략

#### 자동 백업 시스템

```typescript
// src/services/backup/autoBackup.ts

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../database';
import { getBackupPath } from '../database/paths';

export class AutoBackupService {
  private backupInterval: NodeJS.Timeout | null = null;

  /**
   * Start automatic backup
   *
   * @param intervalHours - Backup interval in hours (default: 24)
   * @param maxBackups - Maximum number of backups to keep (default: 7)
   */
  start(intervalHours: number = 24, maxBackups: number = 7) {
    // 이미 실행 중이면 중지
    if (this.backupInterval) {
      this.stop();
    }

    // 즉시 백업 실행
    this.createBackup(maxBackups);

    // 주기적 백업 시작
    this.backupInterval = setInterval(() => {
      this.createBackup(maxBackups);
    }, intervalHours * 60 * 60 * 1000);

    console.log(`✅ Auto backup started (interval: ${intervalHours}h, max: ${maxBackups})`);
  }

  /**
   * Stop automatic backup
   */
  stop() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      console.log('✅ Auto backup stopped');
    }
  }

  /**
   * Create manual backup
   */
  async createBackup(maxBackups: number = 7): Promise<string> {
    const backupDir = getBackupPath();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `xstudio_backup_${timestamp}.pglite`;
    const backupPath = path.join(backupDir, backupName);

    try {
      // 1. VACUUM 실행 (데이터베이스 최적화)
      await db.vacuum();

      // 2. 데이터베이스 파일 복사
      const dbPath = await db.getDbPath();
      await this.copyDirectory(dbPath, backupPath);

      console.log(`✅ Backup created: ${backupPath}`);

      // 3. 오래된 백업 삭제
      await this.cleanOldBackups(backupDir, maxBackups);

      return backupPath;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupPath: string): Promise<void> {
    try {
      // 1. 데이터베이스 연결 종료
      await db.close();

      // 2. 현재 데이터베이스 백업 (안전망)
      const currentDbPath = await db.getDbPath();
      const safetyBackup = `${currentDbPath}_before_restore`;
      await this.copyDirectory(currentDbPath, safetyBackup);

      // 3. 백업에서 복원
      await this.copyDirectory(backupPath, currentDbPath);

      // 4. 데이터베이스 재연결
      await db.initialize();

      console.log(`✅ Restored from backup: ${backupPath}`);
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw error;
    }
  }

  /**
   * List all backups
   */
  async listBackups(): Promise<Array<{ name: string; path: string; size: number; date: Date }>> {
    const backupDir = getBackupPath();
    const files = fs.readdirSync(backupDir);

    const backups = files
      .filter(file => file.startsWith('xstudio_backup_') && file.endsWith('.pglite'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);

        return {
          name: file,
          path: filePath,
          size: stats.size,
          date: stats.mtime,
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    return backups;
  }

  /**
   * Delete old backups
   */
  private async cleanOldBackups(backupDir: string, maxBackups: number): Promise<void> {
    const backups = await this.listBackups();

    if (backups.length > maxBackups) {
      const toDelete = backups.slice(maxBackups);

      for (const backup of toDelete) {
        fs.rmSync(backup.path, { recursive: true, force: true });
        console.log(`🗑️ Deleted old backup: ${backup.name}`);
      }
    }
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    if (fs.statSync(src).isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      const files = fs.readdirSync(src);

      for (const file of files) {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        await this.copyDirectory(srcPath, destPath);
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

// Export singleton
export const autoBackup = new AutoBackupService();
```

#### Electron Main Process 통합

```typescript
// electron/main.ts

import { autoBackup } from '../src/services/backup/autoBackup';

app.whenReady().then(async () => {
  // 데이터베이스 초기화
  await initializeDatabase();

  // 자동 백업 시작 (24시간마다, 최대 7개 보관)
  autoBackup.start(24, 7);

  createWindow();
});

// IPC 핸들러 추가
ipcMain.handle('backup:create', async () => {
  const backupPath = await autoBackup.createBackup();
  return { success: true, path: backupPath };
});

ipcMain.handle('backup:list', async () => {
  return await autoBackup.listBackups();
});

ipcMain.handle('backup:restore', async (_event, backupPath: string) => {
  await autoBackup.restoreBackup(backupPath);
  return { success: true };
});
```

---

### 2.3. 데이터 마이그레이션

#### Export/Import 기능

```typescript
// src/services/database/exportImport.ts

import * as fs from 'fs';
import { db } from './index';

export class ExportImportService {
  /**
   * Export database to JSON
   */
  async exportToJson(filePath: string): Promise<void> {
    const data: any = {};

    // 모든 테이블 데이터 추출
    const tables = ['projects', 'pages', 'elements', 'design_themes', 'design_tokens'];

    for (const table of tables) {
      data[table] = await db.select(table);
    }

    // JSON 파일로 저장
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Exported to ${filePath}`);
  }

  /**
   * Import database from JSON
   */
  async importFromJson(filePath: string): Promise<void> {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    await db.transaction(async (tx) => {
      // 기존 데이터 삭제 (역순으로)
      await tx.query('DELETE FROM design_tokens');
      await tx.query('DELETE FROM design_themes');
      await tx.query('DELETE FROM elements');
      await tx.query('DELETE FROM pages');
      await tx.query('DELETE FROM projects');

      // 새 데이터 삽입 (순서대로)
      const tables = ['projects', 'pages', 'elements', 'design_themes', 'design_tokens'];

      for (const table of tables) {
        if (data[table] && data[table].length > 0) {
          await tx.insert(table, data[table]);
        }
      }
    });

    console.log(`✅ Imported from ${filePath}`);
  }

  /**
   * Export to SQL dump
   */
  async exportToSql(filePath: string): Promise<void> {
    // pg_dump 스타일 SQL 생성
    const tables = ['projects', 'pages', 'elements', 'design_themes', 'design_tokens'];
    let sql = '';

    for (const table of tables) {
      const rows = await db.select(table);

      if (rows.length > 0) {
        sql += `-- Table: ${table}\n`;
        sql += `DELETE FROM ${table};\n`;

        for (const row of rows) {
          const keys = Object.keys(row);
          const values = keys.map(key => {
            const value = row[key];
            if (value === null) return 'NULL';
            if (typeof value === 'object') return `'${JSON.stringify(value)}'::jsonb`;
            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
            return value;
          });

          sql += `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${values.join(', ')});\n`;
        }

        sql += '\n';
      }
    }

    fs.writeFileSync(filePath, sql);
    console.log(`✅ Exported SQL to ${filePath}`);
  }
}

export const exportImport = new ExportImportService();
```

---

### 2.4. 디스크 공간 관리

#### 데이터베이스 크기 모니터링

```typescript
// src/services/database/monitoring.ts

import { db } from './index';

export class DatabaseMonitoring {
  /**
   * Get database size statistics
   */
  async getSizeStats(): Promise<{
    totalSize: number;
    tablesSizes: Array<{ table: string; size: number }>;
    indexesSize: number;
  }> {
    const totalSize = await db.getDbSize();

    // 테이블별 크기
    const tables = ['projects', 'pages', 'elements', 'design_themes', 'design_tokens'];
    const tablesSizes: Array<{ table: string; size: number }> = [];

    for (const table of tables) {
      const result = await db.query(`
        SELECT pg_total_relation_size('${table}') as size
      `);
      tablesSizes.push({ table, size: parseInt(result[0].size) });
    }

    // 인덱스 크기
    const indexResult = await db.query(`
      SELECT SUM(pg_indexes_size(tablename::regclass)) as size
      FROM pg_tables
      WHERE schemaname = 'public'
    `);
    const indexesSize = parseInt(indexResult[0].size || '0');

    return {
      totalSize,
      tablesSizes,
      indexesSize,
    };
  }

  /**
   * Vacuum and analyze database
   */
  async optimize(): Promise<void> {
    await db.vacuum();
    await db.query('ANALYZE');
    console.log('✅ Database optimized');
  }

  /**
   * Check if cleanup is needed
   */
  async needsCleanup(maxSizeMb: number = 500): Promise<boolean> {
    const stats = await this.getSizeStats();
    const sizeMb = stats.totalSize / 1024 / 1024;

    return sizeMb > maxSizeMb;
  }
}

export const dbMonitoring = new DatabaseMonitoring();
```

---

## 3️⃣ 동기화 프로토타입

### 3.1. 증분 동기화 설계

#### 변경 추적 시스템

```typescript
// src/services/sync/changeTracking.ts

/**
 * Change Log Table Schema
 */
export interface ChangeLog {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  synced: boolean;
  created_at: Date;
}

/**
 * Setup change tracking triggers
 */
export async function setupChangeTracking(db: any): Promise<void> {
  // 변경 로그 테이블 생성
  await db.query(`
    CREATE TABLE IF NOT EXISTS _change_log (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      table_name TEXT NOT NULL,
      record_id UUID NOT NULL,
      operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
      data JSONB,
      synced BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_change_log_synced ON _change_log(synced);
    CREATE INDEX IF NOT EXISTS idx_change_log_table ON _change_log(table_name);
  `);

  // 트리거 함수 생성
  await db.query(`
    CREATE OR REPLACE FUNCTION log_change()
    RETURNS TRIGGER AS $$
    BEGIN
      IF (TG_OP = 'DELETE') THEN
        INSERT INTO _change_log (table_name, record_id, operation, data)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD));
        RETURN OLD;
      ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO _change_log (table_name, record_id, operation, data)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(NEW));
        RETURN NEW;
      ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO _change_log (table_name, record_id, operation, data)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW));
        RETURN NEW;
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 각 테이블에 트리거 추가
  const tables = ['projects', 'pages', 'elements', 'design_themes', 'design_tokens'];

  for (const table of tables) {
    await db.query(`
      DROP TRIGGER IF EXISTS ${table}_change_log ON ${table};
      CREATE TRIGGER ${table}_change_log
        AFTER INSERT OR UPDATE OR DELETE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION log_change();
    `);
  }

  console.log('✅ Change tracking setup complete');
}
```

#### 동기화 서비스

```typescript
// src/services/sync/syncService.ts

import { db as localDb } from '../database';
import { supabase } from '../database/supabaseAdapter';

export class SyncService {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;

  /**
   * Start automatic sync
   */
  start(intervalMinutes: number = 5) {
    if (this.syncInterval) {
      this.stop();
    }

    // 즉시 동기화 실행
    this.sync();

    // 주기적 동기화
    this.syncInterval = setInterval(() => {
      this.sync();
    }, intervalMinutes * 60 * 1000);

    console.log(`✅ Auto sync started (interval: ${intervalMinutes}min)`);
  }

  /**
   * Stop automatic sync
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('✅ Auto sync stopped');
    }
  }

  /**
   * Manual sync
   */
  async sync(): Promise<{ pushed: number; pulled: number; conflicts: number }> {
    if (this.isSyncing) {
      console.log('⚠️ Sync already in progress');
      return { pushed: 0, pulled: 0, conflicts: 0 };
    }

    this.isSyncing = true;

    try {
      console.log('🔄 Starting sync...');

      // 1. Push local changes to Supabase
      const pushed = await this.pushChanges();

      // 2. Pull remote changes from Supabase
      const pulled = await this.pullChanges();

      // 3. Resolve conflicts
      const conflicts = await this.resolveConflicts();

      console.log(`✅ Sync complete: Pushed ${pushed}, Pulled ${pulled}, Conflicts ${conflicts}`);

      return { pushed, pulled, conflicts };
    } catch (error) {
      console.error('❌ Sync failed:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Push local changes to Supabase
   */
  private async pushChanges(): Promise<number> {
    // 동기화되지 않은 변경사항 가져오기
    const changes = await localDb.query<ChangeLog>(
      'SELECT * FROM _change_log WHERE synced = FALSE ORDER BY created_at ASC'
    );

    let pushedCount = 0;

    for (const change of changes) {
      try {
        switch (change.operation) {
          case 'INSERT':
            await supabase.insert(change.table_name, change.data);
            break;

          case 'UPDATE':
            await supabase.update(change.table_name, change.record_id, change.data);
            break;

          case 'DELETE':
            await supabase.delete(change.table_name, change.record_id);
            break;
        }

        // 동기화 완료 표시
        await localDb.query(
          'UPDATE _change_log SET synced = TRUE WHERE id = $1',
          [change.id]
        );

        pushedCount++;
      } catch (error) {
        console.error(`❌ Failed to push change ${change.id}:`, error);
        // 계속 진행 (다음 동기화 때 재시도)
      }
    }

    return pushedCount;
  }

  /**
   * Pull remote changes from Supabase
   */
  private async pullChanges(): Promise<number> {
    // 마지막 동기화 시간 이후 변경사항 가져오기
    const lastSync = await this.getLastSyncTime();
    const tables = ['projects', 'pages', 'elements', 'design_themes', 'design_tokens'];

    let pulledCount = 0;

    for (const table of tables) {
      const remoteData = await supabase.select(table, {
        // updated_at > lastSync
      });

      for (const record of remoteData) {
        // 로컬에 존재하는지 확인
        const localRecord = await localDb.select(table, {
          where: { id: record.id },
        });

        if (localRecord.length === 0) {
          // 새 레코드 삽입
          await localDb.insert(table, record);
          pulledCount++;
        } else if (new Date(record.updated_at) > new Date(localRecord[0].updated_at)) {
          // 업데이트된 레코드 갱신
          await localDb.update(table, record.id, record);
          pulledCount++;
        }
      }
    }

    // 마지막 동기화 시간 업데이트
    await this.updateLastSyncTime();

    return pulledCount;
  }

  /**
   * Resolve conflicts
   */
  private async resolveConflicts(): Promise<number> {
    // TODO: 충돌 해결 로직 구현
    // 1. 동일한 레코드가 로컬/원격 모두에서 수정된 경우 감지
    // 2. 충돌 해결 정책 적용 (타임스탬프 우선, 사용자 선택 등)
    return 0;
  }

  /**
   * Get last sync time
   */
  private async getLastSyncTime(): Promise<Date> {
    const result = await localDb.query(`
      SELECT value FROM _sync_metadata WHERE key = 'last_sync_time'
    `);

    if (result.length === 0) {
      return new Date(0); // 1970-01-01 (최초 동기화)
    }

    return new Date(result[0].value);
  }

  /**
   * Update last sync time
   */
  private async updateLastSyncTime(): Promise<void> {
    await localDb.query(`
      INSERT INTO _sync_metadata (key, value)
      VALUES ('last_sync_time', $1)
      ON CONFLICT (key) DO UPDATE SET value = $1
    `, [new Date().toISOString()]);
  }
}

export const syncService = new SyncService();
```

---

### 3.2. 충돌 해결 정책

#### 충돌 유형 및 해결 전략

```typescript
// src/services/sync/conflictResolution.ts

export type ConflictResolutionStrategy =
  | 'local-wins'      // 로컬 우선
  | 'remote-wins'     // 원격 우선
  | 'timestamp-wins'  // 최신 타임스탬프 우선
  | 'manual';         // 사용자 선택

export interface Conflict {
  table: string;
  recordId: string;
  localData: any;
  remoteData: any;
  localUpdatedAt: Date;
  remoteUpdatedAt: Date;
}

export class ConflictResolver {
  constructor(private strategy: ConflictResolutionStrategy = 'timestamp-wins') {}

  /**
   * Resolve conflict
   */
  async resolve(conflict: Conflict): Promise<any> {
    switch (this.strategy) {
      case 'local-wins':
        return conflict.localData;

      case 'remote-wins':
        return conflict.remoteData;

      case 'timestamp-wins':
        return conflict.localUpdatedAt > conflict.remoteUpdatedAt
          ? conflict.localData
          : conflict.remoteData;

      case 'manual':
        return await this.manualResolve(conflict);

      default:
        throw new Error(`Unknown strategy: ${this.strategy}`);
    }
  }

  /**
   * Manual conflict resolution (UI required)
   */
  private async manualResolve(conflict: Conflict): Promise<any> {
    // Electron에서 IPC로 UI에 충돌 알림
    // 사용자가 선택할 때까지 대기
    // TODO: UI 구현 필요

    return conflict.localData; // 임시: 로컬 우선
  }
}
```

---

### 3.3. 오프라인 큐잉

#### 오프라인 작업 큐

```typescript
// src/services/sync/offlineQueue.ts

export interface QueuedOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  createdAt: Date;
  retryCount: number;
}

export class OfflineQueue {
  private queue: QueuedOperation[] = [];

  /**
   * Add operation to queue
   */
  add(operation: Omit<QueuedOperation, 'id' | 'createdAt' | 'retryCount'>) {
    this.queue.push({
      ...operation,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      retryCount: 0,
    });

    console.log(`➕ Added to offline queue: ${operation.type} ${operation.table}`);
  }

  /**
   * Process queue (when online)
   */
  async process(): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const operation of this.queue) {
      try {
        // Supabase에 업로드
        await this.uploadOperation(operation);

        // 큐에서 제거
        this.queue = this.queue.filter(op => op.id !== operation.id);
        success++;
      } catch (error) {
        console.error(`❌ Failed to process ${operation.id}:`, error);

        operation.retryCount++;

        if (operation.retryCount >= 3) {
          // 3회 실패 시 큐에서 제거
          this.queue = this.queue.filter(op => op.id !== operation.id);
          failed++;
        }
      }
    }

    console.log(`✅ Processed queue: ${success} success, ${failed} failed`);

    return { success, failed };
  }

  /**
   * Upload operation to Supabase
   */
  private async uploadOperation(operation: QueuedOperation): Promise<void> {
    const { type, table, data } = operation;

    switch (type) {
      case 'CREATE':
        await supabase.insert(table, data);
        break;

      case 'UPDATE':
        await supabase.update(table, data.id, data);
        break;

      case 'DELETE':
        await supabase.delete(table, data.id);
        break;
    }
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Clear queue
   */
  clear() {
    this.queue = [];
  }
}

export const offlineQueue = new OfflineQueue();
```

---

## 4️⃣ 안정성 테스트

### 4.1. 크래시 복구 테스트

```typescript
// tests/stability/crash-recovery.test.ts

describe('Crash Recovery Tests', () => {
  it('should recover from sudden shutdown during write', async () => {
    // 트랜잭션 중간에 강제 종료 시뮬레이션
    // ...
  });

  it('should maintain data integrity after power failure', async () => {
    // 전원 차단 시뮬레이션
    // ...
  });
});
```

### 4.2. 데이터 무결성 검증

```typescript
// tests/stability/data-integrity.test.ts

describe('Data Integrity Tests', () => {
  it('should maintain foreign key constraints', async () => {
    // 외래키 제약 조건 테스트
    // ...
  });

  it('should enforce unique constraints', async () => {
    // 고유 제약 조건 테스트
    // ...
  });
});
```

---

## ✅ 검증 완료 체크리스트

배포 전 모든 항목 완료 확인:

- [ ] 성능 벤치마킹 완료 (CRUD, RPC, 동시성, 대용량)
- [ ] 저장 경로 정책 수립
- [ ] 자동 백업 시스템 구현
- [ ] Export/Import 기능 구현
- [ ] 디스크 공간 모니터링 구현
- [ ] 변경 추적 시스템 구현
- [ ] 동기화 서비스 구현
- [ ] 충돌 해결 정책 수립
- [ ] 오프라인 큐잉 구현
- [ ] 크래시 복구 테스트 완료
- [ ] 데이터 무결성 검증 완료
- [ ] 프로덕션 배포 문서 작성

---

## 📚 추가 참고 자료

- [PGlite 공식 문서](https://github.com/electric-sql/pglite)
- [Electron 데이터 저장 Best Practices](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)
- [Offline-First 설계 패턴](https://offlinefirst.org/)

---

**작성자**: Claude Code
**작성일**: 2025-11-07
**버전**: 1.0.0
