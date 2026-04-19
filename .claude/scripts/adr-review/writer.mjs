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

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const DEFAULT_REVIEWS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/adr/reviews',
);

const REQUIRED_TOP = ['adr', 'issues'];
const REQUIRED_ISSUE = ['severity', 'category', 'summary'];
const VALID_SEVERITY = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const VALID_CATEGORY = [
  'evidence-missing',
  'generator-extension-gap',
  'migration-cost-unquantified',
  'phase-split-late',
  'ssot-violation',
  'alternative-strawman',
  'risk-4axis-incomplete',
  'adr-structure-violation',
  'other',
];
const VALID_OUTCOME = ['fixed', 'deferred', 'rejected', 'pending'];

export function validatePayload(payload) {
  for (const key of REQUIRED_TOP) {
    if (payload[key] === undefined) throw new Error(`Missing required: ${key}`);
  }
  if (!Array.isArray(payload.issues)) throw new Error('issues must be array');
  for (const [i, issue] of payload.issues.entries()) {
    for (const key of REQUIRED_ISSUE) {
      if (issue[key] === undefined) throw new Error(`issues[${i}].${key} missing`);
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
    reviewer: payload.reviewer || 'claude',
    source: payload.source || 'live',
    issues: payload.issues.map((issue, i) => ({
      id: issue.id || `${issue.severity[0].toLowerCase()}${i + 1}`,
      severity: issue.severity,
      category: issue.category,
      summary: issue.summary,
      ...(issue.evidence && { evidence: issue.evidence }),
      ...(issue.root_cause && { root_cause: issue.root_cause }),
      outcome: issue.outcome || 'pending',
      ...(issue.addressed_in && { addressed_in: issue.addressed_in }),
    })),
  };
}

export function formatBodySection(entry, bodyMd) {
  const date = entry.ts.slice(0, 10);
  const header = `\n## Round ${entry.round} — ${date} (reviewer: ${entry.reviewer})\n\n`;
  const body = (bodyMd && bodyMd.trim()) || '(no body provided)';
  return header + body + '\n';
}

export function save(payload, dir = DEFAULT_REVIEWS_DIR) {
  validatePayload(payload);
  const nnn = String(payload.adr).padStart(3, '0');
  const filePath = resolve(dir, `${nnn}.md`);
  mkdirSync(dir, { recursive: true });

  let frontmatter;
  let body;
  let round;

  if (existsSync(filePath)) {
    const raw = readFileSync(filePath, 'utf8');
    const parsed = matter(raw);
    if (!parsed.data || !Array.isArray(parsed.data.reviews)) {
      throw new Error('malformed existing frontmatter');
    }
    frontmatter = parsed.data;
    body = parsed.content;
    round = frontmatter.reviews.length + 1;
  } else {
    frontmatter = {
      adr: payload.adr,
      title: payload.title || '(unknown)',
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
