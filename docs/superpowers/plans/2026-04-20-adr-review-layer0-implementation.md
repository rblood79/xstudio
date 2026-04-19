# ADR Review Layer 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** review-adr Phase 4 결과를 `docs/adr/reviews/NNN.md` 에 무손실 영속화하는 writer + validator + 백필 9개 + skill 통합.

**Architecture:** Node 22 stdin-JSON CLI writer (gray-matter 프론트매터 파싱) + fail-soft 에러 처리 + malformed 분리 저장. review-adr skill Phase 4 직후 Bash heredoc으로 writer 호출. 테스트는 Node 내장 `node:test` 사용 (의존성 0).

**Tech Stack:** Node 22.20 (node:test/assert/fs), gray-matter (신규 devDep), pnpm 10 monorepo 루트.

**Spec:** [docs/superpowers/specs/2026-04-20-adr-review-layer0-schema-design.md](../specs/2026-04-20-adr-review-layer0-schema-design.md)

---

## File Structure

```
.claude/scripts/adr-review/
├── writer.mjs              # save() 함수 + stdin-JSON CLI entry, REVIEWS_DIR override 지원
├── writer.test.mjs         # node:test 4 케이스 (신규/append/malformed/integration)
└── validate.mjs            # glob reviews/*.md → frontmatter 검증 CLI

.claude/skills/review-adr/
└── SKILL.md                # Phase 4 직후 "Phase 4.5: 결과 저장 (Layer 0)" 섹션 추가 (modify)

docs/adr/reviews/
├── README.md               # 스키마/taxonomy SSOT (신규)
├── 054.md ... 102.md       # 백필 9개 (신규)

package.json (root)         # devDependencies.gray-matter 추가 (modify)
```

**결정 근거 (spec §1.3, §3)**: writer는 `.claude/scripts/` 아래 개발 도구 위치 (app 런타임 아님). spec의 §4.1 frontmatter 스키마와 §4.2 9-taxonomy 를 writer/validate 양쪽에서 동일 상수로 유지.

---

## Backfill Data Table (Task 8에서 사용)

오늘 Explore agent 메타 분석 결과 — 각 ADR 의 명시적 CRITICAL/HIGH 이슈를 frontmatter issues 배열로 encoding.

| ADR | 제목                             |                  CRITICAL                   |                          HIGH                          | Outcome                                               |
| --- | -------------------------------- | :-----------------------------------------: | :----------------------------------------------------: | ----------------------------------------------------- |
| 054 | Local LLM Architecture           |                      0                      |               3 (기술/성능/마이그레이션)               | pending (ADR 자체 Proposed)                           |
| 056 | Base Typography SSOT             |                      0                      |                           0                            | — (리뷰 이슈 없음)                                    |
| 063 | SSOT Chain Charter               |                      0                      |                           0                            | —                                                     |
| 075 | Render longtask fan-out 해체     | 1 (기술: Phase 4 CanvasKit Worker 재초기화) |              3 (기술 2 / 마이그레이션 1)               | fixed (Phase 0 prod 실측으로 Phase 4 skip 정당화)     |
| 076 | ListBox items SSOT + Hybrid 해체 |  2 (기술 템플릿 직렬화 / 마이그레이션 BC)   | 2 (유지보수 수동 유지 80% / 자식 selector emit 미지원) | 일부 fixed (commit 2fdc2205), 일부 deferred → ADR-078 |
| 078 | ListBoxItem.spec 신설            |  1 (유지보수 ListBoxItem nested SSOT 복잡)  |                  2 (기술 / 유지보수)                   | pending                                               |
| 079 | Spec defaults read-through       |      1 (유지보수 4종 workaround 반복)       |                1 (유지보수 SSOT 이원화)                | fixed                                                 |
| 100 | Unified Skia Rendering           |                      0                      |                  1 (성능 DOM reflow)                   | fixed                                                 |
| 102 | Workspace Dot Background         |                      0                      |   6 (기술 2 / 성능 1 / 유지보수 2 / 마이그레이션 1)    | pending                                               |

각 ADR 의 상세 payload JSON 은 Task 8 각 step 에 명시됨.

---

## Task 1: 환경 준비 — gray-matter + 디렉터리

**Files:**

- Modify: `package.json` (root)
- Create: `.claude/scripts/adr-review/` 디렉터리 (빈)

- [ ] **Step 1: gray-matter devDep 추가**

Run:

```bash
pnpm add -Dw gray-matter@^4.0.3
```

Expected: `package.json` devDependencies 에 `"gray-matter": "^4.0.3"` 추가, `pnpm-lock.yaml` 갱신.

- [ ] **Step 2: 디렉터리 생성**

Run:

```bash
mkdir -p .claude/scripts/adr-review docs/adr/reviews
```

Expected: 두 디렉터리 생성 (리뷰 디렉터리는 Task 7/8 에서 채움).

- [ ] **Step 3: gitignore 재확인**

Run:

```bash
git check-ignore .claude/scripts/adr-review docs/adr/reviews
```

Expected: 두 경로 모두 ignore 되지 않음 (무출력 또는 exit 1).

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(adr-review): gray-matter devDep + scripts/reviews dirs"
```

---

## Task 2: Writer — 신규 파일 생성 (TDD)

**Files:**

- Create: `.claude/scripts/adr-review/writer.mjs`
- Create: `.claude/scripts/adr-review/writer.test.mjs`

- [ ] **Step 1: 실패 테스트 작성**

Create `.claude/scripts/adr-review/writer.test.mjs`:

```javascript
import { test } from "node:test";
import assert from "node:assert";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import matter from "gray-matter";
import { save } from "./writer.mjs";

function tmpDir() {
  return mkdtempSync(resolve(tmpdir(), "adr-review-"));
}

test("creates new file with round 1", () => {
  const dir = tmpDir();
  try {
    const result = save(
      {
        adr: 999,
        title: "Test ADR",
        issues: [
          { severity: "HIGH", category: "other", summary: "test issue" },
        ],
        bodyMd: "### [HIGH] test issue\n",
      },
      dir,
    );

    assert.strictEqual(result.round, 1);
    assert.strictEqual(result.malformed, undefined);
    const raw = readFileSync(result.path, "utf8");
    const parsed = matter(raw);
    assert.strictEqual(parsed.data.adr, 999);
    assert.strictEqual(parsed.data.title, "Test ADR");
    assert.strictEqual(parsed.data.reviews.length, 1);
    assert.strictEqual(parsed.data.reviews[0].round, 1);
    assert.strictEqual(parsed.data.reviews[0].issues[0].severity, "HIGH");
    assert.strictEqual(parsed.data.reviews[0].reviewer, "claude");
    assert.strictEqual(parsed.data.reviews[0].source, "live");
    assert.ok(parsed.content.includes("Round 1"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test — fail expected**

Run:

```bash
node --test .claude/scripts/adr-review/writer.test.mjs
```

Expected: FAIL with `Cannot find module './writer.mjs'` 또는 유사.

- [ ] **Step 3: Writer 최소 구현 — 신규 파일만**

Create `.claude/scripts/adr-review/writer.mjs`:

```javascript
#!/usr/bin/env node
/**
 * ADR Review Layer 0 Writer
 *
 * Reads JSON payload from stdin, appends/creates docs/adr/reviews/NNN.md
 * with round auto-increment and fail-soft error handling.
 *
 * Usage: cat payload.json | node writer.mjs
 * Spec:  docs/superpowers/specs/2026-04-20-adr-review-layer0-schema-design.md
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const DEFAULT_REVIEWS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../docs/adr/reviews",
);

const REQUIRED_TOP = ["adr", "issues"];
const REQUIRED_ISSUE = ["severity", "category", "summary"];
const VALID_SEVERITY = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const VALID_CATEGORY = [
  "evidence-missing",
  "generator-extension-gap",
  "migration-cost-unquantified",
  "phase-split-late",
  "ssot-violation",
  "alternative-strawman",
  "risk-4axis-incomplete",
  "adr-structure-violation",
  "other",
];
const VALID_OUTCOME = ["fixed", "deferred", "rejected", "pending"];

export function validatePayload(payload) {
  for (const key of REQUIRED_TOP) {
    if (payload[key] === undefined) throw new Error(`Missing required: ${key}`);
  }
  if (!Array.isArray(payload.issues)) throw new Error("issues must be array");
  for (const [i, issue] of payload.issues.entries()) {
    for (const key of REQUIRED_ISSUE) {
      if (issue[key] === undefined)
        throw new Error(`issues[${i}].${key} missing`);
    }
    if (!VALID_SEVERITY.includes(issue.severity)) {
      throw new Error(`issues[${i}].severity invalid: ${issue.severity}`);
    }
    if (!VALID_CATEGORY.includes(issue.category)) {
      throw new Error(`issues[${i}].category invalid: ${issue.category}`);
    }
    if (issue.outcome && !VALID_OUTCOME.includes(issue.outcome)) {
      throw new Error(`issues[${i}].outcome invalid: ${issue.outcome}`);
    }
  }
}

export function buildReviewEntry(payload, round) {
  return {
    round,
    ts: payload.ts || new Date().toISOString(),
    reviewer: payload.reviewer || "claude",
    source: payload.source || "live",
    issues: payload.issues.map((issue, i) => ({
      id: issue.id || `${issue.severity[0].toLowerCase()}${i + 1}`,
      severity: issue.severity,
      category: issue.category,
      summary: issue.summary,
      ...(issue.evidence && { evidence: issue.evidence }),
      ...(issue.root_cause && { root_cause: issue.root_cause }),
      outcome: issue.outcome || "pending",
      ...(issue.addressed_in && { addressed_in: issue.addressed_in }),
    })),
  };
}

export function formatBodySection(entry, bodyMd) {
  const date = entry.ts.slice(0, 10);
  const header = `\n## Round ${entry.round} — ${date} (reviewer: ${entry.reviewer})\n\n`;
  const body = (bodyMd && bodyMd.trim()) || "(no body provided)";
  return header + body + "\n";
}

export function save(payload, dir = DEFAULT_REVIEWS_DIR) {
  validatePayload(payload);
  const nnn = String(payload.adr).padStart(3, "0");
  const filePath = resolve(dir, `${nnn}.md`);
  mkdirSync(dir, { recursive: true });

  const frontmatter = {
    adr: payload.adr,
    title: payload.title || "(unknown)",
    reviews: [],
  };
  const body = `# ADR-${nnn} Review Log\n`;
  const round = 1;
  const entry = buildReviewEntry(payload, round);
  frontmatter.reviews.push(entry);
  const newBody = body + formatBodySection(entry, payload.bodyMd);
  writeFileSync(filePath, matter.stringify(newBody, frontmatter));
  return { path: filePath, round };
}
```

- [ ] **Step 4: Run test — pass expected**

Run:

```bash
node --test .claude/scripts/adr-review/writer.test.mjs
```

Expected: `tests 1 / pass 1 / fail 0`.

- [ ] **Step 5: Commit**

```bash
git add .claude/scripts/adr-review/writer.mjs .claude/scripts/adr-review/writer.test.mjs
git commit -m "feat(adr-review): writer save() — new file creation (TDD red-green)"
```

---

## Task 3: Writer — 기존 파일 append (TDD)

**Files:**

- Modify: `.claude/scripts/adr-review/writer.mjs`
- Modify: `.claude/scripts/adr-review/writer.test.mjs`

- [ ] **Step 1: Append 테스트 추가**

Append to `.claude/scripts/adr-review/writer.test.mjs`:

```javascript
test("appends round 2 to existing file", () => {
  const dir = tmpDir();
  try {
    save(
      {
        adr: 999,
        title: "Test",
        issues: [{ severity: "HIGH", category: "other", summary: "first" }],
        bodyMd: "### [HIGH] first\n",
      },
      dir,
    );
    const result = save(
      {
        adr: 999,
        issues: [{ severity: "MEDIUM", category: "other", summary: "second" }],
        bodyMd: "### [MEDIUM] second\n",
      },
      dir,
    );

    assert.strictEqual(result.round, 2);
    const parsed = matter(readFileSync(result.path, "utf8"));
    assert.strictEqual(parsed.data.reviews.length, 2);
    assert.strictEqual(parsed.data.reviews[0].round, 1);
    assert.strictEqual(parsed.data.reviews[1].round, 2);
    assert.ok(parsed.content.includes("Round 1"));
    assert.ok(parsed.content.includes("Round 2"));
    assert.ok(parsed.content.includes("first"));
    assert.ok(parsed.content.includes("second"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test — fail expected**

Run:

```bash
node --test .claude/scripts/adr-review/writer.test.mjs
```

Expected: 2번째 테스트에서 `round !== 2` assertion 실패 (현재 writer 는 항상 round 1).

- [ ] **Step 3: save() 함수에 append 로직 추가**

Replace `save` 함수 전체 in `.claude/scripts/adr-review/writer.mjs`:

```javascript
export function save(payload, dir = DEFAULT_REVIEWS_DIR) {
  validatePayload(payload);
  const nnn = String(payload.adr).padStart(3, "0");
  const filePath = resolve(dir, `${nnn}.md`);
  mkdirSync(dir, { recursive: true });

  let frontmatter;
  let body;
  let round;

  if (existsSync(filePath)) {
    const raw = readFileSync(filePath, "utf8");
    const parsed = matter(raw);
    if (!parsed.data || !Array.isArray(parsed.data.reviews)) {
      throw new Error("malformed existing frontmatter");
    }
    frontmatter = parsed.data;
    body = parsed.content;
    round = frontmatter.reviews.length + 1;
  } else {
    frontmatter = {
      adr: payload.adr,
      title: payload.title || "(unknown)",
      reviews: [],
    };
    body = `# ADR-${nnn} Review Log\n`;
    round = 1;
  }

  const entry = buildReviewEntry(payload, round);
  frontmatter.reviews.push(entry);
  const newBody = body + formatBodySection(entry, payload.bodyMd);
  writeFileSync(filePath, matter.stringify(newBody, frontmatter));
  return { path: filePath, round };
}
```

- [ ] **Step 4: Run test — pass expected**

Run:

```bash
node --test .claude/scripts/adr-review/writer.test.mjs
```

Expected: `tests 2 / pass 2 / fail 0`.

- [ ] **Step 5: Commit**

```bash
git add .claude/scripts/adr-review/writer.mjs .claude/scripts/adr-review/writer.test.mjs
git commit -m "feat(adr-review): writer append round N+1 to existing file"
```

---

## Task 4: Writer — Malformed frontmatter 복구 (TDD)

**Files:**

- Modify: `.claude/scripts/adr-review/writer.mjs`
- Modify: `.claude/scripts/adr-review/writer.test.mjs`

- [ ] **Step 1: Malformed 테스트 추가**

Append to `.claude/scripts/adr-review/writer.test.mjs`:

```javascript
import {
  writeFileSync as writeFileSyncRaw,
  existsSync,
  readdirSync,
} from "node:fs";

test("malformed existing frontmatter saves to separate file", () => {
  const dir = tmpDir();
  try {
    const corruptPath = resolve(dir, "999.md");
    writeFileSyncRaw(corruptPath, "---\nbroken: [unclosed\n---\nbody\n");

    const result = save(
      {
        adr: 999,
        title: "Test",
        issues: [{ severity: "LOW", category: "other", summary: "x" }],
        bodyMd: "### [LOW] x\n",
      },
      dir,
    );

    assert.strictEqual(result.malformed, true);
    assert.notStrictEqual(result.path, corruptPath);
    // Original corrupt file preserved
    assert.ok(existsSync(corruptPath));
    // New separate file created with timestamp suffix
    const files = readdirSync(dir);
    const recovered = files.find((f) => f.startsWith("999.") && f !== "999.md");
    assert.ok(recovered, "expected 999.{timestamp}.md to exist");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

**Also update the import line at the top of `writer.test.mjs`** — replace:

```javascript
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
```

with:

```javascript
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync as writeFileSyncRaw,
  existsSync,
  readdirSync,
} from "node:fs";
```

- [ ] **Step 2: Run test — fail expected**

Run:

```bash
node --test .claude/scripts/adr-review/writer.test.mjs
```

Expected: 3번째 테스트에서 `malformed existing frontmatter` Error 가 catch 되지 않고 throw — test fail.

- [ ] **Step 3: save() 함수에 try/catch + 분리 저장**

Replace `save` 함수 in `.claude/scripts/adr-review/writer.mjs`:

```javascript
export function save(payload, dir = DEFAULT_REVIEWS_DIR) {
  validatePayload(payload);
  const nnn = String(payload.adr).padStart(3, "0");
  const filePath = resolve(dir, `${nnn}.md`);
  mkdirSync(dir, { recursive: true });

  let frontmatter;
  let body;
  let round;
  let malformed = false;

  if (existsSync(filePath)) {
    const raw = readFileSync(filePath, "utf8");
    let parsed;
    try {
      parsed = matter(raw);
      if (!parsed.data || !Array.isArray(parsed.data.reviews)) {
        throw new Error("reviews array missing");
      }
    } catch (err) {
      malformed = true;
    }
    if (!malformed) {
      frontmatter = parsed.data;
      body = parsed.content;
      round = frontmatter.reviews.length + 1;
    }
  }

  if (malformed) {
    // Separate save — original preserved
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const sepPath = resolve(dir, `${nnn}.${ts}.md`);
    const entry = buildReviewEntry(payload, 1);
    const sepFm = {
      adr: payload.adr,
      title: payload.title || "(unknown)",
      reviews: [entry],
    };
    const sepBody =
      `# ADR-${nnn} Review Log (recovered ${ts})\n` +
      formatBodySection(entry, payload.bodyMd);
    writeFileSync(sepPath, matter.stringify(sepBody, sepFm));
    return { path: sepPath, round: 1, malformed: true };
  }

  if (!frontmatter) {
    // New file
    frontmatter = {
      adr: payload.adr,
      title: payload.title || "(unknown)",
      reviews: [],
    };
    body = `# ADR-${nnn} Review Log\n`;
    round = 1;
  }

  const entry = buildReviewEntry(payload, round);
  frontmatter.reviews.push(entry);
  const newBody = body + formatBodySection(entry, payload.bodyMd);
  writeFileSync(filePath, matter.stringify(newBody, frontmatter));
  return { path: filePath, round };
}
```

- [ ] **Step 4: Run test — pass expected**

Run:

```bash
node --test .claude/scripts/adr-review/writer.test.mjs
```

Expected: `tests 3 / pass 3 / fail 0`.

- [ ] **Step 5: Commit**

```bash
git add .claude/scripts/adr-review/writer.mjs .claude/scripts/adr-review/writer.test.mjs
git commit -m "feat(adr-review): writer malformed frontmatter recovery (separate save)"
```

---

## Task 5: Writer — Integration test + CLI entry

**Files:**

- Modify: `.claude/scripts/adr-review/writer.mjs` (CLI stdin entry)
- Modify: `.claude/scripts/adr-review/writer.test.mjs` (integration)

- [ ] **Step 1: Integration 테스트 추가 (2-round 다양한 reviewer)**

Append to `.claude/scripts/adr-review/writer.test.mjs`:

```javascript
test("integration: 2-round with different reviewers and multiple issues", () => {
  const dir = tmpDir();
  try {
    save(
      {
        adr: 999,
        title: "Integration Test",
        reviewer: "claude",
        issues: [
          {
            severity: "HIGH",
            category: "evidence-missing",
            summary: "r1 high",
          },
        ],
        bodyMd: "### [HIGH] r1 high\n",
      },
      dir,
    );
    const result = save(
      {
        adr: 999,
        reviewer: "codex",
        issues: [
          {
            severity: "CRITICAL",
            category: "ssot-violation",
            summary: "r2 crit",
          },
          {
            severity: "MEDIUM",
            category: "phase-split-late",
            summary: "r2 med",
          },
        ],
        bodyMd: "### [CRITICAL] r2 crit\n\n### [MEDIUM] r2 med\n",
      },
      dir,
    );

    assert.strictEqual(result.round, 2);
    const parsed = matter(readFileSync(result.path, "utf8"));
    assert.strictEqual(parsed.data.reviews.length, 2);
    assert.strictEqual(parsed.data.reviews[0].reviewer, "claude");
    assert.strictEqual(parsed.data.reviews[1].reviewer, "codex");
    assert.strictEqual(parsed.data.reviews[0].issues.length, 1);
    assert.strictEqual(parsed.data.reviews[1].issues.length, 2);
    assert.strictEqual(parsed.data.reviews[1].issues[0].severity, "CRITICAL");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test — pass expected (기존 로직 합성으로 바로 통과)**

Run:

```bash
node --test .claude/scripts/adr-review/writer.test.mjs
```

Expected: `tests 4 / pass 4 / fail 0`.

- [ ] **Step 3: CLI entry 추가 (stdin JSON)**

Append to `.claude/scripts/adr-review/writer.mjs` (파일 하단):

```javascript
// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    raw += chunk;
  });
  process.stdin.on("end", () => {
    try {
      const payload = JSON.parse(raw);
      const result = save(payload);
      if (result.malformed) {
        process.stdout.write(
          `→ saved (malformed recovery) to ${result.path}\n`,
        );
        process.exit(1);
      }
      process.stdout.write(
        `→ saved to ${result.path} (round ${result.round})\n`,
      );
      process.exit(0);
    } catch (err) {
      process.stderr.write(`writer: ${err.message}\n`);
      process.exit(2);
    }
  });
}
```

- [ ] **Step 4: CLI smoke test — 실제 tmp dir 사용 불가하므로 `--adr 999` 로 실제 reviews 디렉터리에 작성 후 즉시 삭제**

Run:

```bash
cat <<'EOF' | node .claude/scripts/adr-review/writer.mjs
{
  "adr": 999,
  "title": "CLI smoke test",
  "issues": [{ "severity": "LOW", "category": "other", "summary": "smoke" }],
  "bodyMd": "### [LOW] smoke\n"
}
EOF
```

Expected: stdout `→ saved to .../docs/adr/reviews/999.md (round 1)`, exit 0.

Run:

```bash
test -f docs/adr/reviews/999.md && echo "file exists" && rm docs/adr/reviews/999.md
```

Expected: `file exists`, 파일 삭제됨.

- [ ] **Step 5: Commit**

```bash
git add .claude/scripts/adr-review/writer.mjs .claude/scripts/adr-review/writer.test.mjs
git commit -m "feat(adr-review): writer integration test + stdin CLI entry"
```

---

## Task 6: Schema validation CLI (TDD)

**Files:**

- Create: `.claude/scripts/adr-review/validate.mjs`

- [ ] **Step 1: validate.mjs 작성**

Create `.claude/scripts/adr-review/validate.mjs`:

```javascript
#!/usr/bin/env node
/**
 * ADR Review Schema Validator
 *
 * Scans docs/adr/reviews/*.md, validates frontmatter against Layer 0 schema.
 * Exit 0 if all valid, 1 if any invalid.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const REVIEWS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../docs/adr/reviews",
);

const VALID_SEVERITY = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const VALID_CATEGORY = [
  "evidence-missing",
  "generator-extension-gap",
  "migration-cost-unquantified",
  "phase-split-late",
  "ssot-violation",
  "alternative-strawman",
  "risk-4axis-incomplete",
  "adr-structure-violation",
  "other",
];
const VALID_OUTCOME = ["fixed", "deferred", "rejected", "pending"];

export function validateFile(filePath) {
  const errors = [];
  const raw = readFileSync(filePath, "utf8");
  let data;
  try {
    data = matter(raw).data;
  } catch (err) {
    return [`malformed frontmatter: ${err.message}`];
  }
  if (data.adr === undefined || data.adr === null) errors.push("missing adr");
  if (!Array.isArray(data.reviews)) {
    errors.push("reviews not array");
    return errors;
  }
  for (const [i, r] of data.reviews.entries()) {
    if (r.round === undefined) errors.push(`reviews[${i}].round missing`);
    if (!r.ts) errors.push(`reviews[${i}].ts missing`);
    if (!Array.isArray(r.issues)) {
      errors.push(`reviews[${i}].issues not array`);
      continue;
    }
    for (const [j, is] of r.issues.entries()) {
      const prefix = `reviews[${i}].issues[${j}]`;
      if (!is.severity) errors.push(`${prefix}.severity missing`);
      else if (!VALID_SEVERITY.includes(is.severity)) {
        errors.push(`${prefix}.severity invalid: ${is.severity}`);
      }
      if (!is.category) errors.push(`${prefix}.category missing`);
      else if (!VALID_CATEGORY.includes(is.category)) {
        errors.push(`${prefix}.category invalid: ${is.category}`);
      }
      if (!is.summary) errors.push(`${prefix}.summary missing`);
      if (is.outcome && !VALID_OUTCOME.includes(is.outcome)) {
        errors.push(`${prefix}.outcome invalid: ${is.outcome}`);
      }
    }
  }
  return errors;
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!existsSync(REVIEWS_DIR)) {
    console.error(`No reviews directory: ${REVIEWS_DIR}`);
    process.exit(1);
  }
  const files = readdirSync(REVIEWS_DIR).filter(
    (f) => f.endsWith(".md") && f !== "README.md",
  );

  let failed = 0;
  for (const f of files) {
    const errors = validateFile(resolve(REVIEWS_DIR, f));
    if (errors.length) {
      failed += 1;
      console.error(`[FAIL] ${f}`);
      for (const e of errors) console.error(`  - ${e}`);
    } else {
      console.log(`[PASS] ${f}`);
    }
  }
  if (failed) {
    console.error(`\n${failed}/${files.length} files failed validation`);
    process.exit(1);
  }
  console.log(`\n${files.length}/${files.length} files passed`);
  process.exit(0);
}
```

- [ ] **Step 2: 빈 디렉터리에서 smoke — pass**

Run:

```bash
node .claude/scripts/adr-review/validate.mjs
```

Expected: `0/0 files passed`, exit 0.

- [ ] **Step 3: 잘못된 파일로 smoke — fail**

Run:

```bash
mkdir -p docs/adr/reviews
cat > docs/adr/reviews/888.md <<'EOF'
---
adr: 888
reviews:
  - round: 1
    ts: 2026-04-20T00:00:00Z
    issues:
      - severity: WRONG
        category: unknown-category
        summary: bad
---
EOF
node .claude/scripts/adr-review/validate.mjs
EXIT=$?
rm docs/adr/reviews/888.md
echo "validate exit=$EXIT"
```

Expected: `[FAIL] 888.md` + severity/category invalid 에러 + `validate exit=1`.

- [ ] **Step 4: Commit**

```bash
git add .claude/scripts/adr-review/validate.mjs
git commit -m "feat(adr-review): validate.mjs — schema CLI (exit 0/1)"
```

---

## Task 7: `docs/adr/reviews/README.md` — 스키마/taxonomy SSOT

**Files:**

- Create: `docs/adr/reviews/README.md`

- [ ] **Step 1: README 작성**

Create `docs/adr/reviews/README.md`:

````markdown
# ADR Review Logs — Layer 0 Observation Store

> This directory stores structured review results for ADRs in `docs/adr/`. Written by `review-adr` skill Phase 4.5 (Layer 0); consumed by future Layer 1 pattern-extraction agents.
>
> **Schema SSOT**: this file. Design rationale: [docs/superpowers/specs/2026-04-20-adr-review-layer0-schema-design.md](../../superpowers/specs/2026-04-20-adr-review-layer0-schema-design.md).
> **Writer**: `.claude/scripts/adr-review/writer.mjs` | **Validator**: `.claude/scripts/adr-review/validate.mjs`

## File Naming

- `NNN.md` — 3-digit zero-padded ADR number (e.g., `076.md`)
- `NNN.{timestamp}.md` — malformed-frontmatter recovery (preserved for manual repair)
- `README.md` — this file (schema SSOT, excluded from aggregation)

## Frontmatter Schema

```yaml
---
adr: 076 # (required) integer, ADR number
title: "ADR 제목" # (required) string
reviews: # (required) array, accumulates per round
  - round: 1 # (required) integer, auto-increment by writer
    ts: 2026-04-16T14:30:00Z # (required) ISO 8601 UTC
    reviewer: codex # (optional) claude|codex|human, default "claude"
    source: live # (optional) live|backfill-YYYY-MM-DD, default "live"
    issues: # (required) array, 0 allowed
      - id: c1 # (optional) round-local, severity prefix + index
        severity: CRITICAL # (required) CRITICAL|HIGH|MEDIUM|LOW
        category: generator-extension-gap # (required) from taxonomy
        summary: "..." # (required) 한 줄 요약
        evidence: "path/to/file.ts:L12" # (optional) grep-able code path
        root_cause: "..." # (optional) why
        outcome: fixed # (optional) fixed|deferred|rejected|pending, default "pending"
        addressed_in: "commit sha or ADR-NNN" # (optional) resolution reference
---
```
````

## Taxonomy (9 fixed)

| 키                            | 설명                                                            |
| ----------------------------- | --------------------------------------------------------------- |
| `evidence-missing`            | 코드 경로/파일/함수 grep 근거 부재                              |
| `generator-extension-gap`     | Spec Generator 확장 미지원 → 수동 CSS debt                      |
| `migration-cost-unquantified` | BC 영향 범위/비율 미수식화                                      |
| `phase-split-late`            | HIGH 누적 후 Phase 분리 후행                                    |
| `ssot-violation`              | D1/D2/D3 경계 침범                                              |
| `alternative-strawman`        | 대안 기각 사유 부실, 이관 비용 없음                             |
| `risk-4axis-incomplete`       | 4축 평가 일부 축 누락/편중                                      |
| `adr-structure-violation`     | 스캐폴딩/Status 전이/README 동기화 위반                         |
| `other`                       | 상위 8개에 매칭 안 됨 — `Pending Categories` 섹션에서 주기 검토 |

**변경 정책**: taxonomy 변경은 design spec 수정 + 이 README 갱신 + `writer.mjs`/`validate.mjs` 동일 상수 수정 3곳 동시. 운영 중 신규 패턴은 `other` 로 저장하고 아래 섹션에 축적.

## Severity (4 levels)

- `CRITICAL` — blocking; ADR cannot proceed as written
- `HIGH` — significant risk requiring mitigation
- `MEDIUM` — should address before implementation
- `LOW` — nice-to-have, optional polish

## Outcome States

- `fixed` — resolved in code or ADR revision (`addressed_in` recommended)
- `deferred` — acknowledged, scheduled for future ADR
- `rejected` — reviewed and intentionally not addressed (rationale in body)
- `pending` — not yet addressed (default)

## Pending Categories

Issues saved with `category: other` + 원문 분류을 본문에 기록합니다. 동일 패턴 ≥3 건 축적되면 신규 카테고리 승인 요청.

_(empty)_

## Scripts

```bash
# Write a review (stdin JSON):
cat payload.json | node .claude/scripts/adr-review/writer.mjs

# Validate all reviews:
node .claude/scripts/adr-review/validate.mjs
```

## Related

- Design spec: [2026-04-20-adr-review-layer0-schema-design.md](../../superpowers/specs/2026-04-20-adr-review-layer0-schema-design.md)
- Checklist seed: `.claude/rules/adr-writing.md` (§반복 패턴 선차단)
- Skill: `.claude/skills/review-adr/SKILL.md` (Phase 4.5)

````

- [ ] **Step 2: Commit**

```bash
git add docs/adr/reviews/README.md
git commit -m "docs(adr-review): reviews/README.md schema + taxonomy SSOT"
````

---

## Task 8: 백필 9개 파일 (source: backfill-2026-04-20)

각 ADR 의 JSON payload 를 writer 에 pipe 하여 해당 `NNN.md` 생성. 모든 payload 의 `source: backfill-2026-04-20`.

**Files:**

- Create: `docs/adr/reviews/054.md`, `056.md`, `063.md`, `075.md`, `076.md`, `078.md`, `079.md`, `100.md`, `102.md`

- [ ] **Step 1: ADR-054 (HIGH 3)**

Run:

```bash
cat <<'EOF' | node .claude/scripts/adr-review/writer.mjs
{
  "adr": 54,
  "title": "Local LLM Architecture",
  "reviewer": "claude",
  "source": "backfill-2026-04-20",
  "ts": "2026-04-05T00:00:00Z",
  "issues": [
    {
      "severity": "HIGH",
      "category": "evidence-missing",
      "summary": "Electron 선행 의존으로 Ollama→node-llama-cpp 전환 기술 난제",
      "root_cause": "새 런타임 도입 사실 확증 없이 추상 서술"
    },
    {
      "severity": "HIGH",
      "category": "migration-cost-unquantified",
      "summary": "기존 Groq API 호출 전환 시 BC/롤백 비용 미수식화"
    },
    {
      "severity": "HIGH",
      "category": "evidence-missing",
      "summary": "성능 위험 (로컬 LLM 레이턴시/메모리) 수치 근거 부재"
    }
  ],
  "bodyMd": "> Backfilled 2026-04-20 from Explore agent meta-analysis.\n\n### [HIGH] Electron 선행 의존 기술 난제\n- **Category**: evidence-missing\n- **Outcome**: pending (ADR-054 Proposed 상태)\n\n### [HIGH] Migration BC 비용 미수식화\n- **Category**: migration-cost-unquantified\n- **Outcome**: pending\n\n### [HIGH] 성능 수치 근거 부재\n- **Category**: evidence-missing\n- **Outcome**: pending\n"
}
EOF
```

Expected: `→ saved to .../docs/adr/reviews/054.md (round 1)`.

- [ ] **Step 2: ADR-056 (issues 0 — 리뷰 이슈 없음)**

Run:

```bash
cat <<'EOF' | node .claude/scripts/adr-review/writer.mjs
{
  "adr": 56,
  "title": "Base Typography SSOT",
  "reviewer": "claude",
  "source": "backfill-2026-04-20",
  "ts": "2026-04-07T00:00:00Z",
  "issues": [],
  "bodyMd": "> Backfilled 2026-04-20. Explore agent 메타 분석: CRITICAL/HIGH 라벨 이슈 0건.\n"
}
EOF
```

Expected: `→ saved to .../docs/adr/reviews/056.md (round 1)`.

- [ ] **Step 3: ADR-063 (issues 0)**

Run:

```bash
cat <<'EOF' | node .claude/scripts/adr-review/writer.mjs
{
  "adr": 63,
  "title": "SSOT Chain Charter (3-Domain 분할)",
  "reviewer": "claude",
  "source": "backfill-2026-04-20",
  "ts": "2026-04-13T00:00:00Z",
  "issues": [],
  "bodyMd": "> Backfilled 2026-04-20. Explore agent 메타 분석: CRITICAL/HIGH 라벨 이슈 0건.\n"
}
EOF
```

Expected: `→ saved to .../docs/adr/reviews/063.md (round 1)`.

- [ ] **Step 4: ADR-075 (CRITICAL 1 + HIGH 3)**

Run:

```bash
cat <<'EOF' | node .claude/scripts/adr-review/writer.mjs
{
  "adr": 75,
  "title": "Render longtask fan-out 해체",
  "reviewer": "codex",
  "source": "backfill-2026-04-20",
  "ts": "2026-04-18T00:00:00Z",
  "issues": [
    {
      "severity": "CRITICAL",
      "category": "evidence-missing",
      "summary": "Phase 4 CanvasKit Worker 재초기화 기술 난제 — 구체 코드 경로 미인용",
      "outcome": "fixed",
      "addressed_in": "Phase 0 prod 실측으로 Phase 1~5 skip 정당화"
    },
    {
      "severity": "HIGH",
      "category": "evidence-missing",
      "summary": "Phase 2 middleware 전역 위험 재분류 시 코드 기반 사실 확증 미흡",
      "outcome": "fixed",
      "addressed_in": "Phase 0 skip"
    },
    {
      "severity": "HIGH",
      "category": "evidence-missing",
      "summary": "기술 위험 추상 표현 (대규모 재설계 등) — grep 근거 부재",
      "outcome": "fixed"
    },
    {
      "severity": "HIGH",
      "category": "migration-cost-unquantified",
      "summary": "Phase 전환 시 마이그레이션 범위 불명확",
      "outcome": "fixed",
      "addressed_in": "prod 실측 Gate G0 충족"
    }
  ],
  "bodyMd": "> Backfilled 2026-04-20 from ADR-075 Codex 1~3차 리뷰 summary.\n\n### [CRITICAL] Phase 4 CanvasKit Worker 재초기화 기술 난제\n- **Category**: evidence-missing\n- **Outcome**: fixed — Phase 0 prod 실측으로 Phase 4 skip 정당화\n\n### [HIGH] x3 기술·마이그레이션\n자세한 원문은 ADR-075 Addendum 참조.\n"
}
EOF
```

Expected: `→ saved to .../docs/adr/reviews/075.md (round 1)`.

- [ ] **Step 5: ADR-076 (CRITICAL 2 + HIGH 2, codex 1~6차를 1 라운드로 요약)**

Run:

```bash
cat <<'EOF' | node .claude/scripts/adr-review/writer.mjs
{
  "adr": 76,
  "title": "ListBox items SSOT + Hybrid containerStyles 해체",
  "reviewer": "codex",
  "source": "backfill-2026-04-20",
  "ts": "2026-04-16T00:00:00Z",
  "issues": [
    {
      "severity": "CRITICAL",
      "category": "generator-extension-gap",
      "summary": "템플릿 직렬화 스키마 부재 (nested item SSOT 불가)",
      "outcome": "fixed",
      "addressed_in": "commit 2fdc2205"
    },
    {
      "severity": "CRITICAL",
      "category": "migration-cost-unquantified",
      "summary": "마이그레이션 BC 훼손 위험 — 프로젝트 재직렬화 필수",
      "outcome": "fixed",
      "addressed_in": "applyCollectionItemsMigration 오케스트레이터 + 부모 원자성 3계층 가드"
    },
    {
      "severity": "HIGH",
      "category": "ssot-violation",
      "summary": "수동 유지 비율 약 80% (ListBoxItem.spec 부재로 자식 selector emit 불가)",
      "outcome": "deferred",
      "addressed_in": "ADR-078"
    },
    {
      "severity": "HIGH",
      "category": "generator-extension-gap",
      "summary": "Generator 자식 selector emit 미지원",
      "outcome": "deferred",
      "addressed_in": "ADR-078"
    }
  ],
  "bodyMd": "> Backfilled 2026-04-20. Codex 1~6차 리뷰 17건 중 CRITICAL/HIGH 4건을 round 1로 요약. 상세 원문은 ADR-076 본문 Review Log 참조.\n\n### [CRITICAL] 템플릿 직렬화 스키마 부재\n- **Outcome**: fixed — commit 2fdc2205\n\n### [CRITICAL] 마이그레이션 BC 훼손\n- **Outcome**: fixed — applyCollectionItemsMigration + 부모 원자성 3계층 가드\n\n### [HIGH] 수동 유지 80%\n- **Outcome**: deferred → ADR-078\n\n### [HIGH] Generator 자식 selector emit 미지원\n- **Outcome**: deferred → ADR-078\n"
}
EOF
```

Expected: `→ saved to .../docs/adr/reviews/076.md (round 1)`.

- [ ] **Step 6: ADR-078 (CRITICAL 1 + HIGH 2)**

Run:

```bash
cat <<'EOF' | node .claude/scripts/adr-review/writer.mjs
{
  "adr": 78,
  "title": "ListBoxItem.spec 신설 + Generator 자식 selector emit 확장",
  "reviewer": "claude",
  "source": "backfill-2026-04-20",
  "ts": "2026-04-19T00:00:00Z",
  "issues": [
    {
      "severity": "CRITICAL",
      "category": "ssot-violation",
      "summary": "ListBoxItem nested SSOT 복잡도 — 자식 selector emit 경로 없음",
      "outcome": "pending"
    },
    {
      "severity": "HIGH",
      "category": "generator-extension-gap",
      "summary": "Generator 자식 selector 확장 범위 모호 (GridList/Select/ComboBox 연쇄)",
      "outcome": "pending"
    },
    {
      "severity": "HIGH",
      "category": "migration-cost-unquantified",
      "summary": "대안 C (nested SSOT 채택 시) 기존 template 도메인 관례 분열",
      "outcome": "pending"
    }
  ],
  "bodyMd": "> Backfilled 2026-04-20. ADR-078 Proposed 상태 — 본문 §Risks 기반.\n\n### [CRITICAL] ListBoxItem nested SSOT 복잡\n### [HIGH] Generator 확장 범위 모호\n### [HIGH] BC 도메인 관례 분열\n"
}
EOF
```

Expected: `→ saved to .../docs/adr/reviews/078.md (round 1)`.

- [ ] **Step 7: ADR-079 (CRITICAL 1 + HIGH 1)**

Run:

```bash
cat <<'EOF' | node .claude/scripts/adr-review/writer.mjs
{
  "adr": 79,
  "title": "Spec defaults read-through + Layout primitive SSOT 완전화",
  "reviewer": "claude",
  "source": "backfill-2026-04-20",
  "ts": "2026-04-19T00:00:00Z",
  "issues": [
    {
      "severity": "CRITICAL",
      "category": "ssot-violation",
      "summary": "4종 workaround 반복 (align-items / factory 중복 주입 / Style Panel Spec 무시 / rearrangeShapesForColumn)",
      "outcome": "fixed",
      "addressed_in": "5 commit chain 8a944f9b~e639b8d8"
    },
    {
      "severity": "HIGH",
      "category": "ssot-violation",
      "summary": "SSOT 이원화 (Preview CSS vs Canvas Skia vs Style Panel 3경로 비대칭)",
      "outcome": "fixed",
      "addressed_in": "ContainerStylesSchema alignItems/justifyContent 추가"
    }
  ],
  "bodyMd": "> Backfilled 2026-04-20. ADR-079 Implemented — P1~P4 5 commit + MCP G1/G2 PASS.\n\n### [CRITICAL] 4종 workaround 반복\n- **Outcome**: fixed — 5 commit chain\n\n### [HIGH] SSOT 3경로 비대칭\n- **Outcome**: fixed — ContainerStylesSchema 리프팅\n"
}
EOF
```

Expected: `→ saved to .../docs/adr/reviews/079.md (round 1)`.

- [ ] **Step 8: ADR-100 (HIGH 1)**

Run:

```bash
cat <<'EOF' | node .claude/scripts/adr-review/writer.mjs
{
  "adr": 100,
  "title": "Unified Skia Rendering Engine",
  "reviewer": "claude",
  "source": "backfill-2026-04-20",
  "ts": "2026-04-07T00:00:00Z",
  "issues": [
    {
      "severity": "HIGH",
      "category": "evidence-missing",
      "summary": "성능 위험 DOM reflow — Skia 단일 파이프라인 전환 시 Layout 경로 사실 확증 미흡",
      "outcome": "fixed",
      "addressed_in": "Phase 10+ 안정화 (PixiJS 완전 제거)"
    }
  ],
  "bodyMd": "> Backfilled 2026-04-20. ADR-100 Phase 10+ 안정화 완료.\n\n### [HIGH] DOM reflow 성능 위험\n- **Outcome**: fixed — Phase 10+ 안정화\n"
}
EOF
```

Expected: `→ saved to .../docs/adr/reviews/100.md (round 1)`.

- [ ] **Step 9: ADR-102 (HIGH 6)**

Run:

```bash
cat <<'EOF' | node .claude/scripts/adr-review/writer.mjs
{
  "adr": 102,
  "title": "Workspace Dot Background",
  "reviewer": "claude",
  "source": "backfill-2026-04-20",
  "ts": "2026-04-18T00:00:00Z",
  "issues": [
    {
      "severity": "HIGH",
      "category": "evidence-missing",
      "summary": "canvas pixel scissor 불명확 — DOM+CSS 레이어 + Skia 투명화 분리 설계 기술 위험",
      "outcome": "pending"
    },
    {
      "severity": "HIGH",
      "category": "evidence-missing",
      "summary": "Skia 투명화 렌더 경로 사실 확증 미흡",
      "outcome": "pending"
    },
    {
      "severity": "HIGH",
      "category": "evidence-missing",
      "summary": "성능 위험 (DOM dot layer + Skia 투명화 중첩)",
      "outcome": "pending"
    },
    {
      "severity": "HIGH",
      "category": "ssot-violation",
      "summary": "DOM+CSS와 Skia 두 계층이 동일 시각 요소 담당 — SSOT 3-domain 경계 교차",
      "outcome": "pending"
    },
    {
      "severity": "HIGH",
      "category": "ssot-violation",
      "summary": "workspace 배경 Spec D3 vs 수동 DOM 중 어느 SSOT인지 모호",
      "outcome": "pending"
    },
    {
      "severity": "HIGH",
      "category": "migration-cost-unquantified",
      "summary": "기존 단일 Skia 배경에서 DOM+Skia 분리로 전환 시 BC 범위 미수식화",
      "outcome": "pending"
    }
  ],
  "bodyMd": "> Backfilled 2026-04-20. ADR-102 Proposed v2 — 본문 §Risks 6건.\n\nHIGH 이슈 총 6건 (기술 3 / SSOT 2 / 마이그레이션 1). Proposed 상태.\n"
}
EOF
```

Expected: `→ saved to .../docs/adr/reviews/102.md (round 1)`.

- [ ] **Step 10: 9개 파일 검증**

Run:

```bash
ls docs/adr/reviews/
node .claude/scripts/adr-review/validate.mjs
```

Expected:

- `ls`: `054.md 056.md 063.md 075.md 076.md 078.md 079.md 100.md 102.md README.md`
- validate: `9/9 files passed`, exit 0.

- [ ] **Step 11: Commit**

```bash
git add docs/adr/reviews/
git commit -m "docs(adr-review): backfill 9 ADR reviews (source: backfill-2026-04-20)"
```

---

## Task 9: `review-adr` SKILL.md — Phase 4.5 추가

**Files:**

- Modify: `.claude/skills/review-adr/SKILL.md`

- [ ] **Step 1: Phase 4 섹션 뒤에 Phase 4.5 추가**

In `.claude/skills/review-adr/SKILL.md`, find the section that starts with `## Phase 4: 결과 보고` and ends before `## 이슈 처리 원칙`. Append the following new section **between** them (after Phase 4 markdown template ends, before `## 이슈 처리 원칙`):

````markdown
---

## Phase 4.5: Layer 0 영속화 (자동 저장)

Phase 4 의 마크다운 결과를 출력한 후, 아래 JSON payload 를 stdin 으로 writer 에 전달하여 `docs/adr/reviews/NNN.md` 에 저장합니다. **Fail-soft** — writer 실패해도 Phase 4 사용자 출력은 영향 받지 않습니다.

### 호출 방법

```bash
cat <<'EOF' | node .claude/scripts/adr-review/writer.mjs
{
  "adr": <ADR번호>,
  "title": "<ADR 제목>",
  "reviewer": "claude",
  "source": "live",
  "issues": [
    {
      "severity": "CRITICAL | HIGH | MEDIUM | LOW",
      "category": "<.claude/scripts/adr-review/ 9-taxonomy>",
      "summary": "<한 줄 요약>",
      "evidence": "<파일:line>",
      "root_cause": "<...>",
      "outcome": "pending"
    }
  ],
  "bodyMd": "<Phase 4 마크다운 본문>"
}
EOF
```
````

### 출력 처리

- **성공**: `→ saved to docs/adr/reviews/NNN.md (round N)` 한 줄을 Phase 4 결과 끝에 추가. exit 0.
- **Malformed 복구**: `→ saved (malformed recovery) to NNN.{ts}.md` 한 줄 추가. exit 1 무시 (data preserved).
- **Fatal (required 필드 누락, IO 실패)**: `writer: <error>` warning 만 출력. Phase 1~4 정상 완료.

### 스키마 / taxonomy

- **Schema SSOT**: [docs/adr/reviews/README.md](../../../docs/adr/reviews/README.md)
- **Design rationale**: [docs/superpowers/specs/2026-04-20-adr-review-layer0-schema-design.md](../../../docs/superpowers/specs/2026-04-20-adr-review-layer0-schema-design.md)
- **Validator**: `node .claude/scripts/adr-review/validate.mjs`

````

- [ ] **Step 2: 수정 확인**

Run:
```bash
grep -n "Phase 4.5" .claude/skills/review-adr/SKILL.md
````

Expected: Phase 4.5 헤더 매치 1건 이상.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/review-adr/SKILL.md
git commit -m "feat(review-adr): Phase 4.5 — Layer 0 영속화 (writer 호출)"
```

---

## Task 10: 최종 검증 — e2e smoke + validate + type-check

**Files:**

- (none — verification only)

- [ ] **Step 1: validate 실행**

Run:

```bash
node .claude/scripts/adr-review/validate.mjs
```

Expected: `9/9 files passed`, exit 0.

- [ ] **Step 2: writer unit tests 재실행**

Run:

```bash
node --test .claude/scripts/adr-review/writer.test.mjs
```

Expected: `tests 4 / pass 4 / fail 0`.

- [ ] **Step 3: e2e smoke — ADR-999 신규 + round 2**

Run:

```bash
cat <<'EOF' | node .claude/scripts/adr-review/writer.mjs
{
  "adr": 999,
  "title": "e2e smoke",
  "issues": [{"severity":"LOW","category":"other","summary":"r1"}],
  "bodyMd": "### [LOW] r1\n"
}
EOF

cat <<'EOF' | node .claude/scripts/adr-review/writer.mjs
{
  "adr": 999,
  "issues": [{"severity":"MEDIUM","category":"other","summary":"r2"}],
  "bodyMd": "### [MEDIUM] r2\n"
}
EOF

grep -c "^  - round:" docs/adr/reviews/999.md
rm docs/adr/reviews/999.md
```

Expected:

- `saved to .../999.md (round 1)` → `saved to .../999.md (round 2)`
- `grep -c` 출력: `2`
- 파일 삭제됨.

- [ ] **Step 4: pnpm type-check (전역 영향 없는지 확인)**

Run:

```bash
pnpm type-check
```

Expected: 전체 packages 통과 (본 작업은 app 런타임 미수정이라 영향 없음, 하지만 default Stop hook 이 같은 명령 실행하므로 사전 확인).

- [ ] **Step 5: 최종 git log 확인**

Run:

```bash
git log --oneline -10
```

Expected: 직전 10 commit 에 본 plan 의 Task 1~9 commit 들이 순서대로 보임.

- [ ] **Step 6: Plan 완료 commit (optional summary)**

Run:

```bash
git log --oneline $(git rev-list --max-parents=0 HEAD | tail -1)..HEAD | grep "adr-review" | head
```

작업 요약 commit 은 생성하지 않음 (각 task 가 이미 atomic).

---

## Self-Review Checklist (plan 작성 완료 시)

- [ ] Spec §3 Architecture 의 "3 책임 분할" (review-adr / writer / Layer 1 consumer) 이 Task 에 반영되었는가? → review-adr = Task 9 / writer = Task 2~5 / Layer 1 consumer = interface 명세만 (out of scope)
- [ ] Spec §4.1 frontmatter 필수/선택 필드가 writer 코드 상수와 일치하는가? → `REQUIRED_TOP`, `REQUIRED_ISSUE`, `VALID_SEVERITY`, `VALID_CATEGORY`, `VALID_OUTCOME`
- [ ] Spec §4.2 taxonomy 9개가 writer/validate/README 3곳에 동일하게 정의되었는가? → Task 2/6/7 각각
- [ ] Spec §8 Error Handling 4케이스가 구현되었는가? → Race(미처리 수용), ADR 번호 누락(validatePayload), Taxonomy 미매칭(`other`), Malformed(Task 4)
- [ ] Spec §9 Testing 4 케이스가 Task 2~5 에 매핑되는가? → unit 3 (Task 2,3,4) + integration 1 (Task 5)
- [ ] Spec §10 Backfill B1~B7 이 Task 1/7/8/6/9/10 에 매핑되는가? → B1=Task 7, B2=Task 8, B4=Task 8 Step 10, B5=Task 2~5, B6=Task 9, B7=Task 10
- [ ] Spec §11 성공 지표 (14 파일 무손실) → Task 10 Step 1 validate 로 검증
- [ ] 모든 placeholder 제거? → "TBD" / "TODO" / "Similar to" 검색 → 0 match

---

**Next step**: 구현 시작. 아래 두 옵션 중 선택.
