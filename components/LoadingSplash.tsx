"use client";

import React, { useEffect, useRef, useState } from 'react';

// サイト初回アクセス時、データ読み込みが終わるまで（スマホでのみ）表示する
// ローディング画面。動画(mp4)は再生位置を currentTime = 0 で明示的にリセットできるため、
// GIFと違って毎回確実に頭から再生される。
//
// 低電力モードなどで自動再生がブロックされ、再生ボタン(▶)だけが表示されてしまう
// 環境では、動画自体を完全に非表示にし、黒背景に「読み込み中…」の文字だけを表示する。
//
// isVisible が false になったら、すぐにDOMから消すのではなくopacityを下げて
// ふわっとフェードアウトさせ、transitionが終わったあとで実際に非表示にする。

const LOADING_TEXT = 'l o a d i n g …';

export default function LoadingSplash({ isVisible }: { isVisible: boolean }) {
  const [mounted, setMounted] = useState(true);
  const [opacity, setOpacity] = useState(1);
  const [videoPlayable, setVideoPlayable] = useState(true); // 自動再生に失敗したらfalseにする
  const videoRef = useRef<HTMLVideoElement>(null);

  // 表示されるたびに、確実に動画の先頭から再生し直す。
  // play() が失敗した場合（低電力モード等で自動再生がブロックされた場合）は
  // 動画自体を非表示にし、テキストだけのシンプルな画面に切り替える。
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current
        .play()
        .catch(() => {
          setVideoPlayable(false);
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
      {/* 文字を1文字ずつ上下に揺らして波打たせるアニメーション */}
      <style>{`
        @keyframes loadingWave {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
      `}</style>

      {/* 「読み込み中…」文言。画面の高さの1/3あたり（中央より上）に配置し、
          中央にあるロゴ動画と重ならないようにする */}
      <p
        className="absolute left-0 right-0 text-center text-gray-500 text-xs tracking-widest"
        style={{ top: '40%' }}
      >
        {LOADING_TEXT.split('').map((char, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              animation: 'loadingWave 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.1}s`,
            }}
          >
            {char}
          </span>
        ))}
      </p>

      {/* 動画が再生できる場合だけロゴ動画を表示。再生できない場合（低電力モード等）は
          何も表示しない（黒背景＋上の「読み込み中…」文言だけになる） */}
      {videoPlayable && (
        <video
          ref={videoRef}
          src="/loading-logo.mp4"
          autoPlay
          muted
          playsInline
          className="w-[70%] max-w-xs object-contain"
        />
      )}
    </div>
  );
}