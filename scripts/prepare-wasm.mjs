/**
 * CanvasKit WASM 파일 복사 스크립트
 *
 * canvaskit-wasm npm 패키지의 .wasm 파일을 apps/builder/public/wasm/에 복사한다.
 * pnpm install 시 postinstall로 자동 실행된다.
 *
 * @see docs/WASM.md §5.2 WASM 파일 복사 설정
 */

import { cpSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));

// createRequire의 기준을 apps/builder/package.json으로 설정한다.
// canvaskit-wasm은 apps/builder의 의존성이므로,
// pnpm strict(non-hoist) 모드에서도 apps/builder 기준으로 해석해야 찾을 수 있다.
const builderPkg = resolve(__dirname, '../apps/builder/package.json');

let require;
try {
  require = createRequire(builderPkg);
} catch {
  console.warn('⚠️  apps/builder/package.json을 찾을 수 없습니다. canvaskit-wasm 복사를 건너뜁니다.');
  process.exit(0);
}

let src;
try {
  src = require.resolve('canvaskit-wasm/bin/canvaskit.wasm');
} catch {
  console.warn('⚠️  canvaskit-wasm 패키지를 찾을 수 없습니다. pnpm install을 먼저 실행하세요.');
  process.exit(0);
}

const dest = resolve(__dirname, '../apps/builder/public/wasm/canvaskit.wasm');

mkdirSync(dirname(dest), { recursive: true });
cpSync(src, dest);

const sizeMB = (statSync(dest).size / 1024 / 1024).toFixed(1);

console.log(`✅ canvaskit.wasm → ${dest} (${sizeMB}MB)`);
