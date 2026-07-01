"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// 「さがす」「つくる」ページの中で使う、円形アイコンリンク。
// 白い丸の中にページのテーマカラーのアイコンを表示し、トップページの円と同じく
// 押さえたまま引っ張ると広がる操作で遷移する（広がる色は常に白＝floodColor固定）。
export default function SwipeIconLink({
  icon,
  label,
  route,
  accent,
}: {
  icon: string; // Material Symbols のアイコン名
  label: string;
  route: string;
  accent: string; // アイコンの色（ページのテーマカラー）
}) {
  const router = useRouter();
  const dragRef = useRef<{ pointerId: number; cx: number; cy: number; committed: boolean } | null>(null);
  const floodRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    router.prefetch(route);
  }, [router, route]);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId || d.committed) return;
      const dx = e.clientX - d.cx;
      const dy = e.clientY - d.cy;
      const dist = Math.hypot(dx, dy);
      const flood = floodRef.current;
      if (flood) {
        flood.style.width = `${dist * 2}px`;
        flood.style.height = `${dist * 2}px`;
      }
      const diagonal = Math.hypot(window.innerWidth, window.innerHeight);
      if (dist >= diagonal * 0.2) commit(d);
    }

    function onUp(e: PointerEvent) {
      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      if (!d.committed) release(d);
    }

    function release(d: NonNullable<typeof dragRef.current>) {
      const flood = floodRef.current;
      if (flood) {
        flood.style.transition = "width .32s cubic-bezier(.4,0,.2,1), height .32s cubic-bezier(.4,0,.2,1)";
        flood.style.width = "0px";
        flood.style.height = "0px";
        setTimeout(() => flood.remove(), 340);
      }
      setActive(false);
      dragRef.current = null;
      floodRef.current = null;
    }

    function commit(d: NonNullable<typeof dragRef.current>) {
      d.committed = true;
      const flood = floodRef.current;
      const corners: [number, number][] = [
        [0, 0],
        [window.innerWidth, 0],
        [0, window.innerHeight],
        [window.innerWidth, window.innerHeight],
      ];
      const maxRadius = Math.max(...corners.map(([x, y]) => Math.hypot(x - d.cx, y - d.cy)));
      const coverDiameter = maxRadius * 2 * 1.08;
      if (flood) {
        flood.style.transition = "width .5s cubic-bezier(.2,.8,.2,1), height .5s cubic-bezier(.2,.8,.2,1)";
        flood.style.width = `${coverDiameter}px`;
        flood.style.height = `${coverDiameter}px`;
      }
      setTimeout(() => {
        router.push(route);
        setTimeout(() => {
          if (flood) {
            flood.style.transition = "opacity .5s ease";
            flood.style.opacity = "0";
            setTimeout(() => flood.remove(), 520);
          }
        }, 350);
      }, 620);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [router, route]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const flood = document.createElement("div");
    flood.style.position = "fixed";
    flood.style.left = `${cx}px`;
    flood.style.top = `${cy}px`;
    flood.style.width = "0px";
    flood.style.height = "0px";
    flood.style.borderRadius = "50%";
    flood.style.transform = "translate(-50%, -50%)";
    flood.style.background = "#FFFFFF";
    flood.style.pointerEvents = "none";
    flood.style.zIndex = "60";
    document.body.appendChild(flood);
    floodRef.current = flood;

    dragRef.current = { pointerId: e.pointerId, cx, cy, committed: false };
    setActive(true);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        onPointerDown={handlePointerDown}
        data-active={active}
        className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white flex items-center justify-center cursor-grab touch-none"
      >
        <span className="material-symbols-outlined text-3xl md:text-4xl" style={{ color: accent }}>
          {icon}
        </span>
      </div>
      <span className="text-[11px] tracking-[0.2em] font-normal text-white" style={{ textIndent: "0.2em" }}>
        {label}
      </span>
    </div>
  );
}
