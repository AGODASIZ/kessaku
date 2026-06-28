"use client";

import React from 'react';
import Link from 'next/link';

type Banner = { id: number; image_url: string; link_url: string | null };

// トップページ上部に表示する、3:1比率の横長バナーを横一列に並べる「お知らせ」エリア。
// 画面幅に収まらない分は横スクロールで見られるようにする（スマホでもPCでも常に横並び）。
// 内部パス（"/"始まり）なら同じタブ内で遷移、外部URLなら新しいタブで開く。
export default function AnnouncementBanners({ banners }: { banners: Banner[] }) {
  if (banners.length === 0) return null;

  return (
    <div className="w-full max-w-xl mb-6 flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-1 px-1">
      {banners.map((banner) => {
        const content = (
          <img
            src={banner.image_url}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        );

        const isInternal = banner.link_url?.startsWith('/');
        // 1枚ずつのサイズ：スマホでは画面の60%程度を1枚分の幅にして、隣がちらっと見える
        // ことでスクロールできることが伝わるようにする。PCでは3枚並んでも余裕がある幅に。
        const sizeClass = 'w-[60%] sm:w-[31%] flex-shrink-0 snap-start';

        if (!banner.link_url) {
          return (
            <div key={banner.id} className={`${sizeClass} aspect-[3/1] rounded-md overflow-hidden bg-gray-100`}>
              {content}
            </div>
          );
        }

        if (isInternal) {
          return (
            <Link
              key={banner.id}
              href={banner.link_url}
              className={`${sizeClass} aspect-[3/1] rounded-md overflow-hidden bg-gray-100 block hover:opacity-90 transition`}
            >
              {content}
            </Link>
          );
        }

        return (
          <a
            key={banner.id}
            href={banner.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${sizeClass} aspect-[3/1] rounded-md overflow-hidden bg-gray-100 block hover:opacity-90 transition`}
          >
            {content}
          </a>
        );
      })}
    </div>
  );
}