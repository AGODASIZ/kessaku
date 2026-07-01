"use client";

import React from 'react';

// スマホ表示限定で、画面全体に常時かぶせるテクスチャ画像（19.5:9比率）。
// クリックやタップの操作を妨げないよう pointer-events-none にしている。
// トップページ・検索ページ・台本詳細ページなど、指定したページにだけ
// このコンポーネントを呼び出すことで適用する。
export default function TextureOverlay() {
  return (
    <div className="fixed inset-0 z-[150] pointer-events-none md:hidden">
      <img
        src="/texture.png"
        alt=""
        className="w-full h-full object-cover"
      />
    </div>
  );
}