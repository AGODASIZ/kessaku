"use client";

import React, { useEffect, useRef, useState } from 'react';

type HeroImage = { id: number; image_url: string };

// 本のページをめくるような3D回転で画像を切り替えるスライドショー。
//
// シンプルな2層構造で実現する：
// - 背面レイヤー：常に「次に見える画像」を、回転なしでそのまま表示しておく
// - 前面レイヤー：「今見えている画像（めくられる側のページ）」を表示し、
//                 これだけが rotateY で回転して、左端を軸にめくれて消えていく
//
// ドラッグ中はこの前面レイヤーの回転角度を指の動きに直接連動させ、
// 指を離した時点で「めくり切る」か「戻す」かをアニメーションで決める。
// 自動切り替えタイマーも、同じ「前面レイヤーを回転させる」処理を呼ぶだけなので、
// ドラッグでも自動でも完全に同じ見た目の動きになる。
export default function PageFlipSlideshow({
  images,
  currentSlide,
  onDotClick,
}: {
  images: HeroImage[];
  currentSlide: number;
  onDotClick: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 前面ページ（今めくられている最中のページ）が表示している画像のインデックス。
  // めくり終わるまでは古い画像を表示し続け、めくり終わった瞬間に次の画像に切り替える。
  const [frontIndex, setFrontIndex] = useState(currentSlide);
  const [flipAngle, setFlipAngle] = useState(0); // 0(正面) 〜 -180(めくり切った状態)
  const [withTransition, setWithTransition] = useState(false);

  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const widthRef = useRef(1);
  const isAnimatingRef = useRef(false);

  // 親(currentSlide)の変化を監視し、まだ前面に表示中の画像と異なっていたら
  // 自動でめくりアニメーションを開始する（ドラッグでの切り替え時はfrontIndexが
  // 既にcurrentSlideと同期しているため、ここでは反応しない）
  useEffect(() => {
    if (frontIndex !== currentSlide && !isAnimatingRef.current) {
      startFlip();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide]);

  if (images.length === 0) return null;

  const goNext = () => onDotClick((currentSlide + 1) % images.length);
  const goPrev = () => onDotClick((currentSlide - 1 + images.length) % images.length);

  // 前面ページを 0 → -180 まで滑らかに回転させ、終わったら裏の画像に切り替える
  const startFlip = () => {
    isAnimatingRef.current = true;
    setWithTransition(true);
    // 1フレーム後にセットすることで、確実にtransitionが効くようにする
    requestAnimationFrame(() => setFlipAngle(-180));
  };

  const handleFlipEnd = () => {
    if (!isAnimatingRef.current) return;
    isAnimatingRef.current = false;
    setWithTransition(false);
    setFlipAngle(0);
    setFrontIndex(currentSlide); // 背面に隠れていた次の画像が、今度は新しい前面ページになる
  };

  // ドラッグ操作
  const handleDragStart = (clientX: number) => {
    if (images.length <= 1 || isAnimatingRef.current) return;
    isDraggingRef.current = true;
    dragStartXRef.current = clientX;
    widthRef.current = containerRef.current?.offsetWidth || 1;
    setWithTransition(false);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDraggingRef.current) return;
    const deltaX = clientX - dragStartXRef.current;
    const ratio = Math.min(0, Math.max(-1, deltaX / widthRef.current));
    setFlipAngle(ratio * 180);
  };

  const handleDragEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (flipAngle < -54) {
      // めくり切る：先に親のcurrentSlideを進める。
      // すると上のuseEffectが「frontIndexとcurrentSlideが食い違っている」と検知し、
      // 自動切り替えと全く同じ経路でアニメーションを完了させてくれる。
      // ただし今は既に途中の角度(flipAngle)から始まっているため、ここでは
      // withTransitionだけ有効にして、現在の角度から-180へ滑らかに繋げる。
      setWithTransition(true);
      isAnimatingRef.current = true;
      requestAnimationFrame(() => setFlipAngle(-180));
      onDotClick((currentSlide + 1) % images.length);
    } else {
      // 戻す
      setWithTransition(true);
      setFlipAngle(0);
    }
  };

  const backIndex = (frontIndex + 1) % images.length;

  return (
    <div
      ref={containerRef}
      className="w-[70%] max-w-3xl mb-10 md:mb-14 rounded-lg relative aspect-[3/2] select-none touch-pan-y"
      style={{ perspective: '1800px', cursor: images.length > 1 ? 'grab' : 'default' }}
      onMouseDown={(e) => handleDragStart(e.clientX)}
      onMouseMove={(e) => handleDragMove(e.clientX)}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
      onTouchEnd={handleDragEnd}
    >
      {/* 背面レイヤー：次に見える画像を、常にそのまま固定表示しておく */}
      <div className="absolute inset-0 rounded-lg overflow-hidden" style={{ zIndex: 10, boxShadow: 'none' }}>
        <img
          src={images[backIndex].image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      </div>

      {/* 前面レイヤー：めくられる側のページ。これだけが回転し、180度回転すると
          backfaceVisibility:hidden により自動的に裏側が見えなくなり、
          背面レイヤー（次の画像）の後ろに完全に隠れる */}
      <div
        className="absolute inset-0 rounded-lg overflow-hidden"
        style={{
          zIndex: 20,
          transformStyle: 'preserve-3d',
          transformOrigin: 'left center',
          transform: `rotateY(${flipAngle}deg)`,
          transition: withTransition ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        }}
        onTransitionEnd={handleFlipEnd}
      >
        <img
          src={images[frontIndex].image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ backfaceVisibility: 'hidden' }}
          draggable={false}
        />
      </div>

      {/* 左右の矢印 */}
      {images.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-40 bg-white/70 hover:bg-white text-gray-700 rounded-full w-8 h-8 flex items-center justify-center transition"
            aria-label="前の画像"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-40 bg-white/70 hover:bg-white text-gray-700 rounded-full w-8 h-8 flex items-center justify-center transition"
            aria-label="次の画像"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </>
      )}

      {/* ドットインジケーター */}
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