"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { checkIsAdmin } from '../../../lib/adminUtils';

export default function HeroImagesAdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [images, setImages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
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
      await fetchImages();
      setChecking(false);
    }
    init();
  }, [router]);

  const fetchImages = async () => {
    const { data } = await supabase
      .from('hero_images')
      .select('*')
      .order('display_order', { ascending: true });
    setImages(data || []);
  };

  // 画像をSupabase Storageにアップロードし、URLをhero_imagesテーブルに登録する
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('hero-images')
      .upload(fileName, file);

    if (uploadError) {
      alert('アップロードに失敗しました: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('hero-images')
      .getPublicUrl(fileName);

    const nextOrder = images.length > 0 ? Math.max(...images.map((i) => i.display_order)) + 1 : 0;

    const { error: insertError } = await supabase
      .from('hero_images')
      .insert({
        image_url: publicUrlData.publicUrl,
        display_order: nextOrder,
        is_active: true,
      });

    setUploading(false);

    if (insertError) {
      alert('画像の登録に失敗しました: ' + insertError.message);
      return;
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    await fetchImages();
  };

  const handleToggleActive = async (id: number, currentValue: boolean) => {
    await supabase.from('hero_images').update({ is_active: !currentValue }).eq('id', id);
    await fetchImages();
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm('この画像を削除します。よろしいですか？');
    if (!confirmed) return;
    await supabase.from('hero_images').delete().eq('id', id);
    await fetchImages();
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const a = images[index];
    const b = images[targetIndex];

    await supabase.from('hero_images').update({ display_order: b.display_order }).eq('id', a.id);
    await supabase.from('hero_images').update({ display_order: a.display_order }).eq('id', b.id);

    await fetchImages();
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
        <h1 className="text-2xl font-serif font-bold mb-2">トップ画像（スライドショー）管理</h1>
        <p className="text-sm text-gray-500 mb-8">
          3:2の横長画像を推奨します。複数枚登録すると、トップページで数秒ごとに自動切り替わります。
        </p>

        {/* アップロード */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <label className="block">
            <span className="text-sm font-bold text-gray-700 block mb-2">新しい画像を追加</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="block w-full text-sm text-gray-600"
            />
          </label>
          {uploading && <p className="text-sm text-gray-400 mt-2">アップロード中...</p>}
        </div>

        {/* 一覧 */}
        {images.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">まだ画像が登録されていません。</p>
        ) : (
          <div className="space-y-3">
            {images.map((img, idx) => (
              <div key={img.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
                <img src={img.image_url} alt="" className="w-24 aspect-[3/2] object-cover rounded flex-shrink-0" />
                <div className="flex-grow min-w-0">
                  <p className={`text-sm font-medium ${img.is_active ? 'text-gray-800' : 'text-gray-400'}`}>
                    {img.is_active ? '表示中' : '非表示'}
                  </p>
                  <p className="text-xs text-gray-400">順番：{idx + 1}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleMove(idx, -1)}
                    disabled={idx === 0}
                    className="p-1.5 text-gray-400 hover:text-black transition disabled:opacity-30"
                    title="上に移動"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                  </button>
                  <button
                    onClick={() => handleMove(idx, 1)}
                    disabled={idx === images.length - 1}
                    className="p-1.5 text-gray-400 hover:text-black transition disabled:opacity-30"
                    title="下に移動"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                  </button>
                  <button
                    onClick={() => handleToggleActive(img.id, img.is_active)}
                    className="p-1.5 text-gray-400 hover:text-black transition"
                    title={img.is_active ? '非表示にする' : '表示する'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {img.is_active ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(img.id)}
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