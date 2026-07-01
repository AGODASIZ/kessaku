"use client";

import Link from "next/link";

export default function ComingSoonPage({
  title,
  backHref,
  backLabel,
}: {
  title: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-white text-[#16181C] font-sans">
      <Link href={backHref} className="absolute top-6 left-6 flex items-center gap-1 text-sm">
        <span className="material-symbols-outlined text-xl">arrow_back</span>
        {backLabel}
      </Link>
      <p className="text-xs tracking-[0.4em] opacity-50" style={{ textIndent: "0.4em" }}>
        COMING SOON
      </p>
      <h1 className="text-lg tracking-[0.3em] font-light" style={{ textIndent: "0.3em" }}>
        {title}
      </h1>
      <p className="text-sm opacity-60">このページは準備中です</p>
    </div>
  );
}
