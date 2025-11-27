import { useEffect, useState, JSX } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useLocation,
} from "react-router";
import "./index.css";
import App from "./App.tsx";
import Dashboard from "./dashboard";
import Builder from "./builder";
import Signin from "./auth/Signin";
import { ThemeStudio } from "./builder/panels/themes/ThemeStudio.tsx";
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
      </Routes>
    </>
  );
}

const root = document.getElementById("root");

ReactDOM.createRoot(root!).render(
  <BrowserRouter>
    <ParticleBackgroundProvider>
      <AppLayout />
    </ParticleBackgroundProvider>
  </BrowserRouter>
);
