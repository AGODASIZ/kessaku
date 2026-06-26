"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [myScripts, setMyScripts] = useState<any[]>([]);
  const [favoriteScripts, setFavoriteScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'mine' | 'favorites'>('mine');

  // カスタム削除確認モーダル用のstate（window.confirm はスマホ環境で動作しないことがあるため）
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchMyData() {
      // 1. ログイン確認
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        alert('ログインが必要です。');
        router.push('/login');
        return;
      }
      setUser(user);

      // 2. 自分の投稿した台本（公開・下書き）をすべて取得
      const { data: scripts, error: scriptsError } = await supabase
        .from('scripts')
        .select('*')
        .eq('user_id', user.id) // 自分のIDと一致するものだけ！
        .order('id', { ascending: false });

      if (!scriptsError && scripts) {
        setMyScripts(scripts);
      }

      // 3. 自分がいいねした台本一覧を取得
      const { data: likes, error: likesError } = await supabase
        .from('likes')
        .select('script_id, scripts(*)')
        .eq('user_id', user.id)
        .order('id', { ascending: false });

      if (!likesError && likes) {
        // likes.scripts に台本本体がネストされて返ってくる
        const favScripts = likes
          .map((l: any) => l.scripts)
          .filter((s: any) => s !== null);

        // お気に入りした台本それぞれについて、最新の承認済み上演報告を取得
        if (favScripts.length > 0) {
          const scriptIds = favScripts.map((s: any) => s.id);
          const { data: reports } = await supabase
            .from('performance_reports')
            .select('*')
            .in('script_id', scriptIds)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

          // 台本ごとに最新の1件だけを紐づける
          const latestReportMap: Record<number, any> = {};
          (reports || []).forEach((r: any) => {
            if (!latestReportMap[r.script_id]) {
              latestReportMap[r.script_id] = r;
            }
          });

          const favScriptsWithReport = favScripts.map((s: any) => ({
            ...s,
            latestReport: latestReportMap[s.id] || null,
          }));
          setFavoriteScripts(favScriptsWithReport);
        } else {
          setFavoriteScripts([]);
        }
      }

      setLoading(false);
    }
    fetchMyData();
  }, [router]);

  // お気に入り（いいね）の取り消し処理
  const handleUnlike = async (scriptId: number) => {
    if (!user) return;
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('script_id', scriptId)
      .eq('user_id', user.id);

    if (!error) {
      setFavoriteScripts((prev) => prev.filter((s) => s.id !== scriptId));
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      alert('ログアウトしました。');
      router.push('/');
    }
  };

  // 台本の削除処理
  // 削除ボタンを押したとき：確認モーダルを開くだけ（実際の削除はまだ行わない）
  const handleDelete = (scriptId: number, scriptTitle: string) => {
    setDeleteTarget({ id: scriptId, title: scriptTitle });
  };

  // モーダルの「削除する」を押したときに実際にSupabaseへ削除を実行する
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from('scripts')
      .delete()
      .eq('id', deleteTarget.id);

    setDeleting(false);

    if (error) {
      alert('削除に失敗しました: ' + error.message);
      return;
    }

    // 画面上のリストからも即座に取り除く
    setMyScripts((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased text-gray-900">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-black transition flex items-center">
              <span className="material-symbols-outlined">home</span>
            </Link>
            <span className="text-sm font-bold text-gray-300">|</span>
            <span className="text-sm font-medium text-gray-700">マイページ</span>
          </div>
          
          <button 
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-800 font-medium transition flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        
        {/* ユーザー情報セクション */}
        <div className="bg-white p-8 rounded-md border border-gray-200 mb-10 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
            <span className="material-symbols-outlined text-3xl">person</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">マイアカウント</h1>
            <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
          </div>
        </div>

        {/* タブ切り替え */}
        <div className="flex items-center gap-6 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('mine')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'mine'
                ? 'border-black text-black'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">library_books</span>
            自分の投稿した台本
            <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{myScripts.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'favorites'
                ? 'border-black text-black'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">favorite</span>
            お気に入り
            <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{favoriteScripts.length}</span>
          </button>
        </div>

        {/* 自分の台本一覧セクション */}
        {activeTab === 'mine' && (
          <div>
            <div className="flex justify-end mb-4">
              <Link href="/post" className="bg-black text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-800 transition flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">add</span> 新しく書く
              </Link>
            </div>

            {myScripts.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-md border border-gray-200 text-gray-500">
                まだ投稿された台本がありません。<br/>
                上のボタンから新しい作品を書き始めましょう！
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {myScripts.map((script) => (
                  <div key={script.id} className="bg-white p-6 rounded-md border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-gray-300 transition">
                    
                    {/* 台本の情報 */}
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-serif font-bold text-black">{script.title}</h3>
                        {/* ステータスバッジ */}
                        {script.status === 'draft' ? (
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-medium">下書き</span>
                        ) : (
                          <span className="bg-blue-50 text-blue-600 border border-blue-200 text-xs px-2 py-1 rounded font-medium">公開中</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">作者: {script.author}</p>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex items-center gap-3 md:w-auto w-full border-t border-gray-100 md:border-t-0 pt-4 md:pt-0">
                      <Link 
                        href={`/script?id=${script.id}`} 
                        className="bg-gray-50 text-gray-600 text-sm font-medium px-3 py-2 rounded hover:bg-gray-100 transition flex items-center gap-1 flex-shrink-0"
                        title="台本詳細を見る"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </Link>
                      <Link 
                        href={`/post?id=${script.id}`} 
                        className="bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded hover:bg-gray-200 transition flex items-center gap-1 flex-grow justify-center"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span> 編集する
                      </Link>
                      <button
                        onClick={() => handleDelete(script.id, script.title)}
                        className="bg-white border border-red-200 text-red-600 text-sm font-medium px-4 py-2 rounded hover:bg-red-50 transition flex items-center gap-1 flex-grow justify-center"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span> 削除
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* お気に入り一覧セクション */}
        {activeTab === 'favorites' && (
          <div>
            {favoriteScripts.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-md border border-gray-200 text-gray-500">
                まだお気に入りに登録した台本がありません。<br/>
                <Link href="/search" className="text-black underline underline-offset-4 font-medium">台本を探す</Link>
                から、気になる作品にハートをつけてみましょう。
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {favoriteScripts.map((script) => (
                  <div key={script.id} className="bg-white p-6 rounded-md border border-gray-200 shadow-sm hover:border-gray-300 transition">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-grow">
                        <h3 className="text-lg font-serif font-bold text-black mb-2">{script.title}</h3>
                        <p className="text-sm text-gray-500">作者: {script.author}</p>
                      </div>

                      <div className="flex items-center gap-3 md:w-auto w-full border-t border-gray-100 md:border-t-0 pt-4 md:pt-0">
                        <Link 
                          href={`/script?id=${script.id}`} 
                          className="bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded hover:bg-gray-200 transition flex items-center gap-1 flex-grow justify-center"
                        >
                          <span className="material-symbols-outlined text-[18px]">menu_book</span> 詳細を見る
                        </Link>
                        <button
                          onClick={() => handleUnlike(script.id)}
                          className="bg-white border border-red-200 text-red-600 text-sm font-medium px-4 py-2 rounded hover:bg-red-50 transition flex items-center gap-1 flex-shrink-0"
                          title="お気に入りを解除"
                        >
                          <span className="material-symbols-outlined text-[18px]">favorite</span>
                        </button>
                      </div>
                    </div>

                    {/* 上演報告（宣伝）バナー：このお気に入り台本に承認済みの上演報告がある場合に目立たせる */}
                    {script.latestReport && (
                      <Link
                        href={`/script?id=${script.id}`}
                        className="mt-4 block bg-black text-white rounded-md px-4 py-3 hover:bg-gray-800 transition flex items-center gap-3"
                      >
                        <span className="material-symbols-outlined text-amber-300 flex-shrink-0">campaign</span>
                        <span className="text-sm font-bold truncate">
                          上演報告：{script.latestReport.group_name}
                          {script.latestReport.performance_date && ` （${script.latestReport.performance_date}）`}
                        </span>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* 削除確認モーダル（window.confirm はスマホで動作しないことがあるため自前で実装） */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] px-4"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-red-600 mb-3">
              <span className="material-symbols-outlined">warning</span>
              <h3 className="font-bold text-lg">台本を削除しますか？</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              「<span className="font-bold">{deleteTarget.title}</span>」を削除します。この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2.5 rounded hover:bg-gray-200 transition disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white text-sm font-medium px-4 py-2.5 rounded hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}