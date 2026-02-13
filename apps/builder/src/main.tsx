import { useEffect, useState, JSX, lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useLocation,
} from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// 🚀 Phase 9: Performance Monitors (dev mode only)
// Side-effect import to initialize monitors and attach to window
import "./utils/longTaskMonitor";
import "./utils/postMessageMonitor";
import "./builder/fonts/initCustomFonts";

// Single CSS entry point - all imports handled in index.css via @import
import "./index.css";
import App from "./App.tsx";
import Dashboard from "./dashboard";
import Builder from "./builder";
import Signin from "./auth/Signin";
import { ThemeStudio } from "./builder/panels/themes/ThemeStudio.tsx";

// Lazy load PublishApp to prevent CSS conflicts (CSS loads only when route is accessed)
const PublishApp = lazy(() => import("@xstudio/publish"));
import { supabase } from "./env/supabase.client";
import { Session } from "@supabase/supabase-js";
import {
  ParticleBackground,
  ParticleBackgroundProvider,
} from "./components/ParticleBackground";

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };
    fetchSession();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (!session) return <Navigate to="/signin" />;
  return children;
};

function ThemeStudioRoute() {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) return <div>Project ID required</div>;
  return <ThemeStudio projectId={projectId} />;
}

function AppLayout() {
  const location = useLocation();
  const shouldShowBackground =
    location.pathname === "/" ||
    location.pathname === "/signin" ||
    location.pathname === "/dashboard";

  return (
    <>
      {shouldShowBackground && <ParticleBackground />}
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/signin" element={<Signin />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/builder/:projectId"
          element={
            <ProtectedRoute>
              <Builder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/theme/:projectId"
          element={
            <ProtectedRoute>
              <ThemeStudioRoute />
            </ProtectedRoute>
          }
        />
        <Route
          path="/publish/*"
          element={
            <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
              <PublishApp />
            </Suspense>
          }
        />
      </Routes>
    </>
  );
}

/**
 * React Query Client 설정
 *
 * 🚀 Phase 6: 서버 상태 관리 및 API 캐싱
 *
 * - staleTime: 5분 (데이터가 stale로 간주되기까지의 시간)
 * - gcTime: 30분 (캐시에서 제거되기까지의 시간, 구 cacheTime)
 * - retry: 2회 (실패 시 재시도)
 * - refetchOnWindowFocus: false (창 포커스 시 자동 refetch 비활성화)
 *
 * @since 2025-12-10 Phase 6 React Query
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 30 * 60 * 1000, // 30분 (구 cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const root = document.getElementById("root");

// GitHub Pages 배포 시 /xstudio/ 경로 사용
const basename = import.meta.env.PROD ? "/xstudio" : "/";

ReactDOM.createRoot(root!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter basename={basename}>
      <ParticleBackgroundProvider>
        <AppLayout />
      </ParticleBackgroundProvider>
    </BrowserRouter>
    {import.meta.env.DEV && (
      <ReactQueryDevtools
        initialIsOpen={false}
        buttonPosition="top-right"
        position="right"
      />
    )}
  </QueryClientProvider>
);
