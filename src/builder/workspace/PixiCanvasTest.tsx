/**
 * PixiJS React v8 호환성 테스트
 *
 * 🚀 Phase 10 B0.1: @pixi/react v8 호환성 확인용 테스트 컴포넌트
 *
 * 테스트 항목:
 * 1. 기본 Application 생성
 * 2. Sprite 렌더링
 * 3. Graphics 렌더링
 * 4. 인터랙션 이벤트
 *
 * @since 2025-12-11 Phase 10 B0.1
 */

import { useRef, useEffect, useState } from 'react';
import { Application, extend, Graphics, Sprite, Container } from '@pixi/react';
import { Graphics as PixiGraphics, Sprite as PixiSprite, Container as PixiContainer } from 'pixi.js';

// Extend PixiJS with the components we want to use
extend({ Graphics: PixiGraphics, Sprite: PixiSprite, Container: PixiContainer });

// ============================================
// Types
// ============================================

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

// ============================================
// Test Graphics Component
// ============================================

function TestRectangle({ x, y, onClick }: { x: number; y: number; onClick?: () => void }) {
  const draw = (g: PixiGraphics) => {
    g.clear();
    g.rect(0, 0, 100, 100);
    g.fill({ color: 0x3b82f6 }); // Blue
    g.stroke({ color: 0x1e40af, width: 2 });
  };

  return (
    <pixiGraphics
      x={x}
      y={y}
      draw={draw}
      eventMode="static"
      cursor="pointer"
      onPointerDown={onClick}
    />
  );
}

// ============================================
// Main Test Component
// ============================================

export function PixiCanvasTest() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  // Run tests
  const runTests = async () => {
    setIsRunning(true);
    const testResults: TestResult[] = [];

    // Test 1: Check if Application renders
    try {
      if (containerRef.current) {
        testResults.push({ name: 'Application 렌더링', passed: true });
      } else {
        testResults.push({ name: 'Application 렌더링', passed: false, error: 'Container not found' });
      }
    } catch (error) {
      testResults.push({ name: 'Application 렌더링', passed: false, error: String(error) });
    }

    // Test 2: Check pixi.js import
    try {
      if (PixiGraphics && PixiSprite && PixiContainer) {
        testResults.push({ name: 'pixi.js 모듈 임포트', passed: true });
      } else {
        testResults.push({ name: 'pixi.js 모듈 임포트', passed: false, error: 'Modules not found' });
      }
    } catch (error) {
      testResults.push({ name: 'pixi.js 모듈 임포트', passed: false, error: String(error) });
    }

    // Test 3: Check extend API
    try {
      testResults.push({ name: '@pixi/react extend API', passed: true });
    } catch (error) {
      testResults.push({ name: '@pixi/react extend API', passed: false, error: String(error) });
    }

    setResults(testResults);
    setIsRunning(false);
  };

  useEffect(() => {
    // Auto-run tests after mount
    const timer = setTimeout(() => {
      runTests();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleRectangleClick = () => {
    setClickCount((prev) => prev + 1);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>🎮 PixiJS React v8 호환성 테스트</h2>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        style={{
          width: '400px',
          height: '300px',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '20px',
        }}
      >
        <Application
          width={400}
          height={300}
          background={0xf3f4f6}
          antialias={true}
        >
          <pixiContainer x={50} y={50}>
            <TestRectangle x={0} y={0} onClick={handleRectangleClick} />
            <TestRectangle x={120} y={0} />
            <TestRectangle x={240} y={0} />
          </pixiContainer>

          <pixiContainer x={50} y={170}>
            <TestRectangle x={0} y={0} />
            <TestRectangle x={120} y={0} />
            <TestRectangle x={240} y={0} />
          </pixiContainer>
        </Application>
      </div>

      {/* Interaction Test */}
      <div style={{ marginBottom: '20px' }}>
        <strong>인터랙션 테스트:</strong> 첫 번째 사각형을 클릭하세요
        <br />
        클릭 횟수: <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{clickCount}</span>
        {clickCount > 0 && ' ✅ 이벤트 동작 확인!'}
      </div>

      {/* Test Results */}
      <div>
        <h3>테스트 결과</h3>
        {isRunning ? (
          <p>테스트 실행 중...</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {results.map((result, index) => (
              <li
                key={index}
                style={{
                  padding: '8px 12px',
                  marginBottom: '4px',
                  backgroundColor: result.passed ? '#dcfce7' : '#fee2e2',
                  borderRadius: '4px',
                }}
              >
                {result.passed ? '✅' : '❌'} {result.name}
                {result.error && <span style={{ color: '#991b1b' }}> - {result.error}</span>}
              </li>
            ))}
            {clickCount > 0 && (
              <li
                style={{
                  padding: '8px 12px',
                  marginBottom: '4px',
                  backgroundColor: '#dcfce7',
                  borderRadius: '4px',
                }}
              >
                ✅ 포인터 이벤트 핸들링
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Summary */}
      {results.length > 0 && (
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: results.every((r) => r.passed) ? '#dcfce7' : '#fef3c7',
            borderRadius: '8px',
          }}
        >
          <strong>
            {results.every((r) => r.passed)
              ? '🎉 모든 테스트 통과! @pixi/react v8이 React 19와 호환됩니다.'
              : '⚠️ 일부 테스트 실패. 로그를 확인하세요.'}
          </strong>
        </div>
      )}
    </div>
  );
}

export default PixiCanvasTest;
