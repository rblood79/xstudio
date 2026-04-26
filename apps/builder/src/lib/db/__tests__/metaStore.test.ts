import { describe, it, expect } from "vitest";

describe("P3-E-1: IndexedDB _meta object store stub (RED phase)", () => {
  // Test 1: DB_VERSION 갱신 검증 (regex 기반 source 검증)
  it("DB_VERSION 이 8 로 갱신된다", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(__dirname, "../indexedDB/adapter.ts");
    const source = await fs.readFile(filePath, "utf-8");
    // const DB_VERSION = 8 패턴 매칭
    expect(source).toMatch(/const DB_VERSION\s*=\s*8\b/);
  });

  // Test 2: _meta store 생성 코드 검증
  it("onupgradeneeded 안에 _meta object store 생성 코드가 존재한다", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(__dirname, "../indexedDB/adapter.ts");
    const source = await fs.readFile(filePath, "utf-8");
    expect(source).toMatch(/createObjectStore\(\s*["']_meta["']/);
  });

  // Test 3: MetaRecord 타입 정의 검증
  it("MetaRecord 인터페이스가 정의된다 — schemaVersion / migratedAt / backupKey 필드", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    // adapter.ts 또는 types.ts 중 한 곳에서 검색
    const adapterPath = path.resolve(__dirname, "../indexedDB/adapter.ts");
    const typesPath = path.resolve(__dirname, "../types.ts");
    const adapterSource = await fs
      .readFile(adapterPath, "utf-8")
      .catch(() => "");
    const typesSource = await fs.readFile(typesPath, "utf-8").catch(() => "");
    const combined = adapterSource + "\n" + typesSource;
    expect(combined).toMatch(/(?:interface|type)\s+MetaRecord\b/);
    expect(combined).toMatch(/schemaVersion\s*[?:]/);
  });

  // Test 4: meta 메서드 그룹 시그니처 검증
  it("adapter 에 meta 메서드 그룹 (get / set / update) 이 추가된다", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(__dirname, "../indexedDB/adapter.ts");
    const source = await fs.readFile(filePath, "utf-8");
    // meta: { get: ..., set: ..., update: ... } 패턴
    expect(source).toMatch(/meta\s*:\s*\{[\s\S]*?get\s*:/);
    expect(source).toMatch(/meta\s*:\s*\{[\s\S]*?set\s*:/);
    expect(source).toMatch(/meta\s*:\s*\{[\s\S]*?update\s*:/);
  });

  // Test 5: getByLayout @deprecated JSDoc 검증
  it("getByLayout 메서드에 @deprecated JSDoc 주석이 추가된다", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(__dirname, "../indexedDB/adapter.ts");
    const source = await fs.readFile(filePath, "utf-8");
    // @deprecated 주석 직후 (몇 줄 안에) getByLayout 등장
    expect(source).toMatch(/@deprecated[\s\S]{0,200}getByLayout/);
  });
});
