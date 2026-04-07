import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase URL과 API 키 가져오기
// Vite는 import.meta.env를 사용 (process.env는 브라우저에서 사용 불가)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 환경 변수 검증
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  console.error('📝 .env.local 파일에 다음 변수를 추가하세요:');
  console.error('   VITE_SUPABASE_URL=your_supabase_url');
  console.error('   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
}

// 환경별로 다른 스토리지 키 사용
const storageKey = import.meta.env.DEV
    ? 'composition-auth-dev'
    : 'composition-auth-prod';

// 전역 인스턴스 생성 (싱글톤 패턴)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        storageKey
    }
});