"use client";

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

function PostScriptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scriptId = searchParams.get('id');

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('青春・学園');
  const [synopsis, setSynopsis] = useState('');
  const [time, setTime] = useState('');
  const [cast, setCast] = useState('');
  const [characters, setCharacters] = useState<{ name: string; description: string }[]>([]);

  // ライセンス関連
  const [nonprofitFee, setNonprofitFee] = useState('free'); // 'free' | 'paid' | 'negotiable'
  const [commercialFee, setCommercialFee] = useState('paid');
  const [performanceAllowed, setPerformanceAllowed] = useState(true);
  const [modificationAllowed, setModificationAllowed] = useState(false);
  const [adaptationAllowed, setAdaptationAllowed] = useState(false);

  // 翻案関連
  const [isAdaptation, setIsAdaptation] = useState(false);
  const [originalScriptId, setOriginalScriptId] = useState<number | null>(null);
  const [originalSearchKeyword, setOriginalSearchKeyword] = useState('');
  const [originalSearchResults, setOriginalSearchResults] = useState<any[]>([]);
  const [selectedOriginalScript, setSelectedOriginalScript] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [showMetaForm, setShowMetaForm] = useState(false); // あらすじ等の入力パネルの開閉
  
  const editorRef = useRef<HTMLDivElement>(null);

  // ★ 戻る（Undo）機能のための履歴ステート
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ログイン・権限チェックと初期データ読み込み
  useEffect(() => {
    const initializePage = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        alert('台本を執筆・編集するにはログインが必要です。');
        router.push('/login');
        return;
      }
      
      setUser(user);

      if (scriptId) {
        const { data: script, error: scriptError } = await supabase
          .from('scripts')
          .select('*')
          .eq('id', scriptId)
          .single();

        if (scriptError || !script) {
          alert('台本の取得に失敗したか、存在しません。');
          router.push('/');
          return;
        }

        if (script.user_id !== user.id) {
          alert('この台本を編集する権限がありません。');
          router.push('/');
          return;
        }

        setTitle(script.title);
        setAuthor(script.author);
        setGenre(script.genre || '青春・学園');
        setSynopsis(script.synopsis || '');
        setTime(script.time || '');
        setCast(script.cast || '');
        setCharacters(Array.isArray(script.characters) ? script.characters : []);

        // ライセンス関連の読み込み
        setNonprofitFee(script.nonprofit_fee || 'free');
        setCommercialFee(script.commercial_fee || 'paid');
        setPerformanceAllowed(script.performance_allowed !== false);
        setModificationAllowed(!!script.modification_allowed);
        setAdaptationAllowed(!!script.adaptation_allowed);

        // 翻案元の読み込み
        if (script.original_script_id) {
          setIsAdaptation(true);
          setOriginalScriptId(script.original_script_id);
          const { data: originalScript } = await supabase
            .from('scripts')
            .select('id, title, author')
            .eq('id', script.original_script_id)
            .single();
          if (originalScript) setSelectedOriginalScript(originalScript);
        }

        if (editorRef.current) {
          editorRef.current.innerHTML = script.body;
        }
      }
      
      setPageLoading(false);
    };

    initializePage();
  }, [scriptId, router]);

  // 初回読み込み完了後に、履歴の最初の状態を記録する
  useEffect(() => {
    if (!pageLoading && editorRef.current && historyRef.current.length === 0) {
      historyRef.current = [editorRef.current.innerHTML];
      historyIndexRef.current = 0;
    }
  }, [pageLoading]);

  // ★ 履歴を保存する関数
  // 最適化: innerHTML の読み取り（DOM→文字列化。行数が多いほど重い処理）を
  // doSave の中に移動。これにより、debounce 待機中（連続入力中）は
  // innerHTML を読み取らず、実際にタイマーが発火した瞬間だけ1回読み取る。
  // 以前は呼び出しごとに毎回 innerHTML を読み取っていたため、debounce が
  // 「履歴への保存」しか遅延させておらず、最も重い処理は素通りしていた。
  const saveState = (immediate = false) => {
    const doSave = () => {
      if (!editorRef.current) return;
      const html = editorRef.current.innerHTML;

      const history = historyRef.current;
      const currentIndex = historyIndexRef.current;
      if (currentIndex >= 0 && history[currentIndex] === html) return;
      
      const newHistory = history.slice(0, currentIndex + 1);
      newHistory.push(html);
      if (newHistory.length > 50) newHistory.shift(); // 最大50回分まで記憶
      
      historyRef.current = newHistory;
      historyIndexRef.current = newHistory.length - 1;
    };

    if (immediate) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      doSave();
    } else {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(doSave, 400); // 連続入力中は待機
    }
  };

  // ★ 一つ前に戻る関数
  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      if (editorRef.current) {
        editorRef.current.innerHTML = historyRef.current[historyIndexRef.current];
        focusEndOfElement(editorRef.current);
      }
    }
  };

  // ★ 一つ先に進む関数（Undoの取り消し）
  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      if (editorRef.current) {
        editorRef.current.innerHTML = historyRef.current[historyIndexRef.current];
        focusEndOfElement(editorRef.current);
      }
    }
  };

  // ★ 「場」の区切りをカーソル位置に挿入する
  // class="scene-break" data-scene-title="○○" を持つdivを目印として本文内に埋め込む。
  // 読書ページ（/read）はこの目印を検出して台本をページごとに分割する。
  const handleInsertSceneBreak = () => {
    const sceneTitle = window.prompt('場のタイトルを入力してください（例：第2場、公園、3年後の教室 など）', `第${(editorRef.current?.querySelectorAll('.scene-break').length || 0) + 2}場`);
    if (sceneTitle === null) return; // キャンセル
    const finalTitle = sceneTitle.trim() || '新しい場';

    if (!editorRef.current) return;
    editorRef.current.focus();

    const selection = window.getSelection();
    const breakHtml = `<div class="scene-break" data-scene-title="${finalTitle.replace(/"/g, '&quot;')}" contenteditable="false" style="user-select:none; margin: 2em 0; padding: 0.75em 0; border-top: 2px dashed #d1d5db; border-bottom: 2px dashed #d1d5db; text-align: center; font-weight: bold; color: #6b7280; font-size: 0.85em; letter-spacing: 0.1em;">━━ ${finalTitle} ━━</div><div><br></div>`;

    if (selection && selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const temp = document.createElement('div');
      temp.innerHTML = breakHtml;
      const frag = document.createDocumentFragment();
      let lastNode: ChildNode | null = null;
      while (temp.firstChild) {
        lastNode = temp.firstChild;
        frag.appendChild(temp.firstChild);
      }
      range.insertNode(frag);
      if (lastNode) {
        const newRange = document.createRange();
        newRange.setStartAfter(lastNode);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } else {
      // 選択範囲が取れない場合は末尾に追加
      editorRef.current.innerHTML += breakHtml;
      focusEndOfElement(editorRef.current);
    }
    saveState(true);
  };

  // カーソルを要素の末尾に移動させる関数
  const focusEndOfElement = (element: HTMLElement) => {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  // ★ コピペ時に文字の大きさや色が変わるのを防ぐ（純粋なテキストのみ貼り付け）
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    saveState(true);
  };

  // 文字入力が行われたら履歴を保存
  const handleInput = () => {
    saveState();
  };

  // キー入力はブラウザ標準の挙動に任せる。Ctrl+Z（戻る）/ Ctrl+Y・Ctrl+Shift+Z（進む）だけ独自処理にする
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z';
    const isRedo =
      ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
      ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y');

    if (isUndo) {
      e.preventDefault();
      handleUndo();
      return;
    }
    if (isRedo) {
      e.preventDefault();
      handleRedo();
      return;
    }
    // それ以外のキーはすべて標準のテキスト編集動作のまま
  };

  // ★ 登場人物の操作（追加・削除・編集）
  const handleAddCharacter = () => {
    setCharacters([...characters, { name: '', description: '' }]);
  };

  const handleRemoveCharacter = (index: number) => {
    setCharacters(characters.filter((_, i) => i !== index));
  };

  const handleCharacterChange = (index: number, field: 'name' | 'description', value: string) => {
    const updated = [...characters];
    updated[index] = { ...updated[index], [field]: value };
    setCharacters(updated);
  };

  // 翻案元（原案）となる台本をタイトルで検索する
  const handleSearchOriginal = async () => {
    if (!originalSearchKeyword.trim()) {
      setOriginalSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from('scripts')
      .select('id, title, author')
      .eq('status', 'published')
      .ilike('title', `%${originalSearchKeyword}%`)
      .limit(10);
    setOriginalSearchResults(data || []);
  };

  const handleSelectOriginal = (s: any) => {
    setSelectedOriginalScript(s);
    setOriginalScriptId(s.id);
    setOriginalSearchResults([]);
    setOriginalSearchKeyword('');
  };

  const handleSave = async (isDraft: boolean) => {
    if (!user) {
      alert('ログインセッションが切れました。再ログインしてください。');
      return;
    }

    setIsSubmitting(true);
    const bodyContent = editorRef.current?.innerHTML || '';

    if (!title || !bodyContent || bodyContent === '<br>') {
      alert('タイトルと本文は必須です！');
      setIsSubmitting(false);
      return;
    }

    // 名前が空の登場人物は保存対象から除外する
    const validCharacters = characters.filter((c) => c.name.trim() !== '');

    // 翻案作品の場合、上演料は必ず原作の設定に準拠させる（お金が原作の作者に入るように）
    let finalNonprofitFee = nonprofitFee;
    let finalCommercialFee = commercialFee;
    let finalOriginalScriptId: number | null = null;

    if (isAdaptation) {
      if (!originalScriptId) {
        alert('翻案作品として投稿する場合は、原案となる台本を選択してください。');
        setIsSubmitting(false);
        return;
      }
      const { data: originalScript } = await supabase
        .from('scripts')
        .select('nonprofit_fee, commercial_fee')
        .eq('id', originalScriptId)
        .single();

      if (originalScript) {
        finalNonprofitFee = originalScript.nonprofit_fee;
        finalCommercialFee = originalScript.commercial_fee;
      }
      finalOriginalScriptId = originalScriptId;
    }

    const scriptData = {
      title: title,
      author: author,
      body: bodyContent,
      genre: genre,
      synopsis: synopsis || 'あらすじはまだ入力されていません。',
      time: time || '未設定',
      cast: cast || '未設定',
      characters: validCharacters,
      status: isDraft ? 'draft' : 'published',
      user_id: user.id,
      nonprofit_fee: finalNonprofitFee,
      commercial_fee: finalCommercialFee,
      performance_allowed: performanceAllowed,
      modification_allowed: modificationAllowed,
      adaptation_allowed: adaptationAllowed,
      original_script_id: finalOriginalScriptId,
    };

    let error = null;

    if (scriptId) {
      const { error: updateError } = await supabase
        .from('scripts')
        .update(scriptData)
        .eq('id', scriptId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('scripts')
        .insert([scriptData]);
      error = insertError;
    }

    setIsSubmitting(false);

    if (error) {
      alert('保存に失敗しました: ' + error.message);
    } else {
      alert(scriptId ? '🎉 台本を更新（上書き保存）しました！' : (isDraft ? '📁 下書きとして保存しました！' : '🎉 台本を本番公開しました！'));
      router.push('/');
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-500 font-medium">データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="text-gray-900 bg-gray-100 font-sans antialiased min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 h-16 flex items-center justify-between px-3 md:px-6 shadow-sm gap-2">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <Link href="/" className="text-gray-400 hover:text-black transition flex-shrink-0">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <span className="text-sm font-bold text-gray-300 hidden sm:inline">|</span>
          <span className="text-xs md:text-sm font-medium text-gray-500 truncate hidden sm:inline">
            {scriptId ? '✏️ 台本編集モード' : '✍️ 新規執筆モード'}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 md:gap-4 flex-shrink-0">
          {/* ★ 一つ前に戻る／一つ先に進む ボタン */}
          <button 
            onClick={handleUndo}
            className="text-gray-600 hover:text-black text-xs md:text-sm font-medium px-2 md:px-3 py-2 rounded transition flex items-center gap-1"
            title="一つ前の状態に戻す"
          >
            <span className="material-symbols-outlined text-[18px]">undo</span>
            <span className="hidden md:inline">戻る</span>
          </button>
          <button 
            onClick={handleRedo}
            className="text-gray-600 hover:text-black text-xs md:text-sm font-medium px-2 md:px-3 py-2 rounded transition flex items-center gap-1"
            title="一つ先の状態に進む"
          >
            <span className="material-symbols-outlined text-[18px]">redo</span>
            <span className="hidden md:inline">進む</span>
          </button>
          
          <span className="text-gray-300 hidden sm:inline">|</span>

          <button 
            onClick={() => handleSave(true)}
            disabled={isSubmitting}
            className="bg-white border border-gray-300 text-gray-700 text-xs md:text-sm font-medium px-2.5 md:px-4 py-2 rounded hover:bg-gray-50 transition whitespace-nowrap"
          >
            {scriptId ? '下書きに戻す' : '下書き保存'}
          </button>
          <button 
            onClick={() => handleSave(false)}
            disabled={isSubmitting}
            className={`text-white text-xs md:text-sm font-medium px-3 md:px-5 py-2 rounded transition whitespace-nowrap ${
              isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800'
            }`}
          >
            {isSubmitting ? '保存中...' : (scriptId ? '更新' : '公開する')}
          </button>
        </div>
      </header>

      <main className="flex-grow w-full py-6 md:py-12 px-3 md:px-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto bg-white shadow-md border border-gray-200 rounded-sm p-5 sm:p-8 md:p-20 min-h-[800px] flex flex-col">
          
          <div className="text-center mb-10 md:mb-16 border-b border-gray-200 pb-8 md:pb-12">
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl sm:text-3xl md:text-5xl font-serif font-bold mb-4 md:mb-6 text-black text-center w-full bg-transparent border-none outline-none focus:bg-gray-50 rounded py-2"
              placeholder="台本のタイトル"
            />
            <input 
              type="text" 
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="text-base md:text-lg text-gray-600 text-center w-full bg-transparent border-none outline-none focus:bg-gray-50 p-2 rounded"
              placeholder="作者名を入力"
            />

            {/* 詳細情報（ジャンル・あらすじ・上演時間・配役）の開閉パネル */}
            <div className="mt-6 md:mt-8 text-left">
              <button
                type="button"
                onClick={() => setShowMetaForm(!showMetaForm)}
                className="text-xs md:text-sm text-gray-500 hover:text-black transition flex items-center gap-1 mx-auto text-center"
              >
                <span className="material-symbols-outlined text-[18px] flex-shrink-0">
                  {showMetaForm ? 'expand_less' : 'expand_more'}
                </span>
                <span className="hidden sm:inline">作品情報を入力する（ジャンル・あらすじ・上演時間・配役）</span>
                <span className="sm:hidden">作品情報を入力する</span>
              </button>

              {showMetaForm && (
                <div className="mt-4 md:mt-6 bg-gray-50 border border-gray-200 rounded-md p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 text-left">
                  {/* ジャンル */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">ジャンル</label>
                    <select
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 outline-none focus:border-black transition"
                    >
                      <option value="青春・学園">青春・学園</option>
                      <option value="コメディ">コメディ</option>
                      <option value="シリアス">シリアス</option>
                      <option value="ファンタジー">ファンタジー</option>
                      <option value="サスペンス">サスペンス</option>
                      <option value="ヒューマンドラマ">ヒューマンドラマ</option>
                      <option value="その他">その他</option>
                    </select>
                  </div>

                  {/* 上演時間 */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">上演時間</label>
                    <input
                      type="text"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      placeholder="例：約60分"
                      className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 outline-none focus:border-black transition"
                    />
                  </div>

                  {/* 配役 */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">配役（人数）</label>
                    <input
                      type="text"
                      value={cast}
                      onChange={(e) => setCast(e.target.value)}
                      placeholder="例：男2 / 女3"
                      className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 outline-none focus:border-black transition"
                    />
                  </div>

                  {/* あらすじ */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-2">あらすじ</label>
                    <textarea
                      value={synopsis}
                      onChange={(e) => setSynopsis(e.target.value)}
                      placeholder="作品のあらすじを入力してください"
                      rows={4}
                      className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 outline-none focus:border-black transition resize-none"
                    />
                  </div>

                  {/* 翻案（二次創作）設定 */}
                  <div className="md:col-span-2 border border-gray-200 rounded-md p-4 bg-white">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                      <input
                        type="checkbox"
                        checked={isAdaptation}
                        onChange={(e) => {
                          setIsAdaptation(e.target.checked);
                          if (!e.target.checked) {
                            setOriginalScriptId(null);
                            setSelectedOriginalScript(null);
                          }
                        }}
                        className="w-4 h-4"
                      />
                      この作品は他作品の翻案（二次創作）です
                    </label>

                    {isAdaptation && (
                      <div className="pl-1">
                        {selectedOriginalScript ? (
                          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-3 py-2">
                            <span className="text-sm text-gray-700">
                              原案：<span className="font-bold">{selectedOriginalScript.title}</span>（{selectedOriginalScript.author}）
                            </span>
                            <button
                              type="button"
                              onClick={() => { setSelectedOriginalScript(null); setOriginalScriptId(null); }}
                              className="text-gray-400 hover:text-red-600 transition"
                            >
                              <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={originalSearchKeyword}
                                onChange={(e) => setOriginalSearchKeyword(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchOriginal(); } }}
                                placeholder="原案のタイトルで検索"
                                className="flex-grow bg-white border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-black transition"
                              />
                              <button
                                type="button"
                                onClick={handleSearchOriginal}
                                className="bg-gray-100 hover:bg-gray-200 transition rounded px-3 py-2 text-sm text-gray-700"
                              >
                                検索
                              </button>
                            </div>
                            {originalSearchResults.length > 0 && (
                              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow-md max-h-48 overflow-y-auto">
                                {originalSearchResults.map((s) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => handleSelectOriginal(s)}
                                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition border-b border-gray-100 last:border-0"
                                  >
                                    <span className="font-medium">{s.title}</span>
                                    <span className="text-gray-400 ml-2">{s.author}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          ※ 翻案作品の上演料は、原案の作者の設定にそのまま準拠します（このページでは設定できません）。
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 上演許可・ライセンス設定（翻案作品の場合は非表示） */}
                  {!isAdaptation && (
                    <div className="md:col-span-2 border border-gray-200 rounded-md p-4 bg-white space-y-4">
                      <p className="text-xs font-bold text-gray-500">上演ライセンス設定</p>

                      {/* 上演許可そのもの */}
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={performanceAllowed}
                          onChange={(e) => setPerformanceAllowed(e.target.checked)}
                          className="w-4 h-4"
                        />
                        この台本の上演を許可する
                      </label>

                      {performanceAllowed && (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">非営利上演の料金</label>
                              <select
                                value={nonprofitFee}
                                onChange={(e) => setNonprofitFee(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-black transition"
                              >
                                <option value="free">無料</option>
                                <option value="paid">有料</option>
                                <option value="negotiable">要相談</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">営利上演の料金</label>
                              <select
                                value={commercialFee}
                                onChange={(e) => setCommercialFee(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-black transition"
                              >
                                <option value="free">無料</option>
                                <option value="paid">有料</option>
                                <option value="negotiable">要相談</option>
                              </select>
                            </div>
                          </div>

                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={modificationAllowed}
                              onChange={(e) => setModificationAllowed(e.target.checked)}
                              className="w-4 h-4"
                            />
                            セリフ等の改変を許可する
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={adaptationAllowed}
                              onChange={(e) => setAdaptationAllowed(e.target.checked)}
                              className="w-4 h-4"
                            />
                            翻案（二次創作）を許可する
                          </label>
                        </>
                      )}
                    </div>
                  )}

                  {/* 登場人物 */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-gray-500">登場人物</label>
                      <button
                        type="button"
                        onClick={handleAddCharacter}
                        className="text-xs font-medium text-gray-600 hover:text-black transition flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span> 人物を追加
                      </button>
                    </div>

                    {characters.length === 0 ? (
                      <p className="text-xs text-gray-400">まだ登場人物が登録されていません。「人物を追加」から登録できます。</p>
                    ) : (
                      <div className="space-y-3">
                        {characters.map((char, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row gap-2 sm:items-start bg-white border border-gray-200 rounded-md p-3">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={char.name}
                                onChange={(e) => handleCharacterChange(idx, 'name', e.target.value)}
                                placeholder="名前"
                                className="w-full sm:w-24 bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-black transition"
                              />
                              {/* スマホ表示時はここに削除ボタンを並べる */}
                              <button
                                type="button"
                                onClick={() => handleRemoveCharacter(idx)}
                                className="sm:hidden text-gray-400 hover:text-red-600 transition p-1.5 flex-shrink-0"
                                title="この人物を削除"
                              >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                              </button>
                            </div>
                            <input
                              type="text"
                              value={char.description}
                              onChange={(e) => handleCharacterChange(idx, 'description', e.target.value)}
                              placeholder="説明（例：高校2年生。演劇部の副部長。）"
                              className="flex-grow bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-black transition w-full"
                            />
                            {/* PC表示時はここに削除ボタン */}
                            <button
                              type="button"
                              onClick={() => handleRemoveCharacter(idx)}
                              className="hidden sm:block text-gray-400 hover:text-red-600 transition p-1.5 flex-shrink-0"
                              title="この人物を削除"
                            >
                              <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 場の区切りは下部の固定ボタンから挿入できます */}

          <div 
            ref={editorRef}
            contentEditable={true} 
            suppressContentEditableWarning={true}
            onPaste={handlePaste}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            style={{
              lineHeight: '1.8',
            }}
            className="text-gray-800 text-base md:text-lg outline-none flex-grow min-h-[400px] md:min-h-[500px] text-left font-sans empty:before:content-['ここから台本を書き始めましょう...'] empty:before:text-gray-300"
          >
            {!scriptId && <br />}
          </div>

        </div>
      </main>

      {/* 場の区切りを挿入する固定ボタン（スクロールしても常に押せる） */}
      <button
        type="button"
        onClick={handleInsertSceneBreak}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '16px',
          zIndex: 9999,
        }}
        className="bg-black text-white rounded-full shadow-lg hover:bg-gray-800 transition flex items-center gap-2 px-4 py-3 md:px-5 md:py-3.5"
        title="カーソル位置に「場」の区切りを挿入します"
      >
        <span className="material-symbols-outlined text-[20px]">bookmark_add</span>
        <span className="text-sm font-medium hidden sm:inline">場の区切りを挿入</span>
      </button>
    </div>
  );
}

export default function PostScriptPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-500 font-medium">読み込み中...</p>
      </div>
    }>
      <PostScriptContent />
    </Suspense>
  );
}