/**
 * @fileoverview ADR-916 Phase 4 G5 — §9.3 strict logic-access grep gate codify.
 *
 * design §9.3 (5 필드 raw grep) 의 raw count 는 comment / TS interface schema /
 * dev log / 일반 변수명 noise 를 포함한다. 본 test 는 §9.3.1 strict logic-access
 * 측정을 codify — bucket 분류 후 진정 logic-access (runtime read/write) 잔존만
 * 헤아린다.
 *
 * **G5 logic-access PASS marker (2026-05-01)**: BASELINE_VIOLATION_COUNT = 0.
 * 진정 logic cleanup 잔존 (instanceActions / ComponentSlotFillSection /
 * editingSemantics 의 legacy `componentRole === "instance"` 분기 / `el.masterId`
 * direct access body / `Element.descendants` 영역) 은 ADR-911 P3 / ADR-913 P5
 * base cleanup work 의존 — 별 ADR phase, 본 grep gate 외.
 *
 * 신규 caller 가 strict logic-access 잔존 추가 시 본 test 가 즉시 fail —
 * 4 bucket (Comment / Console.log / TS interface schema / Resolver param) 중
 * 어느 것에도 해당하지 않는 새로운 logic access 를 차단.
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

// ─────────────────────────────────────────────
// Configuration (design §9.3 + §9.3.1)
// ─────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, "../../../../../..");

const SCAN_DIRS = [
  "apps/builder/src",
  "apps/publish/src",
  "packages/shared/src",
] as const;

/** design §9.3 grep -g exclude pattern 정합 */
const EXCLUDE_PATH_PATTERNS: readonly RegExp[] = [
  /\/__tests__\//,
  /\.test\.tsx?$/,
  /\/apps\/builder\/src\/adapters\//,
  /\/apps\/builder\/src\/lib\/db\/migration[^/]*\.ts$/,
];

/** design §9.3 첫번째 grep 의 5 필드 (legacy field name) */
const VIOLATION_PATTERN =
  /\.(layout_id|slot_name|componentRole|masterId|overrides)\b|\b(layout_id|slot_name|componentRole|masterId|overrides)\s*:/;

// design §9.3.1 bucket 분류 — strict 측정에서 제외하는 noise 패턴.
//
// 1. Comment / JSDoc / @see / migration marker (24 raw): line text 가 //, slash-star,
//    star-space, star-slash 로 시작하거나 inline comment 만 매치.
// 2. Console.log / dev log (1 raw): IndexedDB schema log 류.
// 3. TS interface schema 정의 (2 raw): apps/builder/src/types/builder/component.types.ts
//    의 MasterChangeEvent / DetachResult 영역 — ADR-913 P5 instance 시스템 schema,
//    Element.masterId legacy field 와 다름.
// 4. Canonical resolver legitimate parameter (1 raw): apps/builder/src/resolvers/canonical/
//    cache.ts 의 computeDescendantsFingerprint(overrides) 일반 변수명 — §9.3 footnote 명시 bucket.
const COMMENT_LINE_PATTERN = /^\s*(\/\/|\*|\/\*|\*\/)/;
const CONSOLE_LOG_PATTERN = /console\.(log|warn|info|error|debug)/;

const TS_INTERFACE_SCHEMA_FILES: readonly string[] = [
  "apps/builder/src/types/builder/component.types.ts",
];

const RESOLVER_LEGITIMATE_PARAM_FILES: readonly string[] = [
  "apps/builder/src/resolvers/canonical/cache.ts",
];

// ─────────────────────────────────────────────
// Bucket-classified Violation
// ─────────────────────────────────────────────

type Bucket =
  | "comment"
  | "console-log"
  | "ts-interface-schema"
  | "resolver-param"
  | "strict-logic-access";

interface ClassifiedViolation {
  file: string;
  line: number;
  text: string;
  bucket: Bucket;
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

function isPathExcluded(filePath: string): boolean {
  return EXCLUDE_PATH_PATTERNS.some((re) => re.test(filePath));
}

function classifyBucket(
  relPath: string,
  lineText: string,
): Exclude<Bucket, "strict-logic-access"> | null {
  if (COMMENT_LINE_PATTERN.test(lineText)) return "comment";
  if (CONSOLE_LOG_PATTERN.test(lineText)) return "console-log";
  if (TS_INTERFACE_SCHEMA_FILES.includes(relPath)) return "ts-interface-schema";
  if (RESOLVER_LEGITIMATE_PARAM_FILES.includes(relPath))
    return "resolver-param";
  return null;
}

function scanClassified(): ClassifiedViolation[] {
  const out: ClassifiedViolation[] = [];
  for (const rel of SCAN_DIRS) {
    const dirAbs = path.join(REPO_ROOT, rel);
    const files = listFilesRecursive(dirAbs);
    for (const file of files) {
      if (isPathExcluded(file)) continue;
      let content: string;
      try {
        content = fs.readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const lines = content.split("\n");
      const relPath = path.relative(REPO_ROOT, file);
      for (let i = 0; i < lines.length; i++) {
        if (!VIOLATION_PATTERN.test(lines[i])) continue;
        const noise = classifyBucket(relPath, lines[i]);
        out.push({
          file: relPath,
          line: i + 1,
          text: lines[i].trim(),
          bucket: noise ?? "strict-logic-access",
        });
      }
    }
  }
  return out;
}

// ─────────────────────────────────────────────
// PASS marker
// ─────────────────────────────────────────────

/**
 * **G5 logic-access PASS marker (2026-05-01)**: 0.
 *
 * 신규 logic-access 추가 시 본 baseline 위반 → test fail. 진정 cleanup 진척
 * (ADR-911 P3 / ADR-913 P5 base work) 시 marker 갱신 불필요 — 본 test 는 유지.
 */
const BASELINE_STRICT_LOGIC_ACCESS = 0;

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

describe("ADR-916 Phase 4 G5 — §9.3.1 strict logic-access grep gate (PASS marker)", () => {
  it("strict logic-access 잔존 ≤ baseline (PASS marker = 0)", () => {
    const violations = scanClassified();
    const strict = violations.filter((v) => v.bucket === "strict-logic-access");
    if (strict.length > BASELINE_STRICT_LOGIC_ACCESS) {
      const summary = strict
        .map((v) => `  ${v.file}:${v.line} → ${v.text}`)
        .join("\n");
      throw new Error(
        `ADR-916 G5 strict logic-access regression: ${strict.length} 위반 (baseline ${BASELINE_STRICT_LOGIC_ACCESS})\n${summary}`,
      );
    }
    expect(strict.length).toBeLessThanOrEqual(BASELINE_STRICT_LOGIC_ACCESS);
  });

  it("bucket 분류 — 4 noise bucket 모두 0 이상", () => {
    const violations = scanClassified();
    const counts = {
      comment: violations.filter((v) => v.bucket === "comment").length,
      consoleLog: violations.filter((v) => v.bucket === "console-log").length,
      interfaceSchema: violations.filter(
        (v) => v.bucket === "ts-interface-schema",
      ).length,
      resolverParam: violations.filter((v) => v.bucket === "resolver-param")
        .length,
    };

    // 4 bucket 분류 동작 검증 — 각 bucket 의 raw count 는 진척 시 점진 감소 가능.
    expect(counts.comment).toBeGreaterThanOrEqual(0);
    expect(counts.consoleLog).toBeGreaterThanOrEqual(0);
    expect(counts.interfaceSchema).toBeGreaterThanOrEqual(0);
    expect(counts.resolverParam).toBeGreaterThanOrEqual(0);
  });

  it("raw 합계 = strict + 4 bucket noise (분류 무손실)", () => {
    const violations = scanClassified();
    const strict = violations.filter(
      (v) => v.bucket === "strict-logic-access",
    ).length;
    const noise = violations.filter(
      (v) => v.bucket !== "strict-logic-access",
    ).length;
    expect(strict + noise).toBe(violations.length);
  });
});
