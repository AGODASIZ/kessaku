"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { findNgWordInText } from '../../../lib/ngWordUtils';

function ScriptNotesContent() {
  const searchParams = useSearchParams();
  const scriptId = searchParams.get('id');

  const [script, setScript] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [notes, setNotes] = useState<any[]>([]);
  const [canWrite, setCanWrite] = useState(false);

  const [groupName, setGroupName] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!scriptId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const { data: scriptData, error: scriptError } = await supabase
        .from('scripts')
        .select('id, title, author, user_id')
        .eq('id', scriptId)
        .single();

      if (scriptError || !scriptData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setScript(scriptData);

      const { data: notesData } = await supabase
        .from('performance_notes')
        .select('*')
        .eq('script_id', scriptId)
        .order('created_at', { ascending: false });
      setNotes(notesData || []);

      // 演出ノートを書けるかを判定
      if (user) {
        if (user.id === scriptData.user_id) {
          setCanWrite(true);
        } else {
          const { data: ownReport } = await supabase
            .from('performance_reports')
            .select('id, group_name')
            .eq('script_id', scriptId)
            .eq('reporter_id', user.id)
            .eq('status', 'approved')
            .limit(1)
            .maybeSingle();
          setCanWrite(!!ownReport);
          if (ownReport?.group_name) setGroupName(ownReport.group_name);
        }
      }

      setLoading(false);
    }
    fetchData();
  }, [scriptId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      window.location.href = '/login';
      return;
    }
    if (!noteBody.trim()) return;
    setSubmitting(true);

    // NGワードチェック（タイトル・本文両方）
    const ngWord = await findNgWordInText(`${noteTitle} ${noteBody}`);
    if (ngWord) {
      setSubmitting(false);
      alert('不適切な可能性がある語句が含まれているため、投稿できませんでした。内容を見直してください。');
      return;
    }

    const { data, error } = await supabase
      .from('performance_notes')
      .insert({
        script_id: script.id,
        user_id: user.id,
        group_name: groupName.trim() || null,
        title: noteTitle.trim() || null,
        body: noteBody.trim(),
      })
      .select()
      .single();

    setSubmitting(false);

    if (error) {
      alert('演出ノートの投稿に失敗しました: ' + error.message);
      return;
    }

    setNotes((prev) => [data, ...prev]);
    setNoteTitle('');
    setNoteBody('');
  };

  // 演出ノートの通報
  const handleReport = async (noteId: number) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    const reason = window.prompt('通報理由を入力してください（任意）') || '';
    const { error } = await supabase.from('reports').insert({
      target_type: 'note',
      target_id: noteId,
      reporter_id: user.id,
      reason: reason || null,
    });
    if (error) {
      alert('通報に失敗しました: ' + error.message);
      return;
    }
    alert('通報しました。ご報告ありがとうございます。');
  };

  const handleDelete = async (noteId: number) => {
    const confirmed = window.confirm('この演出ノートを削除します。よろしいですか？');
    if (!confirmed) return;

    const { error } = await supabase
      .from('performance_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      alert('削除に失敗しました: ' + error.message);
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>;
  }

  if (notFound || !script) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500 gap-4">
        <p>台本が見つかりませんでした。</p>
        <Link href="/search" className="text-sm font-medium text-black underline underline-offset-4">台本を探すページへ戻る</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 font-sans antialiased flex flex-col">
      <header className="border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur-sm z-50">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-14 flex items-center gap-3">
          <Link href={`/script?id=${script.id}`} className="text-gray-500 hover:text-black transition flex items-center gap-1 text-sm">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            台本詳細へ戻る
          </Link>
        </div>
      </header>

      <main className="flex-grow max-w-3xl w-full mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-violet-500">theater_comedy</span>
          <h1 className="text-xl font-serif font-bold">{script.title} の演出ノート</h1>
        </div>
        <p className="text-sm text-gray-500 mb-2">作者：{script.author}</p>
        <p className="text-xs text-gray-400 mb-6">
          実際にこの台本を上演した方が、工夫した点や演出のポイントを共有する場所です。
        </p>

        {/* 投稿フォーム（権限がある人だけ表示） */}
        {user && canWrite && (
          <form onSubmit={handleSubmit} className="bg-white border border-violet-200 rounded-lg p-5 mb-8 space-y-3">
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="上演した団体・個人名（任意）"
              className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-black transition"
            />
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="ノートの見出し（任意。例：照明を使わない演出にした理由）"
              className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-black transition"
            />
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="演出の工夫や裏話を書く"
              rows={4}
              className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-black transition resize-none"
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-violet-600 text-white text-sm font-medium px-5 py-2 rounded hover:bg-violet-700 transition disabled:opacity-50"
            >
              {submitting ? '送信中...' : '演出ノートを投稿'}
            </button>
          </form>
        )}

        {user && !canWrite && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-8 text-sm text-gray-500 text-center">
            演出ノートは、この台本の承認済み上演報告を持つ方のみ投稿できます。
          </div>
        )}

        {!user && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-8 text-sm text-gray-500 text-center">
            演出ノートを書くには<Link href="/login" className="text-black underline underline-offset-2 font-medium">ログイン</Link>してください。
          </div>
        )}

        {/* 一覧 */}
        {notes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">まだ演出ノートはありません。</p>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    {note.group_name && (
                      <span className="bg-violet-50 text-violet-700 border border-violet-200 text-xs font-bold px-2 py-0.5 rounded-full">
                        {note.group_name}
                      </span>
                    )}
                  </div>
                  {user && (user.id === note.user_id || user.id === script.user_id) ? (
                    <button onClick={() => handleDelete(note.id)} className="text-gray-300 hover:text-red-500 transition" title="削除">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  ) : user ? (
                    <button onClick={() => handleReport(note.id)} className="text-gray-300 hover:text-amber-500 transition" title="通報する">
                      <span className="material-symbols-outlined text-[18px]">flag</span>
                    </button>
                  ) : null}
                </div>
                {note.title && <h3 className="font-bold text-gray-800 mb-1.5">{note.title}</h3>}
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.body}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ScriptNotesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>}>
      <ScriptNotesContent />
    </Suspense>
  );
}