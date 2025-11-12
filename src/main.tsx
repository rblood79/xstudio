import { useEffect, useState, JSX } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router";
import "./index.css";
import App from "./App.tsx";
import Dashboard from "./dashboard";
import Builder from "./builder";
import Preview from "./builder/preview/index.tsx";
import Signin from "./auth/Signin";
import { ThemeStudio } from "./builder/panels/themes/ThemeStudio.tsx";
import { supabase } from "./env/supabase.client";
import { Session } from "@supabase/supabase-js";

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

const root = document.getElementById("root");

ReactDOM.createRoot(root!).render(
  <BrowserRouter>
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
        path="/preview/:projectId"
        element={
          <ProtectedRoute>
            <Preview />
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
  </BrowserRouter>
);
