"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { checkIsAdmin } from '../../../lib/adminUtils';

const TARGET_LABELS: Record<string, string> = {
  script: '台本',
  comment: '感想コメント',
  note: '演出ノート',
};

export default function ReportsAdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [targetDetails, setTargetDetails] = useState<Record<string, any>>({});

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
      await fetchReports();
      setChecking(false);
    }
    init();
  }, [router]);

  const fetchReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setReports(data || []);

    // 通報対象の内容（本文やタイトル）を種類ごとに取得してプレビューできるようにする
    const details: Record<string, any> = {};
    for (const report of data || []) {
      const key = `${report.target_type}:${report.target_id}`;
      if (details[key]) continue;

      if (report.target_type === 'script') {
        const { data: s } = await supabase.from('scripts').select('title, author').eq('id', report.target_id).maybeSingle();
        details[key] = s;
      } else if (report.target_type === 'comment') {
        const { data: c } = await supabase.from('comments').select('body, display_name').eq('id', report.target_id).maybeSingle();
        details[key] = c;
      } else if (report.target_type === 'note') {
        const { data: n } = await supabase.from('performance_notes').select('title, body').eq('id', report.target_id).maybeSingle();
        details[key] = n;
      }
    }
    setTargetDetails(details);
  };

  // 通報を「対応済み」にする（内容はそのまま残す。問題なしと判断した場合など）
  const handleDismiss = async (reportId: number) => {
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  // 通報対象自体を削除し、通報も対応済みにする
  const handleDeleteTarget = async (report: any) => {
    const confirmed = window.confirm('通報された対象を削除します。よろしいですか？');
    if (!confirmed) return;

    const table = report.target_type === 'script' ? 'scripts' : report.target_type === 'comment' ? 'comments' : 'performance_notes';
    await supabase.from(table).delete().eq('id', report.target_id);
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', report.id);

    setReports((prev) => prev.filter((r) => r.id !== report.id));
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
          <Link href="/admin/ng-words" className="text-sm font-medium text-gray-600 hover:text-black transition">
            NGワード管理 →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-serif font-bold mb-2">通報管理</h1>
        <p className="text-sm text-gray-500 mb-8">未対応の通報：{reports.length}件</p>

        {reports.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">未対応の通報はありません。</p>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const key = `${report.target_type}:${report.target_id}`;
              const detail = targetDetails[key];
              return (
                <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2 py-0.5 rounded-full">
                      {TARGET_LABELS[report.target_type] || report.target_type}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(report.created_at).toLocaleString('ja-JP')}</span>
                  </div>

                  {/* 対象内容のプレビュー */}
                  <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 mb-2">
                    {report.target_type === 'script' && detail && (
                      <p>「{detail.title}」（{detail.author}）</p>
                    )}
                    {report.target_type === 'comment' && detail && (
                      <p>{detail.display_name || '名無しさん'}：{detail.body}</p>
                    )}
                    {report.target_type === 'note' && detail && (
                      <p>{detail.title ? `${detail.title}：` : ''}{detail.body}</p>
                    )}
                    {!detail && <p className="text-gray-400">（対象は既に削除されています）</p>}
                  </div>

                  {report.reason && (
                    <p className="text-xs text-gray-500 mb-3">通報理由：{report.reason}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteTarget(report)}
                      className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-red-700 transition"
                    >
                      対象を削除
                    </button>
                    <button
                      onClick={() => handleDismiss(report.id)}
                      className="bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded hover:bg-gray-200 transition"
                    >
                      問題なし（対応済みにする）
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}