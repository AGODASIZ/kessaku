import { supabase } from './supabase';

// 投稿しようとしている本文に、登録済みのNGワードが含まれていないかチェックする。
// 含まれていた場合は、最初に見つかったNGワードを返す（含まれていなければ null）。
export async function findNgWordInText(text: string): Promise<string | null> {
  const { data } = await supabase.from('ng_words').select('word');
  if (!data || data.length === 0) return null;

  const lowerText = text.toLowerCase();
  for (const row of data) {
    if (row.word && lowerText.includes(row.word.toLowerCase())) {
      return row.word;
    }
  }
  return null;
}