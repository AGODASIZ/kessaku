"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase'; // パスが違う場合は修正してください
import { getLicenseBadge } from '../lib/licenseUtils';

export default function HomePage() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null); // ログインユーザー情報を保持

  // ヒーロー画像スライドショー関連
  const [heroImages, setHeroImages] = useState<{ id: number; image_url: string }[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // 画面が開いた瞬間にSupabaseから公開済みの台本とユーザー情報を自動取得
  useEffect(() => {
    async function initialize() {
      // 1. ログイン状態の確認
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // 2. 公開されている台本を取得
      const { data, error } = await supabase
        .from('scripts')
        .select('*')
        .eq('status', 'published')
        .order('id', { ascending: false });

      if (!error && data) {
        setScripts(data);
      }

      // 3. トップページのヒーロー画像（スライドショー用）を取得
      const { data: images } = await supabase
        .from('hero_images')
        .select('id, image_url')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      setHeroImages(images || []);

      setLoading(false);
    }
    initialize();
  }, []);

  // ヒーロー画像を数秒ごとに自動で切り替える
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000); // 5秒ごとに切り替え
    return () => clearInterval(timer);
  }, [heroImages]);

  // 検索キーワードに一致する台本をフィルタリング（リアルタイム連動）
  const filteredScripts = scripts.filter(script => 
    script.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    script.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="text-gray-900 bg-white font-sans antialiased">

      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-baseline gap-1.5 md:gap-2">
            <span className="text-xl md:text-2xl font-serif font-bold tracking-wider">傑作</span>
            <span className="text-[10px] md:text-xs text-gray-500 font-medium tracking-widest">Kessaku</span>
          </Link>

          {/* 検索バー（自動連動） */}
          <div className="hidden md:flex items-center bg-gray-100 rounded-md px-4 py-2 w-96">
            <span className="material-symbols-outlined text-gray-400 mr-2">search</span>
            <input 
              type="text" 
              placeholder="台本のタイトルや作者名で検索..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm text-gray-700 placeholder-gray-400" 
            />
          </div>

          {/* Nav Actions */}
          <div className="flex items-center gap-3 md:gap-6">
            {/* ★ ログイン状態によって表示を切り替え */}
            {user ? (
              <Link href="/mypage" className="text-sm font-medium text-gray-700 hover:text-black transition flex items-center gap-1">
                <span className="material-symbols-outlined text-lg">account_circle</span>
                <span className="hidden sm:inline">マイページ</span>
              </Link>
            ) : (
              <Link href="/login" className="text-sm font-medium hover:text-gray-600 transition">Login</Link>
            )}
            <Link href="/post" className="bg-black text-white text-xs md:text-sm font-medium px-3 py-2 md:px-5 md:py-2.5 rounded-md hover:bg-gray-800 transition whitespace-nowrap">
              <span className="sm:hidden">投稿</span>
              <span className="hidden sm:inline">Post Script</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-16 md:py-32 flex flex-col items-center text-center px-6">

          {/* ヒーロー画像スライドショー（管理者が登録した画像がある場合のみ表示） */}
          {heroImages.length > 0 && (
            <div className="w-full max-w-3xl mb-10 md:mb-14 rounded-lg overflow-hidden shadow-sm relative aspect-[3/2]">
              {heroImages.map((img, idx) => (
                <img
                  key={img.id}
                  src={img.image_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
                  style={{ opacity: idx === currentSlide ? 1 : 0 }}
                />
              ))}
              {/* スライドのドットインジケーター */}
              {heroImages.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {heroImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`w-2 h-2 rounded-full transition ${
                        idx === currentSlide ? 'bg-white' : 'bg-white/40'
                      }`}
                      aria-label={`スライド${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl md:text-6xl font-serif font-bold leading-tight tracking-wide mb-6 md:mb-8">
            あなたの作品が<br />誰かの舞台になる
          </h1>
          <p className="text-gray-600 text-sm sm:text-base md:text-xl mb-8 md:mb-10 leading-relaxed">
            演劇を作る人のための台本投稿プラットフォーム。<br />
            あなたの作品を、全国の舞台へ届けよう。
          </p>
          
          <div className="flex items-center gap-4 md:gap-6 mb-16 md:mb-24">
            <Link href="/search" className="bg-black text-white px-5 py-3 md:px-8 md:py-4 rounded-md font-medium text-sm md:text-base flex items-center gap-2 hover:bg-gray-800 transition">
              台本を探す <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
            <Link href="/post" className="text-gray-700 font-medium text-sm md:text-base px-5 py-3 md:px-8 md:py-4 hover:text-black transition">
              投稿する
            </Link>
          </div>

          {/* Stats */}
          <div className="flex justify-center items-center gap-4 sm:gap-8 md:gap-12 text-center border-t border-gray-100 pt-10 md:pt-12 w-full max-w-3xl">
            <div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-serif mb-1">1,200+</div>
              <div className="text-xs sm:text-sm text-gray-500">台本数</div>
            </div>
            <div className="w-px h-10 md:h-12 bg-gray-200"></div>
            <div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-serif mb-1">3,500+</div>
              <div className="text-xs sm:text-sm text-gray-500">登録作家</div>
            </div>
            <div className="w-px h-10 md:h-12 bg-gray-200"></div>
            <div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-serif mb-1">850+</div>
              <div className="text-xs sm:text-sm text-gray-500">上演実績</div>
            </div>
          </div>
        </section>

        {/* New Scripts Section (データベース連動) */}
        <section className="py-16 bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-end mb-8">
              <div>
                <p className="text-xs font-bold tracking-widest text-gray-400 mb-2">NEW SCRIPTS</p>
                <h2 className="text-3xl font-serif">
                  {searchQuery ? `「${searchQuery}」の検索結果` : '新着の台本'}
                </h2>
              </div>
              <Link href="/search" className="text-sm font-medium flex items-center gap-1 hover:text-gray-600 transition">
                すべて見る <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <div className="text-gray-400 py-12">台本データを読み込み中...</div>
              ) : filteredScripts.length === 0 ? (
                <div className="text-gray-400 py-12">該当する台本が見つかりませんでした。</div>
              ) : (
                filteredScripts.map((script) => {
                  const badge = getLicenseBadge(script);
                  return (
                    <Link
                      href={`/script?id=${script.id}`}
                      key={script.id}
                      className="bg-white rounded-lg border border-gray-200 p-6 relative hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="absolute -top-3 right-4 bg-black text-white text-[10px] font-bold px-2 py-1 rounded tracking-wider">NEW</div>
                        <h3 className="text-lg font-serif font-bold mb-2">{script.title}</h3>
                        <p className="text-sm text-gray-600 mb-4">{script.author}</p>
                        {/* 本文プレビュー */}
                        <div 
                          className="text-xs text-gray-400 line-clamp-3 mb-4 font-serif leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: script.body }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span> {script.time || '未設定'}</span>
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">group</span> {script.cast || '未設定'}</span>
                        </div>
                        <div className={`text-xs font-medium flex items-center gap-1 ${badge.color}`}>
                          <span className="material-symbols-outlined text-sm">{badge.icon}</span> {badge.label}
                        </div>
                      </div>
                    </Link>
                  );
                })

              )}
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-gray-50 pt-16 pb-8 border-t border-gray-200 mt-12">
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