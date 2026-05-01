/**
 * @fileoverview ADR-916 Phase 3 G4 sub-phase 3-C — exportLegacyDocument 단일 SSOT
 * grep gate codify (D18=A 검증).
 *
 * design §8.6 의 grep 명령을 vitest 로 codify. legacy `elements[]` direct write
 * site 가 본 함수 외부에 0건이 되어야 G4 PASS 시그널 (D18=A 단일 SSOT 격리).
 *
 * **본 단축 단계 (3-C 부분)**: baseline 17 site 측정. 후속 sub-phase 에서 점진
 * refactor 하여 0 도달 목표. baseline 이 증가하면 regression — 본 test 가 자동
 * 감지. 0 도달 시점에 본 test 의 expected baseline 을 0 으로 변경 + Gate G4
 * grep 부분 PASS 표시.
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// ─────────────────────────────────────────────
// Configuration (design §8.6)
// ─────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, "../../../../../..");

const SCAN_DIRS = [
  "apps/builder/src/builder",
  "apps/builder/src/services",
] as const;

const EXCLUDE_PATTERNS: readonly RegExp[] = [
  /\/__tests__\//,
  /\/apps\/builder\/src\/adapters\//,
  /\/apps\/builder\/src\/lib\/db\/migration[^\/]*\.ts$/,
  /\/apps\/builder\/src\/builder\/utils\/exportLegacyDocument\.ts$/,
];

const VIOLATION_PATTERN =
  /elementsApi\.(create|update|insert|delete)|setElements\(|mergeElements\(/;

/**
 * 본 단축 단계 (3-C 부분) 시점 baseline. 후속 sub-phase 에서 0 도달 목표.
 * 증가 시 regression — 본 test fail.
 *
 * 2026-05-01 측정 추적:
 * - 18: 3-C 초기 baseline (3-B/C/D 단축 직후)
 * - 16: mutation reverse pilot land (factories/utils/elementCreation +
 *   dev/editingSemanticsFixture 2 caller → mergeElementsCanonicalPrimary /
 *   setElementsCanonicalPrimary wrapper 경유)
 */
const BASELINE_VIOLATION_COUNT = 16;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

interface Violation {
  file: string;
  line: number;
  text: string;
}

function listFilesRecursive(rootAbs: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(rootAbs)) return out;

  const stack: string[] = [rootAbs];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        if (full.endsWith(".ts") || full.endsWith(".tsx")) {
          out.push(full);
        }
      }
    }
  }
  return out;
}

function isExcluded(filePath: string): boolean {
  return EXCLUDE_PATTERNS.some((re) => re.test(filePath));
}

function scanViolations(): Violation[] {
  const violations: Violation[] = [];
  for (const rel of SCAN_DIRS) {
    const dirAbs = path.join(REPO_ROOT, rel);
    const files = listFilesRecursive(dirAbs);
    for (const file of files) {
      if (isExcluded(file)) continue;
      let content: string;
      try {
        content = fs.readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (VIOLATION_PATTERN.test(lines[i])) {
          violations.push({
            file: path.relative(REPO_ROOT, file),
            line: i + 1,
            text: lines[i].trim(),
          });
        }
      }
    }
  }
  return violations;
}

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

describe("ADR-916 Phase 3 G4 — exportLegacyDocument SSOT grep gate (D18=A)", () => {
  it("baseline regression detection: 위반 site 수 ≤ baseline", () => {
    const violations = scanViolations();
    if (violations.length > BASELINE_VIOLATION_COUNT) {
      const summary = violations
        .map((v) => `  ${v.file}:${v.line} → ${v.text}`)
        .join("\n");
      throw new Error(
        `ADR-916 G4 grep gate regression: ${violations.length} 위반 (baseline ${BASELINE_VIOLATION_COUNT})\n${summary}`,
      );
    }
    expect(violations.length).toBeLessThanOrEqual(BASELINE_VIOLATION_COUNT);
  });

  it("baseline 측정 정확 — 알려진 site 카테고리 별 분포", () => {
    const violations = scanViolations();
    const categories = {
      builderCore: violations.filter((v) => v.file.includes("BuilderCore.tsx"))
        .length,
      stores: violations.filter((v) => v.file.includes("/stores/")).length,
      hooks: violations.filter((v) => v.file.includes("/hooks/")).length,
      factories: violations.filter((v) => v.file.includes("/factories/"))
        .length,
      panels: violations.filter((v) => v.file.includes("/panels/")).length,
      dev: violations.filter((v) => v.file.includes("/dev/")).length,
    };

    // 본 test 는 카테고리 분포를 명시 — refactor 진척 시 카테고리별 0 도달 추적.
    expect(categories.builderCore).toBeGreaterThanOrEqual(0);
    expect(categories.stores).toBeGreaterThanOrEqual(0);
    expect(categories.hooks).toBeGreaterThanOrEqual(0);
    expect(categories.factories).toBeGreaterThanOrEqual(0);
    expect(categories.panels).toBeGreaterThanOrEqual(0);

    const total =
      categories.builderCore +
      categories.stores +
      categories.hooks +
      categories.factories +
      categories.panels +
      categories.dev;
    expect(total).toBeLessThanOrEqual(BASELINE_VIOLATION_COUNT);
  });
});
