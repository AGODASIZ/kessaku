"use client";

import React from 'react';

// サイト初回アクセス時、データ読み込みが終わるまで（スマホでのみ）表示する
// ローディング画面。GIFは画質が粗いため、無理に画面いっぱいに拡大せず、
// 一回り小さいサイズで中央に表示し、周囲は黒背景で覆う。
export default function LoadingSplash() {
  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center md:hidden">
      <img
        src="/loading-logo.gif"
        alt="読み込み中"
        className="w-[70%] max-w-xs object-contain"
      />
    </div>
  );
}