import { defineConfig } from "vite";
import type { Connect, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import wasm from "vite-plugin-wasm";
import type { IncomingMessage, ServerResponse } from "http";

/**
 * 범용 API 프록시 미들웨어
 * 사용법: /api/proxy?url=https://pokeapi.co/api/v2/pokemon
 */
function createProxyMiddleware(): Connect.NextHandleFunction {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: Connect.NextFunction
  ) => {
    // 모든 /api 요청 로깅
    if (req.url?.startsWith("/api")) {
      console.log(`\n📥 [Proxy] Request received: ${req.method} ${req.url}`);
    }

    if (!req.url?.startsWith("/api/proxy")) {
      return next();
    }

    console.log(`🔄 [Proxy] Processing: ${req.url}`);
    const urlObj = new URL(req.url, "http://localhost");
    const targetUrl = urlObj.searchParams.get("url");

    if (!targetUrl) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Missing url parameter" }));
      return;
    }

    try {
      // 요청 헤더 복사 (호스트 관련 헤더 제외)
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (
          !["host", "connection", "origin", "referer"].includes(
            key.toLowerCase()
          ) &&
          value
        ) {
          headers[key] = Array.isArray(value) ? value[0] : value;
        }
      }

      // Body 읽기 (POST/PUT 등)
      let body: string | undefined;
      if (req.method !== "GET" && req.method !== "HEAD") {
        body = await new Promise<string>((resolve) => {
          const chunks: Buffer[] = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("end", () => resolve(Buffer.concat(chunks).toString()));
        });
      }

      // 외부 API 호출
      const response = await fetch(targetUrl, {
        method: req.method || "GET",
        headers,
        body,
      });

      // CORS 헤더 추가
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );

      // OPTIONS 요청 처리
      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }

      // 응답 전달
      res.statusCode = response.status;

      // 문제를 일으킬 수 있는 헤더 제외
      const skipHeaders = [
        "access-control",
        "content-encoding",
        "transfer-encoding",
        "content-length",
        "connection",
      ];

      response.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (!skipHeaders.some(skip => lowerKey.includes(skip))) {
          res.setHeader(key, value);
        }
      });

      const responseBody = await response.text();
      console.log(`✅ [Proxy] Response: ${response.status}, ${responseBody.length} bytes`);
      res.end(responseBody);
    } catch (error) {
      console.error("[Proxy Error]", error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(error) }));
    }
  };
}

/**
 * API 프록시 플러그인
 */
function apiProxyPlugin() {
  return {
    name: "api-proxy-plugin",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(createProxyMiddleware());
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  return {
    plugins: [wasm(), apiProxyPlugin(), react()],
    worker: {
      format: 'es',
      plugins: () => [wasm()],
    },
    base: command === "build" ? "/xstudio/" : "/",
    build: {
      // 브라우저 호환성 명시 (필요시)
      // 'baseline-widely-available'은 Vite 7의 기본값
      // 더 넓은 호환성이 필요하면 'modules' 사용
      target: "baseline-widely-available", // 또는 'modules'
    },
    resolve: {
      alias: [
        { find: "@", replacement: `${import.meta.dirname}/src` },
        // @xstudio/shared aliases - must be ordered from most specific to least specific
        { find: /^@xstudio\/shared\/components\/styles\/(.*)$/, replacement: `${import.meta.dirname}/../../packages/shared/src/components/styles/$1` },
        { find: /^@xstudio\/shared\/components\/(.*)$/, replacement: `${import.meta.dirname}/../../packages/shared/src/components/$1` },
        { find: "@xstudio/shared/components", replacement: `${import.meta.dirname}/../../packages/shared/src/components/index.tsx` },
        { find: "@xstudio/shared/utils", replacement: `${import.meta.dirname}/../../packages/shared/src/utils/index.ts` },
        { find: "@xstudio/shared/types", replacement: `${import.meta.dirname}/../../packages/shared/src/types/index.ts` },
        { find: "@xstudio/shared/renderers", replacement: `${import.meta.dirname}/../../packages/shared/src/renderers/index.ts` },
        { find: "@xstudio/shared/hooks", replacement: `${import.meta.dirname}/../../packages/shared/src/hooks/index.ts` },
        { find: "@xstudio/shared", replacement: `${import.meta.dirname}/../../packages/shared/src/index.ts` },
      ],
    },
    optimizeDeps: {
      // Rust WASM 모듈은 Vite 사전 번들링에서 제외
      exclude: ["xstudio-wasm"],
      // 주요 의존성의 사전 번들링 강제 (의존성 스캔 오류 방지)
      include: [
        "react",
        "react-dom",
        "react-router",
        "react-router-dom",
        "@supabase/supabase-js",
        "react-aria-components",
        "zustand",
        "three",
        "three/examples/jsm/postprocessing/EffectComposer.js",
        "three/examples/jsm/postprocessing/RenderPass.js",
        "three/examples/jsm/postprocessing/AfterimagePass.js",
        "three/examples/jsm/postprocessing/UnrealBloomPass.js",
        "three/examples/jsm/postprocessing/OutputPass.js",
      ],
    },
    server: {
      // Note: Supabase client connects directly using VITE_SUPABASE_URL
      headers: {
        // Development CORS headers (느슨한 설정)
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        // ⚠️ COEP/COOP 제거 - Supabase 인증과 충돌
        // 외부 API는 /api/proxy를 통해 호출하므로 COEP 불필요
      },
      hmr: {
        overlay: true,
      },
    },
    css: {
      modules: {
        // CSS Modules 설정
        localsConvention: "camelCaseOnly", // 클래스 이름을 camelCase로 변환
        generateScopedName: "[name]__[local]__[hash:base64:5]", // 고유 클래스 이름 생성 규칙
      },
    },
  };
});
