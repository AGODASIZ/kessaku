"use client";

import React from 'react';
import Link from 'next/link';

type Banner = { id: number; image_url: string; link_url: string | null };

// トップページ上部に表示する、3:1比率の横長バナーを3枚並べる「お知らせ」エリア。
// 内部パス（"/"始まり）なら同じタブ内で遷移、外部URLなら新しいタブで開く。
export default function AnnouncementBanners({ banners }: { banners: Banner[] }) {
  if (banners.length === 0) return null;

  return (
    <div className="w-full max-w-3xl mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
      {banners.map((banner) => {
        const content = (
          <img
            src={banner.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        );

        const isInternal = banner.link_url?.startsWith('/');

        if (!banner.link_url) {
          return (
            <div key={banner.id} className="aspect-[3/1] rounded-md overflow-hidden bg-gray-100">
              {content}
            </div>
          );
        }

        if (isInternal) {
          return (
            <Link
              key={banner.id}
              href={banner.link_url}
              className="aspect-[3/1] rounded-md overflow-hidden bg-gray-100 block hover:opacity-90 transition"
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
            className="aspect-[3/1] rounded-md overflow-hidden bg-gray-100 block hover:opacity-90 transition"
          >
            {content}
          </a>
        );
      })}
    </div>
  );
}