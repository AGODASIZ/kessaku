"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  
  const [isSignUp, setIsSignUp] = useState(false); // ログインと新規登録の切り替え
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('メールアドレスとパスワードを入力してください。');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // 【新規登録（サインアップ）の処理】
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        // Supabaseの設定によってはメール確認が必要な場合がありますが、
        // セッションが即時有効になっている場合はそのままトップへ遷移
        if (data?.session) {
          alert('アカウントを作成し、ログインしました！');
          router.push('/');
        } else {
          alert('確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。');
        }

      } else {
        // 【ログイン（サインイン）の処理】
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        alert('ログインに成功しました！');
        router.push('/'); // トップページへリダイレクト
      }
    } catch (error: any) {
      // エラーメッセージを分かりやすい日本語に翻訳・変換
      let msg = error.message;
      if (msg === 'Invalid login credentials') {
        msg = 'メールアドレスまたはパスワードが正しくありません。';
      } else if (msg === 'User already registered') {
        msg = 'このメールアドレスは既に登録されています。';
      } else if (msg === 'Password should be at least 6 characters') {
        msg = 'パスワードは6文字以上で入力してください。';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased text-gray-900">
      
      {/* ロゴ・ヘッダー部分 */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block font-serif text-4xl font-bold tracking-wider mb-4">
          傑作
        </Link>
        <h2 className="text-xl font-bold text-gray-700 tracking-tight">
          {isSignUp ? '新しくアカウントを作成' : 'アカウントにログイン'}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          台本を書き始めるには認証が必要です
        </p>
      </div>

      {/* フォームコンテナ */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md border border-gray-200 rounded-sm sm:px-10">
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* エラーメッセージ表示 */}
            {errorMessage && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-sm">
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}

            {/* メールアドレス入力 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-gray-50 focus:bg-white transition"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* パスワード入力 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-gray-50 focus:bg-white transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* 送信ボタン */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-sm shadow-sm text-sm font-medium text-white transition ${
                  loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black'
                }`}
              >
                {loading ? '処理中...' : (isSignUp ? 'アカウントを作成する' : 'ログイン')}
              </button>
            </div>
          </form>

          {/* モード切り替えリンク */}
          <div className="mt-6 text-center border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMessage('');
              }}
              className="text-sm font-medium text-gray-600 hover:text-black transition underline underline-offset-4"
            >
              {isSignUp ? 'すでにアカウントをお持ちですか？ ログイン' : '新しくアカウントを作る（新規登録）'}
            </button>
          </div>

        </div>
        
        {/* キャンセル（戻る） */}
        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            トップページに戻る
          </Link>
        </div>
      </div>

    </div>
  );
}