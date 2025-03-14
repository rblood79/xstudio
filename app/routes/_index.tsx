import type { MetaFunction } from "@remix-run/node";
import { useOutletContext, useNavigate } from "@remix-run/react";
import { useEffect } from "react";
import type { Session } from '@supabase/supabase-js';

export const meta: MetaFunction = () => {
  return [
    { title: "xstudio" },
    { name: "description", content: "Welcome to XSTUDIO" },
  ];
};

type OutletContext = {
  session: Session | null;
};

export default function Index() {
  const { session } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (session) {
      navigate("/dashboard");
    }
  }, [session, navigate]);

  return (
    <div>
      <p>new XSTUDIO App.</p>
      {session ? (
        <>
          <p>Redirecting to dashboard...</p>
        </>
      ) : (
        <>
          <p>You are not logged in.</p>
          <button onClick={() => navigate("/signin")}>로그인</button>
          <button onClick={() => navigate("/signup")}>가입</button>
        </>
      )}
    </div>
  );
}



