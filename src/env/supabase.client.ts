import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase URL과 API 키 가져오기
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// 환경별로 다른 스토리지 키 사용
const storageKey = import.meta.env.DEV
    ? 'xstudio-auth-dev'
    : 'xstudio-auth-prod';

// 전역 인스턴스 생성 (싱글톤 패턴)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        storageKey
    }
});