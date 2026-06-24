"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

// 本文HTMLを "scene-break" マーカーで分割する。
// マーカーが1つも無い場合は、全文を1ページとして扱う。
function splitBodyIntoScenes(bodyHtml: string): { title: string; html: string }[] {
  if (!bodyHtml) return [{ title: '本文', html: '' }];

  const container = document.createElement('div');
  container.innerHTML = bodyHtml;

  const breaks = Array.from(container.querySelectorAll('.scene-break'));
  if (breaks.length === 0) {
    return [{ title: '全編', html: bodyHtml }];
  }

  const scenes: { title: string; html: string }[] = [];
  let currentTitle = '冒頭';
  let currentNodes: string[] = [];

  Array.from(container.childNodes).forEach((node) => {
    const el = node as HTMLElement;
    if (el.nodeType === 1 && el.classList && el.classList.contains('scene-break')) {
      // 区切りに到達したら、それまでの内容を1場として確定
      scenes.push({ title: currentTitle, html: currentNodes.join('') });
      currentTitle = el.getAttribute('data-scene-title') || `第${scenes.length + 1}場`;
      currentNodes = [];
    } else {
      const wrapper = document.createElement('div');
      wrapper.appendChild(node.cloneNode(true));
      currentNodes.push(wrapper.innerHTML);
    }
  });
  scenes.push({ title: currentTitle, html: currentNodes.join('') });

  // 内容が空のページ（冒頭が空など）は読みづらいので除外
  return scenes.filter((s) => s.html.replace(/<br\s*\/?>/g, '').trim() !== '');
}

function ReadScriptContent() {
  const searchParams = useSearchParams();
  const scriptId = searchParams.get('id');

  const [script, setScript] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [fontSize, setFontSize] = useState(17); // px単位。デフォルトを以前より少し小さめに
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchScript() {
      if (!scriptId) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('scripts')
        .select('*')
        .eq('id', scriptId)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setScript(data);
      setLoading(false);
    }
    fetchScript();
  }, [scriptId]);

  const scenes = useMemo(() => {
    if (!script) return [];
    return splitBodyIntoScenes(script.body || '');
  }, [script]);

  const totalPages = scenes.length;
  const currentScene = scenes[currentPage];

  // 全文をプレーンテキストとしてコピー
  const handleCopyAll = async () => {
    if (!script) return;
    const container = document.createElement('div');
    container.innerHTML = script.body || '';
    const plainText = container.innerText || container.textContent || '';
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('コピーに失敗しました。お使いの環境ではクリップボードへのアクセスが許可されていない可能性があります。');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        読み込み中...
      </div>
    );
  }

  if (notFound || !script) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500 gap-4">
        <p>台本が見つかりませんでした。</p>
        <Link href="/search" className="text-sm font-medium text-black underline underline-offset-4">
          台本を探すページへ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 font-sans antialiased flex flex-col">

      {/* ヘッダー（読書ページ専用・シンプル） */}
      <header className="border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur-sm z-50">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            href={`/script?id=${script.id}`}
            className="text-gray-500 hover:text-black transition flex items-center gap-1 text-sm flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="hidden sm:inline">詳細ページへ戻る</span>
          </Link>

          <span className="text-sm font-medium text-gray-700 truncate text-center flex-grow">
            {script.title}
          </span>

          {/* 全文コピーボタン */}
          <button
            onClick={handleCopyAll}
            className="text-gray-500 hover:text-black transition flex items-center gap-1 text-sm flex-shrink-0"
            title="台本の全文をコピーします"
          >
            <span className="material-symbols-outlined text-[20px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            <span className="hidden sm:inline">{copied ? 'コピーしました' : '全文コピー'}</span>
          </button>
        </div>

        {/* 文字サイズ調整バー */}
        <div className="max-w-3xl mx-auto px-4 md:px-6 pb-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-gray-400 text-[18px]">text_decrease</span>
          <input
            type="range"
            min={13}
            max={26}
            step={1}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="flex-grow accent-black h-1"
          />
          <span className="material-symbols-outlined text-gray-400 text-[22px]">text_increase</span>
          <span className="text-xs text-gray-400 w-10 text-right flex-shrink-0">{fontSize}px</span>
        </div>
      </header>

      {/* ページ（場）切り替えナビ：複数場あるときだけ表示 */}
      {totalPages > 1 && (
        <div className="max-w-3xl w-full mx-auto px-4 md:px-6 pt-4 flex items-center justify-between gap-3">
          <select
            value={currentPage}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
            className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 outline-none focus:border-black transition max-w-[60%] truncate"
          >
            {scenes.map((scene, idx) => (
              <option key={idx} value={idx}>
                {idx + 1} / {totalPages} ・ {scene.title}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="w-9 h-9 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="w-9 h-9 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {/* 本文 */}
      <main className="flex-grow max-w-3xl w-full mx-auto px-4 md:px-6 py-8">
        {totalPages > 1 && (
          <h2 className="text-center text-sm font-bold tracking-widest text-gray-400 mb-6">
            ━━ {currentScene.title} ━━
          </h2>
        )}
        <div
          className="text-gray-800"
          style={{ fontSize: `${fontSize}px`, lineHeight: '1.9' }}
          dangerouslySetInnerHTML={{ __html: currentScene?.html || '' }}
        />

        {/* ページ下部にも次へ/前へ（読み進めやすさのため） */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-12 pt-6 border-t border-gray-100">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="text-sm font-medium text-gray-600 hover:text-black transition flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              前の場
            </button>
            <span className="text-xs text-gray-400">{currentPage + 1} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="text-sm font-medium text-gray-600 hover:text-black transition flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              次の場
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        )}
      </main>

    </div>
  );
}

export default function ReadScriptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        読み込み中...
      </div>
    }>
      <ReadScriptContent />
    </Suspense>
  );
}