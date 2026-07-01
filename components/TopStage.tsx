"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// トップページの新しいメイン導線。
// 背景画像（スマホ: back_mob.png / PC: back_pc.png）の上に、
// 「さがす（#FFAAAD）」「つくる（#C3D7D9）」の2つの円だけを配置する。
//
// タップではなく、円を押さえたまま指を離さずに動かすと、動かした距離ぶんだけ
// 円が広がっていく。画面の対角線の約6割まで広げると確定（コミット）し、
// その色が画面全体に広がりきったところで、その色をテーマにした遷移先
// （さがす→/search、つくる→/post）へ移動する。
//
// フラッド（広がる色の円）は React ツリーの外（document.body直下）に生成する。
// こうすることで、Next.jsのクライアント遷移でページ本体が入れ替わった後も
// フラッドがそのまま画面に残り、遷移先の背景色へ自然にクロスフェードできる。

type OrbKey = "search" | "post";

const ORB: Record<OrbKey, { fill: string; ink: string; label: string; route: string }> = {
  search: { fill: "#FFAAAD", ink: "#5C2224", label: "さがす", route: "/search" },
  post: { fill: "#C3D7D9", ink: "#1F3A3D", label: "つくる", route: "/post" },
};

type DragState = {
  pointerId: number;
  key: OrbKey;
  cx: number;
  cy: number;
  committed: boolean;
};

export default function TopStage() {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const floodRef = useRef<HTMLDivElement | null>(null);
  const [committedKey, setCommittedKey] = useState<OrbKey | null>(null);

  // 遷移先の画面遷移を軽くしておく
  useEffect(() => {
    router.prefetch("/search");
    router.prefetch("/post");
  }, [router]);

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
      if (dist >= diagonal * 0.5) {
        commit(d);
      }
    }

    function onUp(e: PointerEvent) {
      const d = dragRef.current;
      if (!d || d.pointerId !== e.pointerId) return;
      if (!d.committed) {
        releaseWithoutCommit(d);
      }
    }

    function releaseWithoutCommit(d: DragState) {
      const flood = floodRef.current;
      if (flood) {
        flood.style.transition = "width .32s cubic-bezier(.4,0,.2,1), height .32s cubic-bezier(.4,0,.2,1)";
        flood.style.width = "0px";
        flood.style.height = "0px";
        setTimeout(() => flood.remove(), 340);
      }
      const el = stageRef.current?.querySelector<HTMLDivElement>(`[data-orb="${d.key}"]`);
      if (el) delete el.dataset.active;
      dragRef.current = null;
      floodRef.current = null;
    }

    function commit(d: DragState) {
      d.committed = true;
      setCommittedKey(d.key);

      const flood = floodRef.current;
      const diagonal = Math.hypot(window.innerWidth, window.innerHeight);
      if (flood) {
        flood.style.transition = "width .5s cubic-bezier(.2,.8,.2,1), height .5s cubic-bezier(.2,.8,.2,1)";
        flood.style.width = `${diagonal * 1.3}px`;
        flood.style.height = `${diagonal * 1.3}px`;
      }

      setTimeout(() => {
        router.push(ORB[d.key].route);
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
  }, [router]);

  function handlePointerDown(key: OrbKey) {
    return (e: React.PointerEvent<HTMLDivElement>) => {
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
      flood.style.background = ORB[key].fill;
      flood.style.pointerEvents = "none";
      flood.style.zIndex = "60";
      document.body.appendChild(flood);
      floodRef.current = flood;

      dragRef.current = { pointerId: e.pointerId, key, cx, cy, committed: false };
      el.dataset.active = "true";
    };
  }

  return (
    <div ref={stageRef} className="relative w-full h-[calc(100vh-4rem)] overflow-hidden select-none">
      {/* 背景画像（スマホ / PC で出し分け） */}
      <img src="/back_mob.png" alt="" className="absolute inset-0 w-full h-full object-cover md:hidden" />
      <img src="/back_pc.png" alt="" className="absolute inset-0 w-full h-full object-cover hidden md:block" />

      {/* ワードマーク */}
      <div
        className="absolute top-[10%] left-0 right-0 text-center text-sm font-light tracking-[0.5em] text-[#16181C] transition-opacity duration-300"
        style={{ opacity: committedKey ? 0 : 1, textIndent: "0.5em" }}
      >
        K E S S A K U
      </div>

      {/* 円リンク：さがす / つくる */}
      <div className="absolute inset-0 flex items-end justify-between px-[12%] pb-[16%] md:px-[18%] md:pb-[14%]">
        {(Object.keys(ORB) as OrbKey[]).map((key, i) => (
          <div
            key={key}
            data-orb={key}
            onPointerDown={handlePointerDown(key)}
            className={`w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center text-[11px] md:text-xs font-normal tracking-[0.28em] cursor-grab shadow-lg touch-none transition-[opacity,transform] duration-300 data-[active=true]:opacity-0 data-[active=true]:scale-50 ${
              i === 0 ? "mb-[10%]" : "mt-[6%]"
            }`}
            style={{ background: ORB[key].fill, color: ORB[key].ink, textIndent: "0.28em" }}
          >
            {ORB[key].label}
          </div>
        ))}
      </div>

      {/* ヒント */}
      <div
        className="absolute bottom-[6%] left-0 right-0 text-center text-[11px] font-light tracking-[0.35em] text-[#16181C]/75 transition-opacity duration-300"
        style={{ opacity: committedKey ? 0 : 1, textIndent: "0.35em" }}
      >
        指を離さず　円を広げてください
      </div>
    </div>
  );
}