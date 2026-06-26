"use client";

import React, { useRef, useEffect, useCallback } from 'react';

// スマホで指でスクロールして数字を選べる「ドラム式」ピッカー。
// CSSのscroll-snapを使い、慣性スクロール＋スナップをブラウザ標準機能で実現する。
// 重いJSライブラリは使わず、scroll イベントを見て最も中央に近い項目を選択値とする。

const ITEM_HEIGHT = 36; // 1項目あたりの高さ(px)
const VISIBLE_COUNT = 3; // 表示する項目数（奇数推奨。中央が選択中の値）

export default function DrumNumberPicker({
  value,
  onChange,
  min = 0,
  max = 20,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const containerHeight = ITEM_HEIGHT * VISIBLE_COUNT;
  const paddingY = ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2);

  // 外部の value が変わったら（編集データ読み込み時など）、該当位置までスクロールする
  useEffect(() => {
    if (!scrollRef.current) return;
    const index = value - min;
    scrollRef.current.scrollTop = index * ITEM_HEIGHT;
  }, [value, min]);

  // スクロールが止まったタイミングで、中央に最も近い項目を選択値として確定する
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      if (!scrollRef.current) return;
      const index = Math.round(scrollRef.current.scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(numbers.length - 1, index));
      const newValue = numbers[clampedIndex];
      // スナップ位置を正確に合わせる
      scrollRef.current.scrollTo({ top: clampedIndex * ITEM_HEIGHT, behavior: 'smooth' });
      if (newValue !== value) onChange(newValue);
    }, 120);
  }, [numbers, value, onChange]);

  return (
    <div className="flex flex-col items-center">
      {label && <span className="text-xs font-bold text-gray-500 mb-2">{label}</span>}
      <div
        className="relative bg-gray-50 border border-gray-200 rounded-md overflow-hidden select-none"
        style={{ height: containerHeight, width: '80px' }}
      >
        {/* 中央の選択枠（視覚的ガイド） */}
        <div
          className="absolute left-0 right-0 border-y-2 border-black/70 pointer-events-none z-10"
          style={{ top: paddingY, height: ITEM_HEIGHT }}
        />
        {/* 上下のフェード（グラデーション）で奥行き感を出す */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-gray-50 to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-gray-50 to-transparent z-10 pointer-events-none" />

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-y-scroll h-full scrollbar-hide"
          style={{
            scrollSnapType: 'y mandatory',
            paddingTop: paddingY,
            paddingBottom: paddingY,
          }}
        >
          {numbers.map((n) => (
            <div
              key={n}
              onClick={() => {
                onChange(n);
                if (scrollRef.current) {
                  scrollRef.current.scrollTo({ top: (n - min) * ITEM_HEIGHT, behavior: 'smooth' });
                }
              }}
              className={`flex items-center justify-center font-bold cursor-pointer transition-colors ${
                n === value ? 'text-black text-lg' : 'text-gray-300 text-sm'
              }`}
              style={{ height: ITEM_HEIGHT, scrollSnapAlign: 'center' }}
            >
              {n}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}