"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { findNgWordInText } from '../../../lib/ngWordUtils';

function ScriptCommentsContent() {
  const searchParams = useSearchParams();
  const scriptId = searchParams.get('id');

  const [script, setScript] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [comments, setComments] = useState<any[]>([]);
  const [commentName, setCommentName] = useState('');
  const [commentBody, setCommentBody] = useState('');
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

      const { data: commentsData } = await supabase
        .from('comments')
        .select('*')
        .eq('script_id', scriptId)
        .order('created_at', { ascending: false });
      setComments(commentsData || []);

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
    if (!commentBody.trim()) return;
    setSubmitting(true);

    // NGワードチェック
    const ngWord = await findNgWordInText(commentBody);
    if (ngWord) {
      setSubmitting(false);
      alert('不適切な可能性がある語句が含まれているため、投稿できませんでした。内容を見直してください。');
      return;
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        script_id: script.id,
        user_id: user.id,
        display_name: commentName.trim() || null,
        body: commentBody.trim(),
      })
      .select()
      .single();

    setSubmitting(false);

    if (error) {
      alert('コメントの投稿に失敗しました: ' + error.message);
      return;
    }

    setComments((prev) => [data, ...prev]);
    setCommentBody('');
  };

  // コメントの通報
  const handleReport = async (commentId: number) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    const reason = window.prompt('通報理由を入力してください（任意）') || '';
    const { error } = await supabase.from('reports').insert({
      target_type: 'comment',
      target_id: commentId,
      reporter_id: user.id,
      reason: reason || null,
    });
    if (error) {
      alert('通報に失敗しました: ' + error.message);
      return;
    }
    alert('通報しました。ご報告ありがとうございます。');
  };

  const handleDelete = async (commentId: number) => {
    const confirmed = window.confirm('このコメントを削除します。よろしいですか？');
    if (!confirmed) return;

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      alert('削除に失敗しました: ' + error.message);
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
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
        <h1 className="text-xl font-serif font-bold mb-1">{script.title} の感想</h1>
        <p className="text-sm text-gray-500 mb-6">作者：{script.author}</p>

        {/* 投稿フォーム */}
        {user ? (
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-5 mb-8 space-y-3">
            <input
              type="text"
              value={commentName}
              onChange={(e) => setCommentName(e.target.value)}
              placeholder="お名前（任意）"
              className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-black transition"
            />
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="台本を読んだ感想を書く"
              rows={3}
              className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-black transition resize-none"
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-black text-white text-sm font-medium px-5 py-2 rounded hover:bg-gray-800 transition disabled:opacity-50"
            >
              {submitting ? '送信中...' : '感想を投稿'}
            </button>
          </form>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-8 text-sm text-gray-500 text-center">
            感想を書くには<Link href="/login" className="text-black underline underline-offset-2 font-medium">ログイン</Link>してください。
          </div>
        )}

        {/* 一覧 */}
        {comments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">まだ感想はありません。</p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-gray-800">{comment.display_name || '名無しさん'}</span>
                  <div className="flex items-center gap-1">
                    {user && user.id !== comment.user_id && (
                      <button onClick={() => handleReport(comment.id)} className="text-gray-300 hover:text-amber-500 transition" title="通報する">
                        <span className="material-symbols-outlined text-[18px]">flag</span>
                      </button>
                    )}
                    {user && (user.id === comment.user_id || user.id === script.user_id) && (
                      <button onClick={() => handleDelete(comment.id)} className="text-gray-300 hover:text-red-500 transition" title="削除">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ScriptCommentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>}>
      <ScriptCommentsContent />
    </Suspense>
  );
}