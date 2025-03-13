import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { useEffect, useState } from "react";
import { supabase, Session } from './supabase.client';

export default function Root() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" /> {/* 인코딩 지정 추가 */}
        <Links />
        <Meta />
      </head>
      <body>
        <header>notice</header>
        <Outlet context={{ session }} /> {/* 세션을 context로 전달 */}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
