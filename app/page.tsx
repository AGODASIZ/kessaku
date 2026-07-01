"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase'; // パスが違う場合は修正してください
import LoadingSplash from '../components/LoadingSplash';
import TopStage from '../components/TopStage';

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null); // ログインユーザー情報を保持（ヘッダーの表示切り替えに使う）

  // 初回読み込み中のスプラッシュ画面（動画）表示フラグ。
  const [showSplash, setShowSplash] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && minTimeElapsed) {
      setShowSplash(false);
    }
  }, [loading, minTimeElapsed]);

  useEffect(() => {
    async function initialize() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }
    initialize();
  }, []);

  // トップページはスクロールしない1画面構成にする。
  // ページを離れたら元に戻す（他ページまでスクロール不可になるのを防ぐ）。
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden text-gray-900 bg-white font-sans antialiased">

      {/* 初回読み込み中のスプラッシュ画面（スマホでのみ表示）。 */}
      <LoadingSplash isVisible={showSplash} />

      {/* Header：背景なし。ロゴとログイン導線だけを背景画像の上に重ねる */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-baseline gap-1.5 md:gap-2 text-[#16181C]">
            <span className="text-xl md:text-2xl font-serif font-bold tracking-wider">傑作</span>
            <span className="text-[10px] md:text-xs font-medium tracking-widest opacity-70">Kessaku</span>
          </Link>

          <div className="flex items-center gap-3 md:gap-6 text-[#16181C]">
            {user ? (
              <Link href="/mypage" aria-label="マイページ">
                <span className="material-symbols-outlined text-2xl">account_circle</span>
              </Link>
            ) : (
              <Link href="/login" aria-label="ログイン">
                <span className="material-symbols-outlined text-2xl">login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* トップページの主導線：背景 + 「さがす」「つくる」の円だけの1画面（フッターなし） */}
      <TopStage />

    </div>
  );
}