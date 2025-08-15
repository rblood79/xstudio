import { useEffect, useState, JSX, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import './index.css'
import App from './App.tsx'
import { supabase } from './env/supabase.client';
import { Session } from '@supabase/supabase-js';

// Lazy load heavy routes
const Dashboard = lazy(() => import('./dashboard'));
const Builder = lazy(() => import('./builder/builder.tsx'));
const Preview = lazy(() => import('./builder/preview/index.tsx'));
const Signin = lazy(() => import('./auth/Signin'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };
    fetchSession();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!session) return <Navigate to="/signin" />;
  return children;
};

const root = document.getElementById("root");

ReactDOM.createRoot(root!).render(
  <BrowserRouter>
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/builder/:projectId" element={<ProtectedRoute><Builder /></ProtectedRoute>} />
        <Route path="/preview/:projectId" element={<ProtectedRoute><Preview /></ProtectedRoute>} />
      </Routes>
    </Suspense>
  </BrowserRouter>
)
