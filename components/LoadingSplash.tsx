"use client";

import React, { useEffect, useState } from 'react';

// サイト初回アクセス時、データ読み込みが終わるまで（スマホでのみ）表示する
// ローディング画面。GIFは画質が粗いため、無理に画面いっぱいに拡大せず、
// 一回り小さいサイズで中央に表示し、周囲は黒背景で覆う。
//
// isVisible が false になったら、すぐにDOMから消すのではなくopacityを下げて
// ふわっとフェードアウトさせ、transitionが終わったあとで実際に非表示にする。
//
// また、GIFはブラウザによって再生位置がキャッシュされ、毎回頭から再生されない
// ことがあるため、表示するたびに一意なクエリパラメータを付けて「新しい画像」
// として読み込ませ、必ず最初のフレームから再生されるようにする。
export default function LoadingSplash({ isVisible }: { isVisible: boolean }) {
  const [mounted, setMounted] = useState(true);
  const [opacity, setOpacity] = useState(1);
  const [gifSrc] = useState(() => `/loading-logo.gif?t=${Date.now()}`);

  useEffect(() => {
    if (!isVisible) {
      setOpacity(0);
      const timer = setTimeout(() => setMounted(false), 500); // フェード時間と合わせる
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center md:hidden"
      style={{ opacity, transition: 'opacity 0.5s ease-out' }}
    >
      <img
        src={gifSrc}
        alt="読み込み中"
        className="w-[70%] max-w-xs object-contain"
      />
    </div>
  );
}