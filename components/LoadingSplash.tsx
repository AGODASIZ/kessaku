"use client";

import React, { useEffect, useRef, useState } from 'react';

// サイト初回アクセス時、データ読み込みが終わるまで（スマホでのみ）表示する
// ローディング画面。動画(mp4)は再生位置を currentTime = 0 で明示的にリセットできるため、
// GIFと違って毎回確実に頭から再生される。
//
// isVisible が false になったら、すぐにDOMから消すのではなくopacityを下げて
// ふわっとフェードアウトさせ、transitionが終わったあとで実際に非表示にする。
export default function LoadingSplash({ isVisible }: { isVisible: boolean }) {
  const [mounted, setMounted] = useState(true);
  const [opacity, setOpacity] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 表示されるたびに、確実に動画の先頭から再生し直す
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // 自動再生がブロックされた場合は何もしない（ユーザー操作後に再生されることがある）
      });
    }
  }, []);

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
      <video
        ref={videoRef}
        src="/loading-logo.mp4"
        autoPlay
        muted
        playsInline
        className="w-[70%] max-w-xs object-contain"
      />
    </div>
  );
}