/**
 * PIXI component plan summary checker.
 *
 * Usage:
 *   node scripts/check-pixi-component-plan.mjs
 *   node scripts/check-pixi-component-plan.mjs --write
 *   node scripts/check-pixi-component-plan.mjs --file path/to/PIXI_COMPONENT_PLAN.md
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STATUS_MARKERS = ['✅', '⚠️', '❌', '🔵'];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PLAN_PATH = path.resolve(
  __dirname,
  '../../../docs/PIXI_COMPONENT_PLAN.md'
);

function printUsage() {
  console.log(
    [
      'Usage:',
      '  node scripts/check-pixi-component-plan.mjs',
      '  node scripts/check-pixi-component-plan.mjs --write',
      '  node scripts/check-pixi-component-plan.mjs --file path/to/PIXI_COMPONENT_PLAN.md',
    ].join('\n')
  );
}

function extractSection(content, startPattern, endPattern, label) {
  const startIndex = content.search(startPattern);
  if (startIndex === -1) {
    throw new Error(`Missing start section: ${label}`);
  }

  const rest = content.slice(startIndex);
  const endIndex = rest.search(endPattern);
  if (endIndex === -1) {
    throw new Error(`Missing end section: ${label}`);
  }

  return content.slice(startIndex, startIndex + endIndex);
}

function countStatuses(section) {
  const counts = new Map(STATUS_MARKERS.map((marker) => [marker, 0]));
  let total = 0;

  for (const line of section.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    if (trimmed.includes('---')) continue;

    const cells = trimmed.split('|').map((cell) => cell.trim());
    if (cells.length < 3) continue;

    const status = cells[2];
    if (!counts.has(status)) continue;

    counts.set(status, counts.get(status) + 1);
    total += 1;
  }

  return { total, counts: Object.fromEntries(counts) };
}

function parseSummary(summaryBlock) {
  const summary = { total: null, counts: {} };

  for (const line of summaryBlock.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    if (trimmed.includes('---')) continue;

    const cells = trimmed.split('|').map((cell) => cell.trim());
    if (cells.length < 3) continue;

    const label = cells[1];
    const value = cells[2];

    if (label.startsWith('전체 Pixi 컴포넌트')) {
      const match = value.match(/^(\d+)개$/);
      if (match) summary.total = Number(match[1]);
      continue;
    }

    const status = STATUS_MARKERS.find((marker) => label.startsWith(marker));
    if (!status) continue;

    const match = value.match(/^(\d+)개\s*\((\d+)%\)$/);
    if (!match) continue;

    summary.counts[status] = {
      count: Number(match[1]),
      percent: Number(match[2]),
    };
  }

  return summary;
}

function formatPercent(count, total) {
  if (!total) return 0;
  return Math.round((count / total) * 100);
}

function updateSummaryBlock(summaryBlock, computed) {
  return summaryBlock
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('|')) return line;
      if (trimmed.includes('---')) return line;

      const cells = line.split('|');
      if (cells.length < 3) return line;

      const label = cells[1].trim();

      if (label.startsWith('전체 Pixi 컴포넌트')) {
        const nextValue = ` ${computed.total}개 `;
        cells[2] = nextValue;
        return cells.join('|');
      }

      const status = STATUS_MARKERS.find((marker) => label.startsWith(marker));
      if (!status) return line;

      const count = computed.counts[status] ?? 0;
      const percent = formatPercent(count, computed.total);
      const nextValue = ` ${count}개 (${percent}%) `;
      cells[2] = nextValue;
      return cells.join('|');
    })
    .join('\n');
}

function compareSummary(summary, computed) {
  const mismatches = [];

  if (summary.total !== computed.total) {
    mismatches.push(
      `total: found ${summary.total ?? 'n/a'}개, expected ${computed.total}개`
    );
  }

  for (const status of STATUS_MARKERS) {
    const expectedCount = computed.counts[status] ?? 0;
    const expectedPercent = formatPercent(expectedCount, computed.total);
    const found = summary.counts[status];

    if (!found) {
      mismatches.push(
        `${status}: missing summary row (expected ${expectedCount}개 (${expectedPercent}%))`
      );
      continue;
    }

    if (found.count !== expectedCount || found.percent !== expectedPercent) {
      mismatches.push(
        `${status}: found ${found.count}개 (${found.percent}%), expected ${expectedCount}개 (${expectedPercent}%)`
      );
    }
  }

  return mismatches;
}

async function run() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }

  const write = args.includes('--write') || args.includes('--fix');
  const fileIndex = args.findIndex((arg) => arg === '--file');
  const filePath =
    fileIndex !== -1 && args[fileIndex + 1]
      ? path.resolve(process.cwd(), args[fileIndex + 1])
      : DEFAULT_PLAN_PATH;

  const content = await readFile(filePath, 'utf-8');

  const summaryBlock = extractSection(
    content,
    /^### 1\.1/m,
    /^### 1\.2/m,
    'summary'
  );
  const componentBlock = extractSection(
    content,
    /^## 2\./m,
    /^## 3\./m,
    'components'
  );

  const computed = countStatuses(componentBlock);
  if (computed.total === 0) {
    throw new Error('No components found in section 2 tables.');
  }

  const summary = parseSummary(summaryBlock);
  const mismatches = compareSummary(summary, computed);

  if (write) {
    const nextSummaryBlock = updateSummaryBlock(summaryBlock, computed);
    const nextContent = content.replace(summaryBlock, nextSummaryBlock);
    if (nextContent !== content) {
      await writeFile(filePath, nextContent, 'utf-8');
      console.log('Summary updated.');
    } else {
      console.log('Summary already up to date.');
    }
    return;
  }

  if (mismatches.length > 0) {
    console.error('Summary mismatch detected:');
    for (const entry of mismatches) {
      console.error(`- ${entry}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Summary matches component tables.');
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
