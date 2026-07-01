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
  // データ取得が終わるまで、かつ最低数秒間は表示し続ける（一瞬で消えてアニメーションが
  // 見えなくなるのを防ぐため）。スマホ表示でのみ実際には見える（LoadingSplash内部でmd:hidden）。
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

  // 画面が開いた瞬間にログイン状態だけを確認する
  // （トップページ自体は「さがす」「つくる」の2導線のみなので、台本一覧などは取得しない）
  useEffect(() => {
    async function initialize() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }
    initialize();
  }, []);

  return (
    <div className="text-gray-900 bg-white font-sans antialiased">

      {/* 初回読み込み中のスプラッシュ画面（スマホでのみ表示）。
          常にレンダリングし、isVisible で表示/フェードアウトを制御する
          （こうしないと、消える瞬間のフェードアニメーションが再生されない） */}
      <LoadingSplash isVisible={showSplash} />

      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-baseline gap-1.5 md:gap-2">
            <span className="text-xl md:text-2xl font-serif font-bold tracking-wider">傑作</span>
            <span className="text-[10px] md:text-xs text-gray-500 font-medium tracking-widest">Kessaku</span>
          </Link>

          {/* Nav Actions */}
          <div className="flex items-center gap-3 md:gap-6">
            {user ? (
              <Link href="/mypage" className="text-sm font-medium text-gray-700 hover:text-black transition flex items-center gap-1">
                <span className="material-symbols-outlined text-lg">account_circle</span>
                <span className="hidden sm:inline">マイページ</span>
              </Link>
            ) : (
              <Link href="/login" className="text-sm font-medium hover:text-gray-600 transition">Login</Link>
            )}
          </div>
        </div>
      </header>

      {/* トップページの主導線：背景 + 「さがす」「つくる」の円だけの1画面 */}
      <TopStage />

      {/* Footer */}
      <footer className="bg-gray-50 pt-16 pb-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
            <div>
              <Link href="/" className="flex items-baseline gap-2 mb-6">
                <span className="text-2xl font-serif font-bold tracking-wider">傑作</span>
                <span className="text-xs text-gray-500 font-medium tracking-widest">Kessaku</span>
              </Link>
              <p className="text-sm text-gray-600 leading-relaxed">
                あなたの戯曲が、誰かの舞台になる。<br />
                中高大演劇部のための台本投稿プラットフォーム。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <ul className="space-y-4 text-gray-600">
                  <li><Link href="#" className="hover:text-black transition">サービス</Link></li>
                  <li><Link href="/search" className="hover:text-black transition">台本を探す</Link></li>
                  <li><Link href="/post" className="hover:text-black transition">台本を投稿する</Link></li>
                  <li><Link href="#" className="hover:text-black transition">使い方ガイド</Link></li>
                </ul>
              </div>
              <div>
                <ul className="space-y-4 text-gray-600">
                  <li><a href="#" className="hover:text-black transition">サポート</a></li>
                  <li><a href="#" className="hover:text-black transition">ヘルプセンター</a></li>
                  <li><a href="#" className="hover:text-black transition">お問い合わせ</a></li>
                  <li><a href="#" className="hover:text-black transition">利用規約</a></li>
                  <li><a href="#" className="hover:text-black transition">プライバシーポリシー</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center border-t border-gray-200 pt-8 text-xs text-gray-500">
            <p>&copy; 2024 傑作 (Kessaku). All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-black transition">Twitter</a>
              <a href="#" className="hover:text-black transition">Instagram</a>
              <a href="#" className="hover:text-black transition">Note</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}