"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { checkIsAdmin } from '../../../lib/adminUtils';

export default function AnnouncementBannersAdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [banners, setBanners] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function init() {
      const { isAdmin, user } = await checkIsAdmin();
      if (!user) {
        router.push('/login');
        return;
      }
      if (!isAdmin) {
        setChecking(false);
        return;
      }
      setIsAdmin(true);
      await fetchBanners();
      setChecking(false);
    }
    init();
  }, [router]);

  const fetchBanners = async () => {
    const { data } = await supabase
      .from('announcement_banners')
      .select('*')
      .order('display_order', { ascending: true });
    setBanners(data || []);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (banners.length >= 3) {
      alert('お知らせバナーは最大3枚までです。新しく追加する場合は、既存のものを削除してください。');
      return;
    }

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('announcement-banners')
      .upload(fileName, file);

    if (uploadError) {
      alert('アップロードに失敗しました: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('announcement-banners')
      .getPublicUrl(fileName);

    const nextOrder = banners.length > 0 ? Math.max(...banners.map((b) => b.display_order)) + 1 : 0;

    const { error: insertError } = await supabase
      .from('announcement_banners')
      .insert({
        image_url: publicUrlData.publicUrl,
        link_url: linkUrlInput.trim() || null,
        display_order: nextOrder,
        is_active: true,
      });

    setUploading(false);

    if (insertError) {
      alert('バナーの登録に失敗しました: ' + insertError.message);
      return;
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    setLinkUrlInput('');
    await fetchBanners();
  };

  const handleUpdateLink = async (id: number, newUrl: string) => {
    await supabase.from('announcement_banners').update({ link_url: newUrl || null }).eq('id', id);
    await fetchBanners();
  };

  const handleToggleActive = async (id: number, currentValue: boolean) => {
    await supabase.from('announcement_banners').update({ is_active: !currentValue }).eq('id', id);
    await fetchBanners();
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm('このバナーを削除します。よろしいですか？');
    if (!confirmed) return;
    await supabase.from('announcement_banners').delete().eq('id', id);
    await fetchBanners();
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500 gap-4">
        <span className="material-symbols-outlined text-4xl text-gray-300">lock</span>
        <p>このページは管理者のみアクセスできます。</p>
        <Link href="/" className="text-sm font-medium text-black underline underline-offset-4">トップページへ戻る</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 font-sans antialiased">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-black transition flex items-center gap-1 text-sm">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            トップへ戻る
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-serif font-bold mb-2">お知らせバナー管理</h1>
        <p className="text-sm text-gray-500 mb-8">
          3:1の横長画像を推奨します。トップページ上部に最大3枚まで並べて表示されます。
        </p>

        {/* アップロード */}
        {banners.length < 3 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 space-y-3">
            <div>
              <span className="text-sm font-bold text-gray-700 block mb-2">リンク先URL（任意。内部パスなら "/search" のように、外部サイトなら "https://..." のように入力）</span>
              <input
                type="text"
                value={linkUrlInput}
                onChange={(e) => setLinkUrlInput(e.target.value)}
                placeholder="/search または https://example.com"
                className="w-full bg-gray-50 border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-black transition"
              />
            </div>
            <label className="block">
              <span className="text-sm font-bold text-gray-700 block mb-2">画像を選択してアップロード</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
                className="block w-full text-sm text-gray-600"
              />
            </label>
            {uploading && <p className="text-sm text-gray-400">アップロード中...</p>}
          </div>
        )}

        {/* 一覧 */}
        {banners.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">まだバナーが登録されていません。</p>
        ) : (
          <div className="space-y-3">
            {banners.map((banner) => (
              <div key={banner.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
                <img src={banner.image_url} alt="" className="w-32 aspect-[3/1] object-cover rounded flex-shrink-0" />
                <div className="flex-grow min-w-0">
                  <input
                    type="text"
                    defaultValue={banner.link_url || ''}
                    onBlur={(e) => handleUpdateLink(banner.id, e.target.value)}
                    placeholder="リンク先URL（未設定）"
                    className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-black transition"
                  />
                  <p className={`text-xs mt-1 ${banner.is_active ? 'text-gray-500' : 'text-gray-300'}`}>
                    {banner.is_active ? '表示中' : '非表示'}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(banner.id, banner.is_active)}
                    className="p-1.5 text-gray-400 hover:text-black transition"
                    title={banner.is_active ? '非表示にする' : '表示する'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {banner.is_active ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition"
                    title="削除"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}