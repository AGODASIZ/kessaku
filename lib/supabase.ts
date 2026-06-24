import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('SupabaseのURLまたはAnon Keyが設定されていません。.env.localファイルを確認してください。');
}

// 他のファイルからいつでも呼び出せるようにエクスポートします
export const supabase = createClient(supabaseUrl, supabaseAnonKey);