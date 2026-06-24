"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { getLicenseBadge } from '../../lib/licenseUtils';

function AuthorPageContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('id');

  const [scripts, setScripts] = useState<any[]>([]);
  const [authorName, setAuthorName] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchAuthorScripts() {
      if (!userId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('scripts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'published')
        .order('id', { ascending: false });

      if (error || !data || data.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setScripts(data);
      // 作品の author 表記をそのままプロフィール名として使う（最新の投稿のものを採用）
      setAuthorName(data[0].author || '不明な作者');
      setLoading(false);
    }
    fetchAuthorScripts();
  }, [userId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>;
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500 gap-4">
        <p>この作者の公開作品が見つかりませんでした。</p>
        <Link href="/search" className="text-sm font-medium text-black underline underline-offset-4">
          台本を探すページへ戻る
        </Link>
      </div>
    );
  }

  const adaptationCount = scripts.filter((s) => s.original_script_id).length;

  return (
    <div className="text-gray-900 bg-gray-50/30 font-sans antialiased min-h-screen flex flex-col">

      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-baseline gap-1.5 md:gap-2">
            <span className="text-xl md:text-2xl font-serif font-bold tracking-wider">傑作</span>
            <span className="text-[10px] md:text-xs text-gray-500 font-medium tracking-widest">Kessaku</span>
          </Link>
          <Link href="/search" className="text-sm font-medium hover:text-gray-600 transition">台本を探す</Link>
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto px-6 py-12 w-full">

        {/* 作者プロフィールカード */}
        <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm mb-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 flex-shrink-0">
            <span className="material-symbols-outlined text-3xl">person</span>
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold">{authorName}</h1>
            <p className="text-sm text-gray-500 mt-1">
              公開作品 {scripts.length}件
              {adaptationCount > 0 && `（うち翻案 ${adaptationCount}件）`}
            </p>
          </div>
        </div>

        {/* 公開作品一覧 */}
        <h2 className="text-xl font-serif font-bold mb-4 flex items-center gap-2">
          <span className="w-1 h-6 bg-black block rounded-full"></span> 公開している台本
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scripts.map((script) => {
            const badge = getLicenseBadge(script);
            return (
              <Link
                href={`/script?id=${script.id}`}
                key={script.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition cursor-pointer block"
              >
                <h3 className="text-lg font-serif font-bold mb-2">{script.title}</h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-4">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span> {script.time || '未設定'}</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">category</span> {script.genre || '未設定'}</span>
                </div>
                <div className={`text-xs font-medium flex items-center gap-1 ${badge.color}`}>
                  <span className="material-symbols-outlined text-sm">{badge.icon}</span> {badge.label}
                </div>
              </Link>
            );
          })}
        </div>

      </main>

      <footer className="bg-gray-50 pt-10 pb-8 border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-gray-500">
          &copy; 2024 傑作 (Kessaku). All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default function AuthorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>}>
      <AuthorPageContent />
    </Suspense>
  );
}