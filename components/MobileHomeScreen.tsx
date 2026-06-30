"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AnnouncementBanners from './AnnouncementBanners';

// スマホ版トップページ専用の「ホーム画面」。
// ゲームのタイトル画面のような、スクロールしない1枚絵の構成。
// 背景(back.jpg)を画面全体に固定表示し、その上にロゴ(logo.png)をフェードインさせる。
// 「台本を探す」「投稿する」ボタンは現時点ではテキストボタン（後で画像に差し替え予定）。
export default function MobileHomeScreen({
  banners,
}: {
  banners: { id: number; image_url: string; link_url: string | null }[];
}) {
  const [logoVisible, setLogoVisible] = useState(false);

  useEffect(() => {
    // マウント直後だと transition が効かないことがあるため、1フレーム後にtrueにする
    const timer = setTimeout(() => setLogoVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 md:hidden overflow-hidden z-30">
      {/* 背景画像（9:16固定。画面全体をカバーする） */}
      <img
        src="/back.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* 中央のロゴ（フェードイン） */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
        <img
          src="/logo.png"
          alt="傑作 Kessaku"
          className="w-[110%] max-w-xs object-contain"
          style={{
            opacity: logoVisible ? 1 : 0,
            transition: 'opacity 1.2s ease-out',
          }}
        />

        {/* ボタン（仮のテキスト表示。後で画像ボタンに差し替え予定） */}
        <div
          className="flex items-center gap-4 mt-10"
          style={{
            opacity: logoVisible ? 1 : 0,
            transition: 'opacity 1.2s ease-out 0.3s', // ロゴより少し遅れてフェードイン
          }}
        >
          <Link
            href="/search"
            className="bg-black text-white px-6 py-3 rounded-md font-medium text-sm flex items-center gap-2"
          >
            台本を探す
          </Link>
          <Link
            href="/post"
            className="bg-white/90 text-gray-800 px-6 py-3 rounded-md font-medium text-sm"
          >
            投稿する
          </Link>
        </div>
      </div>

      {/* お知らせバナー（画面上部、ヘッダーの下に配置） */}
      <div
        className="absolute top-20 left-0 right-0 px-4 flex justify-center"
        style={{
          opacity: logoVisible ? 1 : 0,
          transition: 'opacity 1.2s ease-out 0.5s',
        }}
      >
        <AnnouncementBanners banners={banners} />
      </div>
    </div>
  );
}