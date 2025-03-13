import { Session, createClient } from "@supabase/supabase-js";
const supabase = createClient("http://121.146.229.198:8000", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzQxMTAwNDAwLAogICJleHAiOiAxODk4ODY2ODAwCn0.-ecQE0vNhNZE6kNt2nBZlcTkQhUtKgOWqFfGrBWH38g");
export type { Session };
export { supabase };


/*import { Session, createClient } from "@supabase/supabase-js";
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_KEY must be defined in .env");
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
export type { Session };
export { supabase };*/