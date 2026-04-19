import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { save } from './writer.mjs';

function tmpDir() {
  return mkdtempSync(resolve(tmpdir(), 'adr-review-'));
}

test('creates new file with round 1', () => {
  const dir = tmpDir();
  try {
    const result = save(
      {
        adr: 999,
        title: 'Test ADR',
        issues: [{ severity: 'HIGH', category: 'other', summary: 'test issue' }],
        bodyMd: '### [HIGH] test issue\n',
      },
      dir,
    );

    assert.strictEqual(result.round, 1);
    assert.strictEqual(result.malformed, undefined);
    const raw = readFileSync(result.path, 'utf8');
    const parsed = matter(raw);
    assert.strictEqual(parsed.data.adr, 999);
    assert.strictEqual(parsed.data.title, 'Test ADR');
    assert.strictEqual(parsed.data.reviews.length, 1);
    assert.strictEqual(parsed.data.reviews[0].round, 1);
    assert.strictEqual(parsed.data.reviews[0].issues[0].severity, 'HIGH');
    assert.strictEqual(parsed.data.reviews[0].reviewer, 'claude');
    assert.strictEqual(parsed.data.reviews[0].source, 'live');
    assert.ok(parsed.content.includes('Round 1'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('appends round 2 to existing file', () => {
  const dir = tmpDir();
  try {
    save(
      {
        adr: 999,
        title: 'Test',
        issues: [{ severity: 'HIGH', category: 'other', summary: 'first' }],
        bodyMd: '### [HIGH] first\n',
      },
      dir,
    );
    const result = save(
      {
        adr: 999,
        issues: [{ severity: 'MEDIUM', category: 'other', summary: 'second' }],
        bodyMd: '### [MEDIUM] second\n',
      },
      dir,
    );

    assert.strictEqual(result.round, 2);
    const parsed = matter(readFileSync(result.path, 'utf8'));
    assert.strictEqual(parsed.data.reviews.length, 2);
    assert.strictEqual(parsed.data.reviews[0].round, 1);
    assert.strictEqual(parsed.data.reviews[1].round, 2);
    assert.ok(parsed.content.includes('Round 1'));
    assert.ok(parsed.content.includes('Round 2'));
    assert.ok(parsed.content.includes('first'));
    assert.ok(parsed.content.includes('second'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
