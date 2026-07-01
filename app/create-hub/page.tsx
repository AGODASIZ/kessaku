"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import SwipeIconLink from "../../components/SwipeIconLink";

const ACCENT = "#C3D7D9";

const LINKS = [
  { icon: "edit_note", label: "台本を書く", route: "/post" },
  { icon: "diversity_3", label: "文壇", route: "/bundan" },
  { icon: "theater_comedy", label: "演出ノート", route: "/directing-notes" },
];

export default function CreateHubPage() {
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
        P O S T
      </div>

      <div className="flex flex-wrap justify-center gap-x-10 gap-y-10 md:gap-x-16">
        {LINKS.map((l) => (
          <SwipeIconLink key={l.route} icon={l.icon} label={l.label} route={l.route} accent={ACCENT} />
        ))}
      </div>
    </div>
  );
}
