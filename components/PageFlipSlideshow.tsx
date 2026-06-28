"use client";

import React, { useEffect, useRef, useState } from 'react';

type HeroImage = { id: number; image_url: string };

// 本のページをめくるような3D回転で画像を切り替えるスライドショー。
// - 自動切り替え（親から渡される currentSlide の変化）でも、
// - 指でのドラッグ／マウスドラッグでも、両方でページがめくれる。
//
// 仕組み：
// - 全ページを同じ場所に重ねて配置する（z-indexで現在の順番を表現）
// - 自動切り替え時：直前のページに rotateY(0→-150deg) を一度だけ再生
// - ドラッグ時：指の移動量に応じて、その場でリアルタイムに rotateY の角度を変える
//   （めくっている途中の状態を指の動きにそのまま追従させる）
// - 指を離した時点で、ある程度めくれていれば「めくり切る」、そうでなければ「戻す」
export default function PageFlipSlideshow({
  images,
  currentSlide,
  onDotClick,
}: {
  images: HeroImage[];
  currentSlide: number;
  onDotClick: (index: number) => void;
}) {
  const [flippingIndex, setFlippingIndex] = useState<number | null>(null);
  const prevSlideRef = useRef(currentSlide);

  // ドラッグ操作の状態
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragAngle, setDragAngle] = useState(0); // 現在ドラッグで動いている角度（0〜-180）
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const widthRef = useRef(1);

  // 親から渡された currentSlide が変わったとき（自動切り替え or ドット操作）に
  // 「直前のページ」をめくるアニメーションを再生する
  useEffect(() => {
    const prev = prevSlideRef.current;
    if (prev !== currentSlide) {
      setFlippingIndex(prev);
      const timer = setTimeout(() => setFlippingIndex(null), 1000);
      prevSlideRef.current = currentSlide;
      return () => clearTimeout(timer);
    }
  }, [currentSlide]);

  if (images.length === 0) return null;

  const goToNext = () => onDotClick((currentSlide + 1) % images.length);
  const goToPrev = () => onDotClick((currentSlide - 1 + images.length) % images.length);

  // --- ドラッグ操作のハンドラ ---
  const handleDragStart = (clientX: number) => {
    if (images.length <= 1) return;
    isDraggingRef.current = true;
    dragStartXRef.current = clientX;
    widthRef.current = containerRef.current?.offsetWidth || 1;
  };

  const handleDragMove = (clientX: number) => {
    if (!isDraggingRef.current) return;
    const deltaX = clientX - dragStartXRef.current;
    // 左にドラッグ(deltaXが負)した分だけページがめくれていく。右方向の引っかけは無視（0でクランプ）
    const ratio = Math.min(0, Math.max(-1, deltaX / widthRef.current));
    setDragAngle(ratio * 180);
  };

  const handleDragEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    // 30%以上めくれていたら「めくり切る」、そうでなければ「戻す」
    if (dragAngle < -54) {
      // めくり切る：通常の自動切り替えと同じ処理に乗せる
      setDragAngle(0);
      goToNext();
    } else {
      // 戻す：アニメーションで元の位置に戻す
      setDragAngle(0);
    }
  };

  const isDraggingNow = dragAngle !== 0;

  return (
    <div
      ref={containerRef}
      className="w-full max-w-3xl mb-10 md:mb-14 rounded-lg shadow-sm relative aspect-[3/2] select-none touch-pan-y"
      style={{ perspective: '1800px', cursor: images.length > 1 ? 'grab' : 'default' }}
      onMouseDown={(e) => handleDragStart(e.clientX)}
      onMouseMove={(e) => handleDragMove(e.clientX)}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
      onTouchEnd={handleDragEnd}
    >
      {images.map((img, idx) => {
        const isCurrent = idx === currentSlide;
        const isFlipping = idx === flippingIndex;

        const zIndex = isFlipping || (isCurrent && isDraggingNow) ? 30 : isCurrent ? 20 : 10;

        // 現在のページをドラッグ中はその角度を直接反映、自動めくり中は固定アニメーション
        let transform = 'rotateY(0deg)';
        let transition = 'none';
        if (isFlipping) {
          transform = 'rotateY(-150deg)';
          transition = 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)';
        } else if (isCurrent && isDraggingNow) {
          transform = `rotateY(${dragAngle}deg)`;
          transition = isDraggingRef.current ? 'none' : 'transform 0.4s ease-out';
        }

        return (
          <div
            key={img.id}
            className="absolute inset-0 rounded-lg overflow-hidden"
            style={{
              zIndex,
              transformStyle: 'preserve-3d',
              transformOrigin: 'left center', // 本の綴じ目(左端)を軸にめくれる
              transform,
              transition,
              boxShadow: isFlipping || isCurrent ? '0 8px 24px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            <img
              src={img.image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ backfaceVisibility: 'hidden' }}
              draggable={false}
            />
            {(isFlipping || (isCurrent && isDraggingNow)) && (
              <div
                className="absolute inset-0 bg-black/20"
                style={{ backfaceVisibility: 'hidden' }}
              />
            )}
          </div>
        );
      })}

      {/* 左右の矢印（PCでもクリックでめくれるように） */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-40 bg-white/70 hover:bg-white text-gray-700 rounded-full w-8 h-8 flex items-center justify-center transition"
            aria-label="前の画像"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-40 bg-white/70 hover:bg-white text-gray-700 rounded-full w-8 h-8 flex items-center justify-center transition"
            aria-label="次の画像"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </>
      )}

      {/* スライドのドットインジケーター */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-40">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => onDotClick(idx)}
              className={`w-2 h-2 rounded-full transition ${
                idx === currentSlide ? 'bg-white' : 'bg-white/40'
              }`}
              aria-label={`スライド${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}