import { supabase } from './supabase';

// 現在ログイン中のユーザーが管理者かどうかを判定する
// profiles テーブルの is_admin フラグを確認する
export async function checkIsAdmin(): Promise<{ isAdmin: boolean; user: any | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isAdmin: false, user: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  return { isAdmin: !!profile?.is_admin, user };
}