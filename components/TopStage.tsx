"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// トップページの新しいメイン導線。
// 背景画像（スマホ: back_mob.png / PC: back_pc.png）の上に、
// 「さがす（#FFAAAD）」「つくる（#C3D7D9）」の2つの円だけを配置する。
//
// タップではなく、円を押さえたまま指を離さずに動かすと、動かした距離ぶんだけ
// 円が広がっていく。画面の対角線の約6割まで広げると確定（コミット）し、
// その色が画面全体に広がりきったところで、その色をテーマにした中間ページ
// （さがす→/search-hub、つくる→/create-hub）へ移動する。
//
// フラッド（広がる色の円）は React ツリーの外（document.body直下）に生成する。
// こうすることで、Next.jsのクライアント遷移でページ本体が入れ替わった後も
// フラッドがそのまま画面に残り、遷移先の背景色へ自然にクロスフェードできる。

type OrbKey = "search" | "post";

const ORB: Record<OrbKey, { fill: string; ink: string; label: string; route: string }> = {
  search: { fill: "#FFAAAD", ink: "#5C2224", label: "さがす", route: "/search-hub" },
  post: { fill: "#C3D7D9", ink: "#1F3A3D", label: "つくる", route: "/create-hub" },
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
  const [visible, setVisible] = useState(false);
  const shown = visible && !committedKey;

  // 最初のロゴアニメーション（スプラッシュ）が終わる頃に合わせて、
  // 画面外からふわっと現れる（元のMobileHomeScreenのフェードインを踏襲）
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 4200);
    return () => clearTimeout(timer);
  }, []);

  // 遷移先の画面遷移を軽くしておく
  useEffect(() => {
    router.prefetch("/search-hub");
    router.prefetch("/create-hub");
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
      if (dist >= diagonal * 0.2) {
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
      // orb の中心から画面の四隅までの最長距離を実測し、そこを半径にする
      // （orb は中央にいるとは限らないため、対角線をそのまま使うと届かない角が出る）
      const corners = [
        [0, 0],
        [window.innerWidth, 0],
        [0, window.innerHeight],
        [window.innerWidth, window.innerHeight],
      ];
      const maxRadius = Math.max(...corners.map(([x, y]) => Math.hypot(x - d.cx, y - d.cy)));
      const coverDiameter = maxRadius * 2 * 1.08; // 少し余裕を持たせる

      if (flood) {
        flood.style.transition = "width .5s cubic-bezier(.2,.8,.2,1), height .5s cubic-bezier(.2,.8,.2,1)";
        flood.style.width = `${coverDiameter}px`;
        flood.style.height = `${coverDiameter}px`;
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
    <div ref={stageRef} className="relative w-full h-full overflow-hidden select-none">
      {/* 背景画像（スマホ / PC で出し分け） */}
      <img src="/back_mob.png" alt="" className="absolute inset-0 w-full h-full object-cover md:hidden" />
      <img src="/back_pc.png" alt="" className="absolute inset-0 w-full h-full object-cover hidden md:block" />

      {/* ワードマーク */}
      <div
        className="absolute top-[10%] left-0 right-0 text-center text-sm font-light tracking-[0.5em] text-[#16181C]"
        style={{
          opacity: shown ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(-40px)",
          transition: "opacity 1.2s ease-out, transform 1.2s ease-out",
          textIndent: "0.5em",
        }}
      >
        K E S S A K U
      </div>

      {/* 円リンク：さがす（下部固定） */}
      <div
        data-orb="search"
        onPointerDown={handlePointerDown("search")}
        className="absolute left-[12%] md:left-[18%] bottom-[16%] md:bottom-[14%] w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center text-[11px] md:text-xs font-normal tracking-[0.28em] cursor-grab touch-none"
        style={{
          background: ORB.search.fill,
          color: "#FFFFFF",
          textIndent: "0.28em",
          opacity: shown ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(80px)",
          transition: "opacity 1.2s ease-out 0.3s, transform 1.2s ease-out 0.3s",
        }}
      >
        {ORB.search.label}
      </div>

      {/* 円リンク：つくる（画面の縦中央あたり） */}
      <div
        data-orb="post"
        onPointerDown={handlePointerDown("post")}
        className="absolute right-[12%] md:right-[18%] top-1/2 w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center text-[11px] md:text-xs font-normal tracking-[0.28em] cursor-grab touch-none"
        style={{
          background: ORB.post.fill,
          color: "#FFFFFF",
          textIndent: "0.28em",
          opacity: shown ? 1 : 0,
          transform: visible ? "translateY(-50%)" : "translateY(calc(-50% - 80px))",
          transition: "opacity 1.2s ease-out 0.5s, transform 1.2s ease-out 0.5s",
        }}
      >
        {ORB.post.label}
      </div>

      {/* スワイプ操作のヒント：円の反対側（左右）に向かって指が動くアニメーション */}
      <div
        className="absolute left-[12%] md:left-[18%] bottom-[calc(16%+7.5rem)] md:bottom-[calc(14%+9.5rem)] flex items-center gap-1 text-[#16181C]/70"
        style={{
          opacity: shown ? 1 : 0,
          transition: "opacity 1.2s ease-out 0.9s",
        }}
      >
        <span
          className="material-symbols-outlined text-2xl"
          style={{ animation: "swipe-hint-right 1.8s ease-in-out infinite" }}
        >
          swipe_right
        </span>
      </div>
      <div
        className="absolute right-[12%] md:right-[18%] top-[calc(50%-9.5rem)] md:top-[calc(50%-11.5rem)] flex items-center gap-1 text-[#16181C]/70"
        style={{
          opacity: shown ? 1 : 0,
          transition: "opacity 1.2s ease-out 0.9s",
        }}
      >
        <span
          className="material-symbols-outlined text-2xl"
          style={{ animation: "swipe-hint-left 1.8s ease-in-out infinite" }}
        >
          swipe_left
        </span>
      </div>
    </div>
  );
}
