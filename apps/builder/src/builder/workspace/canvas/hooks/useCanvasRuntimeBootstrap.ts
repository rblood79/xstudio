import { useCallback, useEffect, useState } from "react";
import type { Application as PixiApplication } from "pixi.js";
import { useStore } from "../../../stores";
import { initRustWasm, isRustWasmReady } from "../wasm-bindings/rustWasm";

interface CanvasRuntimeBootstrapResult {
  appReady: boolean;
  handlePixiAppInit: (app: PixiApplication) => void;
  pixiApp: PixiApplication | null;
  wasmLayoutFailed: boolean;
  wasmLayoutReady: boolean;
}

export function useCanvasRuntimeBootstrap(): CanvasRuntimeBootstrapResult {
  const [appReady, setAppReady] = useState(false);
  const [pixiApp, setPixiApp] = useState<PixiApplication | null>(null);
  const [wasmLayoutReady, setWasmLayoutReady] = useState(() =>
    isRustWasmReady(),
  );
  const [wasmLayoutFailed, setWasmLayoutFailed] = useState(false);

  useEffect(() => {
    const handleFontsReady = () => {
      useStore.getState().invalidateLayout();
    };

    window.addEventListener("xstudio:fonts-ready", handleFontsReady);
    return () =>
      window.removeEventListener("xstudio:fonts-ready", handleFontsReady);
  }, []);

  useEffect(() => {
    if (wasmLayoutReady) {
      return;
    }

    let delay = 200;
    const maxTotalWait = 15_000;
    let totalWait = 0;
    let retried = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = () => {
      if (isRustWasmReady()) {
        setWasmLayoutReady(true);
        return;
      }

      totalWait += delay;

      if (!retried && totalWait >= 5_000) {
        retried = true;
        if (import.meta.env.DEV) {
          console.warn("[BuilderCanvas] WASM 5초 미로드 — 재초기화 시도");
        }
        void initRustWasm();
      }

      if (totalWait >= maxTotalWait) {
        setWasmLayoutFailed(true);
        console.error(
          `[BuilderCanvas] WASM 로드 실패 (${maxTotalWait}ms 초과)`,
        );
        return;
      }

      delay = Math.min(delay * 2, 3200);
      timeoutId = setTimeout(poll, delay);
    };

    timeoutId = setTimeout(poll, delay);
    return () => clearTimeout(timeoutId);
  }, [wasmLayoutReady]);

  const handlePixiAppInit = useCallback((app: PixiApplication) => {
    setPixiApp(app);
    setAppReady(true);
  }, []);

  return {
    appReady,
    handlePixiAppInit,
    pixiApp,
    wasmLayoutFailed,
    wasmLayoutReady,
  };
}
