"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import SwipeIconLink from "../../components/SwipeIconLink";

const ACCENT = "#FFAAAD";

const LINKS = [
  { icon: "leaderboard", label: "ランキング", route: "/ranking" },
  { icon: "search", label: "台本検索", route: "/search" },
  { icon: "groups", label: "コミュニティ", route: "/community" },
  { icon: "auto_awesome", label: "おすすめ", route: "/recommend" },
];

export default function SearchHubPage() {
  // このページもトップと同じくスクロールしない1画面にする
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 overflow-hidden flex flex-col items-center justify-center gap-12 md:gap-16 font-sans"
      style={{ background: ACCENT }}
    >
      <Link href="/" className="absolute top-6 left-6 text-white" aria-label="トップへ戻る">
        <span className="material-symbols-outlined text-2xl">arrow_back</span>
      </Link>

      <div className="text-white text-sm tracking-[0.5em] font-light" style={{ textIndent: "0.5em" }}>
        S E A R C H
      </div>

      <div className="grid grid-cols-2 gap-x-10 gap-y-10 md:gap-x-16 md:gap-y-14">
        {LINKS.map((l) => (
          <SwipeIconLink key={l.route} icon={l.icon} label={l.label} route={l.route} accent={ACCENT} />
        ))}
      </div>
    </div>
  );
}
