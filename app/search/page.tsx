"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { getLicenseBadge } from '../../lib/licenseUtils';

function SearchPageContent() {
  const searchParamsUrl = useSearchParams();
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 検索・フィルタ・ソートの状態
  const [keyword, setKeyword] = useState('');
  const [genre, setGenre] = useState('ジャンルすべて');
  const [timeFilter, setTimeFilter] = useState('上演時間すべて');
  const [castFilter, setCastFilter] = useState('人数すべて');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState('新着順');

  // URLの ?tag=... パラメータを初期値として反映（台本詳細ページのタグリンクから来た場合）
  useEffect(() => {
    const tagParam = searchParamsUrl.get('tag');
    if (tagParam) setTagFilter(tagParam);
  }, [searchParamsUrl]);

  // ページネーション
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // 公開済みの台本をすべて取得し、いいね数も合わせて集計する
  useEffect(() => {
    async function fetchScripts() {
      const { data, error } = await supabase
        .from('scripts')
        .select('*')
        .eq('status', 'published')
        .order('id', { ascending: false });

      if (!error && data) {
        // いいねテーブルから全件取得し、script_idごとに件数を集計
        const { data: likesData } = await supabase
          .from('likes')
          .select('script_id');

        const countMap: Record<number, number> = {};
        (likesData || []).forEach((row: any) => {
          countMap[row.script_id] = (countMap[row.script_id] || 0) + 1;
        });

        const scriptsWithLikes = data.map((s: any) => ({
          ...s,
          likeCount: countMap[s.id] || 0,
        }));

        setScripts(scriptsWithLikes);
      }
      setLoading(false);
    }
    fetchScripts();
  }, []);

  // 上演時間（分）を取得する。time_minutes があれば優先し、
  // 無い（古いデータ）場合は time の文字列（例："約60分"）から抜き出す
  const extractMinutes = (script: { time_minutes?: number | null; time?: string | null }): number | null => {
    if (script.time_minutes != null) return script.time_minutes;
    if (!script.time) return null;
    const match = script.time.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  // キーワード・ジャンル・上演時間でフィルタリング
  const filteredScripts = scripts.filter((script) => {
    const keywordLower = keyword.toLowerCase();
    const matchesKeyword =
      !keyword ||
      script.title?.toLowerCase().includes(keywordLower) ||
      script.author?.toLowerCase().includes(keywordLower);

    const matchesGenre = genre === 'ジャンルすべて' || script.genre === genre;

    let matchesTime = true;
    const minutes = extractMinutes(script);
    if (timeFilter === '30分未満') {
      matchesTime = minutes !== null && minutes < 30;
    } else if (timeFilter === '30分〜60分') {
      matchesTime = minutes !== null && minutes >= 30 && minutes <= 60;
    } else if (timeFilter === '60分以上') {
      matchesTime = minutes !== null && minutes > 60;
    }

    // 合計人数によるフィルタ（cast_male + cast_female + cast_any の合計で判定）
    const totalCast = (script.cast_male || 0) + (script.cast_female || 0) + (script.cast_any || 0);
    let matchesCast = true;
    if (castFilter === '3人以下') {
      matchesCast = totalCast > 0 && totalCast <= 3;
    } else if (castFilter === '4〜5人') {
      matchesCast = totalCast >= 4 && totalCast <= 5;
    } else if (castFilter === '6〜10人') {
      matchesCast = totalCast >= 6 && totalCast <= 10;
    } else if (castFilter === '11人以上') {
      matchesCast = totalCast >= 11;
    }

    // タグによるフィルタ
    const matchesTag = !tagFilter || (Array.isArray(script.tags) && script.tags.includes(tagFilter));

    return matchesKeyword && matchesGenre && matchesTime && matchesCast && matchesTag;
  });

  // ソート
  const sortedScripts = [...filteredScripts].sort((a, b) => {
    if (sortOrder === '新着順') {
      return b.id - a.id;
    } else if (sortOrder === '上演時間が短い順') {
      const aMin = extractMinutes(a) ?? Infinity;
      const bMin = extractMinutes(b) ?? Infinity;
      return aMin - bMin;
    } else if (sortOrder === '人気順') {
      return (b.likeCount || 0) - (a.likeCount || 0);
    }
    return b.id - a.id;
  });

  // ページネーション処理
  const totalPages = Math.max(1, Math.ceil(sortedScripts.length / itemsPerPage));
  const paginatedScripts = sortedScripts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // フィルタが変わったら1ページ目に戻す
  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, genre, timeFilter, sortOrder]);

  return (
    <div className="text-gray-900 bg-gray-50/30 font-sans antialiased min-h-screen flex flex-col">

      {/* Header (トップページと共通) */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-2xl font-serif font-bold tracking-wider">傑作</span>
            <span className="text-xs text-gray-500 font-medium tracking-widest">Kessaku</span>
          </Link>
          <div className="hidden md:flex items-center bg-gray-100 rounded-md px-4 py-2 w-96">
            <span className="material-symbols-outlined text-gray-400 mr-2">search</span>
            <input
              type="text"
              placeholder="台本のタイトルや作者名で検索..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm text-gray-700 placeholder-gray-400"
            />
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium hover:text-gray-600 transition">Login</Link>
            <Link href="/post" className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-gray-800 transition">Post Script</Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-6 py-12 w-full">

        {/* 検索コントロールパネル */}
        <div className="mb-12">
          <h1 className="text-3xl font-serif font-bold mb-8">台本を探す</h1>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-4">
            {/* キーワード検索 */}
            <div className="flex-grow flex items-center bg-gray-100 rounded-md px-4 py-3">
              <span className="material-symbols-outlined text-gray-400 mr-2">search</span>
              <input
                type="text"
                placeholder="キーワード、タイトル、作者名で検索..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-gray-700 placeholder-gray-500"
              />
            </div>

            {/* 絞り込みフィルター */}
            <div className="flex flex-wrap md:flex-nowrap gap-4">
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="bg-gray-100 border-none outline-none text-gray-700 rounded-md px-4 py-3 cursor-pointer w-full md:w-auto"
              >
                <option>ジャンルすべて</option>
                <option>青春・学園</option>
                <option>コメディ</option>
                <option>シリアス</option>
                <option>ファンタジー</option>
                <option>サスペンス</option>
                <option>ヒューマンドラマ</option>
                <option>その他</option>
              </select>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="bg-gray-100 border-none outline-none text-gray-700 rounded-md px-4 py-3 cursor-pointer w-full md:w-auto"
              >
                <option>上演時間すべて</option>
                <option>30分未満</option>
                <option>30分〜60分</option>
                <option>60分以上</option>
              </select>
              <select
                value={castFilter}
                onChange={(e) => setCastFilter(e.target.value)}
                className="bg-gray-100 border-none outline-none text-gray-700 rounded-md px-4 py-3 cursor-pointer w-full md:w-auto"
              >
                <option>人数すべて</option>
                <option>3人以下</option>
                <option>4〜5人</option>
                <option>6〜10人</option>
                <option>11人以上</option>
              </select>
            </div>
          </div>

          {/* タグフィルターが適用されている場合のバッジ表示 */}
          {tagFilter && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-500">タグで絞り込み中：</span>
              <span className="bg-black text-white text-sm font-medium px-3 py-1.5 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">tag</span>
                {tagFilter}
                <button onClick={() => setTagFilter(null)} className="hover:text-gray-300 transition">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            </div>
          )}
        </div>

        {/* 検索結果一覧 */}
        <div>
          <div className="flex justify-between items-end mb-6 border-b border-gray-200 pb-4">
            <p className="text-sm text-gray-600">
              <strong>{sortedScripts.length}</strong> 件の台本が見つかりました
            </p>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-400 text-sm">sort</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="bg-transparent border-none text-sm text-gray-700 font-medium outline-none cursor-pointer"
              >
                <option>新着順</option>
                <option>人気順</option>
                <option>上演時間が短い順</option>
              </select>
            </div>
          </div>

          {/* Grid Cards */}
          {loading ? (
            <div className="text-gray-400 py-24 text-center">台本データを読み込み中...</div>
          ) : paginatedScripts.length === 0 ? (
            <div className="text-gray-400 py-24 text-center">該当する台本が見つかりませんでした。</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedScripts.map((script) => {
                const badge = getLicenseBadge(script);
                return (
                  <Link
                    href={`/script?id=${script.id}`}
                    key={script.id}
                    className="bg-white rounded-lg border border-gray-200 p-6 relative hover:shadow-md transition cursor-pointer block"
                  >
                    <div className="absolute top-4 right-4 flex items-center gap-1 text-xs text-gray-400">
                      <span className="material-symbols-outlined text-[16px]">favorite</span>
                      {script.likeCount || 0}
                    </div>
                    <h3 className="text-lg font-serif font-bold mb-2 pr-10">{script.title}</h3>
                    <p className="text-sm text-gray-600 mb-6">{script.author}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-4">
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span> {script.time || '未設定'}</span>
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">group</span> {script.cast || '未設定'}</span>
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">category</span> {script.genre || '未設定'}</span>
                    </div>
                    <div className={`text-xs font-medium flex items-center gap-1 ${badge.color}`}>
                      <span className="material-symbols-outlined text-sm">{badge.icon}</span> {badge.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* ページネーション（ページ送り） */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-16 gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-gray-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-md flex items-center justify-center font-medium transition ${
                    page === currentPage
                      ? 'bg-black text-white'
                      : 'border border-gray-200 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 rounded-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-gray-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          )}
        </div>

      </main>

      {/* Footer (トップページと共通) */}
      <footer className="bg-gray-50 pt-16 pb-8 border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
            <div>
              <Link href="/" className="flex items-baseline gap-2 mb-6">
                <span className="text-2xl font-serif font-bold tracking-wider">傑作</span>
                <span className="text-xs text-gray-500 font-medium tracking-widest">Kessaku</span>
              </Link>
              <p className="text-sm text-gray-600 leading-relaxed">
                あなたの戯曲が、誰かの舞台になる。<br />
                中高大演劇部のための台本投稿プラットフォーム。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <ul className="space-y-4 text-gray-600">
                  <li><a href="#" className="hover:text-black transition">サービス</a></li>
                  <li><Link href="/search" className="hover:text-black transition">台本を探す</Link></li>
                  <li><Link href="/post" className="hover:text-black transition">台本を投稿する</Link></li>
                  <li><a href="#" className="hover:text-black transition">使い方ガイド</a></li>
                </ul>
              </div>
              <div>
                <ul className="space-y-4 text-gray-600">
                  <li><a href="#" className="hover:text-black transition">サポート</a></li>
                  <li><a href="#" className="hover:text-black transition">ヘルプセンター</a></li>
                  <li><a href="#" className="hover:text-black transition">お問い合わせ</a></li>
                  <li><a href="#" className="hover:text-black transition">利用規約</a></li>
                  <li><a href="#" className="hover:text-black transition">プライバシーポリシー</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center border-t border-gray-200 pt-8 text-xs text-gray-500">
            <p>&copy; 2024 傑作 (Kessaku). All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-black transition">Twitter</a>
              <a href="#" className="hover:text-black transition">Instagram</a>
              <a href="#" className="hover:text-black transition">Note</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}