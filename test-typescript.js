const { execSync } = require('child_process');

try {
    console.log('TypeScript 타입 체크 실행 중...');
    const output = execSync('npx tsc --noEmit', {
        cwd: '/Users/admin/workspace/xstudio',
        encoding: 'utf8'
    });
    console.log('✅ TypeScript 타입 체크 성공!');
    if (output) {
        console.log('출력:', output);
    }
} catch (error) {
    console.log('❌ TypeScript 에러 발견:');
    console.log(error.stdout);
    console.log(error.stderr);
    process.exit(1);
}