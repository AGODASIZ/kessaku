"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { checkIsAdmin } from '../../../lib/adminUtils';

export default function NgWordsAdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [words, setWords] = useState<any[]>([]);
  const [newWord, setNewWord] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    async function init() {
      const { isAdmin, user } = await checkIsAdmin();
      if (!user) {
        router.push('/login');
        return;
      }
      if (!isAdmin) {
        setChecking(false);
        return;
      }
      setIsAdmin(true);
      await fetchWords();
      setChecking(false);
    }
    init();
  }, [router]);

  const fetchWords = async () => {
    const { data } = await supabase.from('ng_words').select('*').order('word', { ascending: true });
    setWords(data || []);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    setAdding(true);

    const { error } = await supabase.from('ng_words').insert({ word: newWord.trim() });
    setAdding(false);

    if (error) {
      alert('追加に失敗しました: ' + error.message);
      return;
    }
    setNewWord('');
    await fetchWords();
  };

  const handleDelete = async (id: number) => {
    await supabase.from('ng_words').delete().eq('id', id);
    await fetchWords();
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500 gap-4">
        <span className="material-symbols-outlined text-4xl text-gray-300">lock</span>
        <p>このページは管理者のみアクセスできます。</p>
        <Link href="/" className="text-sm font-medium text-black underline underline-offset-4">トップページへ戻る</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 font-sans antialiased">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-gray-500 hover:text-black transition flex items-center gap-1 text-sm">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            トップへ戻る
          </Link>
          <Link href="/admin/reports" className="text-sm font-medium text-gray-600 hover:text-black transition">
            ← 通報管理
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-serif font-bold mb-2">NGワード管理</h1>
        <p className="text-sm text-gray-500 mb-8">
          ここに登録した語句が含まれている場合、感想コメント・演出ノートの投稿がブロックされます。
        </p>

        <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-lg p-5 mb-8 flex gap-3">
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="NGワードを入力"
            className="flex-grow bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-black transition"
          />
          <button
            type="submit"
            disabled={adding}
            className="bg-black text-white text-sm font-medium px-5 py-2 rounded hover:bg-gray-800 transition disabled:opacity-50"
          >
            追加
          </button>
        </form>

        {words.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">NGワードはまだ登録されていません。</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {words.map((w) => (
              <span
                key={w.id}
                className="bg-white border border-gray-200 text-gray-700 text-sm px-3 py-1.5 rounded-full flex items-center gap-2"
              >
                {w.word}
                <button onClick={() => handleDelete(w.id)} className="text-gray-400 hover:text-red-500 transition">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}