"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { getLicenseBadge, feeLabel } from '../../lib/licenseUtils';

function ScriptDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scriptId = searchParams.get('id');

  const [script, setScript] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // 翻案ツリー関連
  const [originalScript, setOriginalScript] = useState<any>(null); // この台本が翻案している原作
  const [adaptationWorks, setAdaptationWorks] = useState<any[]>([]); // この台本を原作とする翻案作品たち

  // いいね関連
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  // 上演報告関連
  const [approvedReports, setApprovedReports] = useState<any[]>([]);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportForm, setReportForm] = useState({
    group_name: '',
    performance_date: '',
    venue: '',
    ticket_info: '',
    description: '',
    url: '',
  });

  useEffect(() => {
    async function fetchData() {
      if (!scriptId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // ログイン状態（編集ボタン表示の判定用）
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // 台本データの取得
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

      // この台本が翻案作品なら、原作の情報を取得
      if (data.original_script_id) {
        const { data: original } = await supabase
          .from('scripts')
          .select('id, title, author')
          .eq('id', data.original_script_id)
          .single();
        setOriginalScript(original || null);
      }

      // この台本を原案とした翻案作品（公開済みのもの）を取得
      const { data: adaptations } = await supabase
        .from('scripts')
        .select('id, title, author')
        .eq('original_script_id', scriptId)
        .eq('status', 'published');
      setAdaptationWorks(adaptations || []);

      // 承認済みの上演報告を取得（誰でも見える）
      const { data: approved } = await supabase
        .from('performance_reports')
        .select('*')
        .eq('script_id', scriptId)
        .eq('status', 'approved')
        .order('performance_date', { ascending: false });
      setApprovedReports(approved || []);

      // 自分が作者なら、承認待ちの報告も取得
      if (user && user.id === data.user_id) {
        const { data: pending } = await supabase
          .from('performance_reports')
          .select('*')
          .eq('script_id', scriptId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        setPendingReports(pending || []);
      }

      // いいねの総数を取得
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('script_id', scriptId);
      setLikeCount(count || 0);

      // ログイン中のユーザーが既にいいねしているか確認
      if (user) {
        const { data: likeData } = await supabase
          .from('likes')
          .select('id')
          .eq('script_id', scriptId)
          .eq('user_id', user.id)
          .maybeSingle();
        setIsLiked(!!likeData);
      }
    }
    fetchData();
  }, [scriptId]);

  // いいねボタンの処理（押すたびに追加/取り消しを切り替える）
  const handleToggleLike = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (likeLoading || !script) return;
    setLikeLoading(true);

    if (isLiked) {
      // 取り消し
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('script_id', script.id)
        .eq('user_id', user.id);
      if (!error) {
        setIsLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      }
    } else {
      // 追加
      const { error } = await supabase
        .from('likes')
        .insert({ script_id: script.id, user_id: user.id });
      if (!error) {
        setIsLiked(true);
        setLikeCount((c) => c + 1);
      }
    }
    setLikeLoading(false);
  };

  // 上演報告フォームの送信
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !script) {
      router.push('/login');
      return;
    }
    if (!reportForm.group_name.trim()) {
      alert('上演した団体・個人名を入力してください。');
      return;
    }
    setReportSubmitting(true);

    // 投稿者本人が報告する場合は即時承認、それ以外は承認待ちにする
    const status = user.id === script.user_id ? 'approved' : 'pending';

    const { data, error } = await supabase
      .from('performance_reports')
      .insert({
        script_id: script.id,
        reporter_id: user.id,
        status,
        group_name: reportForm.group_name,
        performance_date: reportForm.performance_date || null,
        venue: reportForm.venue,
        ticket_info: reportForm.ticket_info,
        description: reportForm.description,
        url: reportForm.url,
      })
      .select()
      .single();

    setReportSubmitting(false);

    if (error) {
      alert('送信に失敗しました: ' + error.message);
      return;
    }

    if (status === 'approved') {
      setApprovedReports((prev) => [data, ...prev]);
      alert('上演報告を公開しました。');
    } else {
      alert('上演報告を送信しました。作者の承認後に公開されます。');
    }

    setShowReportForm(false);
    setReportForm({ group_name: '', performance_date: '', venue: '', ticket_info: '', description: '', url: '' });
  };

  // 作者による承認
  const handleApproveReport = async (reportId: number) => {
    const { error } = await supabase
      .from('performance_reports')
      .update({ status: 'approved' })
      .eq('id', reportId);

    if (error) {
      alert('承認に失敗しました: ' + error.message);
      return;
    }

    const approvedItem = pendingReports.find((r) => r.id === reportId);
    setPendingReports((prev) => prev.filter((r) => r.id !== reportId));
    if (approvedItem) {
      setApprovedReports((prev) => [{ ...approvedItem, status: 'approved' }, ...prev]);
    }
  };

  // 作者による拒否（削除）
  const handleRejectReport = async (reportId: number) => {
    const confirmed = window.confirm('この上演報告の申請を拒否（削除）します。よろしいですか？');
    if (!confirmed) return;

    const { error } = await supabase
      .from('performance_reports')
      .delete()
      .eq('id', reportId);

    if (error) {
      alert('削除に失敗しました: ' + error.message);
      return;
    }
    setPendingReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        読み込み中...
      </div>
    );
  }

  if (notFound || !script) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500 gap-4">
        <p>台本が見つかりませんでした。</p>
        <Link href="/search" className="text-sm font-medium text-black hover:underline">
          台本を探すページへ戻る
        </Link>
      </div>
    );
  }

  const characters: { name: string; description: string }[] = Array.isArray(script.characters)
    ? script.characters
    : [];

  const isOwner = user && script.user_id === user.id;

  return (
    <div className="text-gray-900 bg-gray-50/30 font-sans antialiased min-h-screen flex flex-col">

      {/* Header (共通) */}
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
              placeholder="Search scripts..."
              className="bg-transparent border-none outline-none w-full text-sm text-gray-700 placeholder-gray-400"
            />
          </div>
          <div className="flex items-center gap-6">
            {user ? (
              <Link href="/mypage" className="text-sm font-medium hover:text-gray-600 transition">マイページ</Link>
            ) : (
              <Link href="/login" className="text-sm font-medium hover:text-gray-600 transition">Login</Link>
            )}
            <Link href="/post" className="bg-black text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-gray-800 transition">Post Script</Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-4xl mx-auto px-6 py-12 w-full">

        {/* 台本ヘッダー情報 */}
        <div className="bg-white p-5 sm:p-8 md:p-12 rounded-lg border border-gray-200 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-gray-400 flex-wrap">
              <span className="bg-gray-100 px-2 py-1 rounded">{script.genre || '未設定'}</span>
              {script.status === 'draft' && (
                <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-1 rounded">下書き</span>
              )}
              {/* ライセンスアイコン（料金・上演許可） */}
              {(() => {
                const badge = getLicenseBadge(script);
                return (
                  <span className={`flex items-center gap-1 px-2 py-1 rounded border ${badge.bgColor} ${badge.color} ${badge.borderColor}`}>
                    <span className="material-symbols-outlined text-[14px]">{badge.icon}</span>
                    {badge.label}
                  </span>
                );
              })()}
            </div>

            {/* 自分の台本なら編集ボタンを表示 */}
            {isOwner && (
              <button
                onClick={() => router.push(`/post?id=${script.id}`)}
                className="text-sm font-medium text-gray-600 hover:text-black transition flex items-center gap-1 flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span> <span className="hidden sm:inline">編集する</span>
              </button>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-5xl font-serif font-bold leading-tight mb-4">
            {script.title}
          </h1>

          <p className="text-base md:text-lg text-gray-600 mb-6 md:mb-8 border-b border-gray-100 pb-6 md:pb-8">
            作者：
            <Link href={`/author?id=${script.user_id}`} className="font-medium text-black hover:underline underline-offset-2">
              {script.author}
            </Link>
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 md:gap-6">
            <div className="flex flex-wrap gap-3 md:gap-6 text-xs md:text-sm text-gray-600 font-medium">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-gray-400 text-base">schedule</span> 上演時間：{script.time || '未設定'}</span>
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-gray-400 text-base">group</span> キャスト：{script.cast || '未設定'}</span>
            </div>

            {/* いいねボタン */}
            <button
              onClick={handleToggleLike}
              disabled={likeLoading}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition flex-shrink-0 ${
                isLiked
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-white border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-500'
              }`}
              title={user ? 'いいねする' : 'ログインするといいねできます'}
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}>
                favorite
              </span>
              {likeCount}
            </button>
          </div>
        </div>

        {/* 翻案ツリー：原作 / この作品の翻案一覧 */}
        {(originalScript || adaptationWorks.length > 0) && (
          <div className="mb-8 bg-violet-50 border border-violet-200 rounded-lg p-5">
            {originalScript && (
              <div className="flex items-center gap-2 text-sm text-violet-800 mb-2">
                <span className="material-symbols-outlined text-[18px]">account_tree</span>
                <span>この作品は</span>
                <Link href={`/script?id=${originalScript.id}`} className="font-bold underline underline-offset-2 hover:text-violet-900">
                  {originalScript.title}
                </Link>
                <span>（{originalScript.author}）の翻案作品です</span>
              </div>
            )}
            {adaptationWorks.length > 0 && (
              <div className="flex items-start gap-2 text-sm text-violet-800">
                <span className="material-symbols-outlined text-[18px] mt-0.5">account_tree</span>
                <div>
                  <span>この作品を原案とした翻案作品：</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {adaptationWorks.map((a) => (
                      <Link
                        key={a.id}
                        href={`/script?id=${a.id}`}
                        className="bg-white border border-violet-200 rounded px-2 py-1 font-medium hover:bg-violet-100 transition"
                      >
                        {a.title}（{a.author}）
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ライセンス詳細（料金・改変・翻案の可否） */}
        <div className="mb-8 bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-xs font-bold text-gray-400 mb-3">上演ライセンス詳細</p>
          <div className="flex flex-wrap gap-3 text-sm mb-3">
            <span className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-3 py-1.5">
              <span className="material-symbols-outlined text-[16px] text-gray-400">school</span>
              非営利上演：{feeLabel(script.nonprofit_fee)}
            </span>
            <span className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-3 py-1.5">
              <span className="material-symbols-outlined text-[16px] text-gray-400">payments</span>
              営利上演：{feeLabel(script.commercial_fee)}
            </span>
            <span className={`flex items-center gap-1 rounded px-3 py-1.5 border ${script.modification_allowed ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
              <span className="material-symbols-outlined text-[16px]">{script.modification_allowed ? 'edit_note' : 'block'}</span>
              改変{script.modification_allowed ? '可' : '不可'}
            </span>
            <span className={`flex items-center gap-1 rounded px-3 py-1.5 border ${script.adaptation_allowed ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
              <span className="material-symbols-outlined text-[16px]">{script.adaptation_allowed ? 'account_tree' : 'block'}</span>
              翻案{script.adaptation_allowed ? '可' : '不可'}
            </span>
          </div>
          {(script.nonprofit_fee_detail || script.commercial_fee_detail) && (
            <div className="text-xs text-gray-600 space-y-1 bg-gray-50 rounded p-3">
              {script.nonprofit_fee_detail && <p>非営利：{script.nonprofit_fee_detail}</p>}
              {script.commercial_fee_detail && <p>営利：{script.commercial_fee_detail}</p>}
            </div>
          )}
        </div>

        {/* タグ */}
        {script.tags && script.tags.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {script.tags.map((tag: string) => (
              <Link
                key={tag}
                href={`/search?tag=${encodeURIComponent(tag)}`}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full transition flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">tag</span>
                {tag}
              </Link>
            ))}
          </div>
        )}

        {/* あらすじ */}
        <div className="mb-12">
          <h2 className="text-2xl font-serif font-bold mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-black block rounded-full"></span> あらすじ
          </h2>
          <p className="text-gray-700 leading-relaxed bg-white p-6 rounded-lg border border-gray-200 whitespace-pre-wrap">
            {script.synopsis || 'あらすじはまだ入力されていません。'}
          </p>
        </div>

        {/* 登場人物（登録されている場合のみ表示） */}
        {characters.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-serif font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-black block rounded-full"></span> 登場人物
            </h2>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <ul className="space-y-4 text-gray-700">
                {characters.map((char, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                  >
                    <span className="font-bold min-w-[80px]">{char.name}</span>
                    <span className="text-gray-600">{char.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 台本を読むボタン（本文は専用ページで読む） */}
        <div className="mb-12">
          <Link
            href={`/read?id=${script.id}`}
            className="block bg-black text-white text-center px-8 py-5 rounded-lg font-medium text-lg hover:bg-gray-800 transition flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">menu_book</span>
            台本を読む
          </Link>
        </div>

        {/* 作者向け：承認待ちの上演報告 */}
        {isOwner && pendingReports.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-serif font-bold mb-4 flex items-center gap-2 text-amber-700">
              <span className="material-symbols-outlined">pending_actions</span>
              承認待ちの上演報告申請（{pendingReports.length}件）
            </h2>
            <div className="space-y-3">
              {pendingReports.map((report) => (
                <div key={report.id} className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                  <p className="font-bold text-gray-800 mb-1">{report.group_name}</p>
                  <p className="text-sm text-gray-600 mb-3">
                    {report.performance_date && `公演日：${report.performance_date}　`}
                    {report.venue && `会場：${report.venue}`}
                  </p>
                  {report.description && (
                    <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{report.description}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveReport(report.id)}
                      className="bg-black text-white text-sm font-medium px-4 py-2 rounded hover:bg-gray-800 transition flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">check</span> 承認する
                    </button>
                    <button
                      onClick={() => handleRejectReport(report.id)}
                      className="bg-white border border-gray-300 text-gray-600 text-sm font-medium px-4 py-2 rounded hover:bg-gray-100 transition"
                    >
                      拒否する
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 上演報告セクション */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
              <span className="w-1 h-6 bg-black block rounded-full"></span> 上演報告・宣伝
            </h2>
            {user && (
              <button
                onClick={() => setShowReportForm(!showReportForm)}
                className="text-sm font-medium text-gray-600 hover:text-black border border-gray-300 rounded-md px-3 py-1.5 transition flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">campaign</span>
                上演報告を投稿
              </button>
            )}
          </div>

          {/* 投稿フォーム */}
          {showReportForm && (
            <form onSubmit={handleSubmitReport} className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6 space-y-4">
              {!isOwner && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  あなたは作者ではないため、この報告は作者の承認後に公開されます。
                </p>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">上演する団体・個人名 *</label>
                <input
                  type="text"
                  value={reportForm.group_name}
                  onChange={(e) => setReportForm({ ...reportForm, group_name: e.target.value })}
                  placeholder="例：○○高校演劇部"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-black transition"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">公演日</label>
                  <input
                    type="date"
                    value={reportForm.performance_date}
                    onChange={(e) => setReportForm({ ...reportForm, performance_date: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-black transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">会場</label>
                  <input
                    type="text"
                    value={reportForm.venue}
                    onChange={(e) => setReportForm({ ...reportForm, venue: e.target.value })}
                    placeholder="例：○○市民ホール"
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-black transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">チケット情報</label>
                <input
                  type="text"
                  value={reportForm.ticket_info}
                  onChange={(e) => setReportForm({ ...reportForm, ticket_info: e.target.value })}
                  placeholder="例：前売り500円・当日700円"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-black transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">詳細・宣伝コメント</label>
                <textarea
                  value={reportForm.description}
                  onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                  rows={3}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-black transition resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">関連URL（SNS・チケットサイトなど）</label>
                <input
                  type="url"
                  value={reportForm.url}
                  onChange={(e) => setReportForm({ ...reportForm, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-black transition"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="bg-black text-white text-sm font-medium px-5 py-2 rounded hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {reportSubmitting ? '送信中...' : (isOwner ? '公開する' : '申請を送る')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportForm(false)}
                  className="bg-white border border-gray-300 text-gray-600 text-sm font-medium px-5 py-2 rounded hover:bg-gray-100 transition"
                >
                  キャンセル
                </button>
              </div>
            </form>
          )}

          {/* 承認済みの上演報告一覧 */}
          {approvedReports.length === 0 ? (
            <p className="text-sm text-gray-400 bg-white border border-gray-200 rounded-lg p-6 text-center">
              まだ上演報告がありません。
            </p>
          ) : (
            <div className="space-y-3">
              {approvedReports.map((report) => (
                <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <p className="font-bold text-gray-800">{report.group_name}</p>
                    {report.performance_date && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{report.performance_date}</span>
                    )}
                  </div>
                  {report.venue && (
                    <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-gray-400">location_on</span>
                      {report.venue}
                    </p>
                  )}
                  {report.ticket_info && (
                    <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-gray-400">confirmation_number</span>
                      {report.ticket_info}
                    </p>
                  )}
                  {report.description && (
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{report.description}</p>
                  )}
                  {report.url && (
                    <a
                      href={report.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline mt-2 inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">link</span>
                      関連リンクを見る
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* Footer (共通) */}
      <footer className="bg-gray-50 pt-16 pb-8 border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center border-t border-gray-200 pt-8 text-xs text-gray-500">
            <p>&copy; 2024 傑作 (Kessaku). All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default function ScriptDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        読み込み中...
      </div>
    }>
      <ScriptDetailContent />
    </Suspense>
  );
}