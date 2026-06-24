// 台本のライセンス情報から、表示すべきアイコンの種類・色・ラベルを判定する共通ヘルパー
// scripts テーブルの nonprofit_fee / commercial_fee / performance_allowed を見て判定する

export type LicenseBadge = {
    key: 'forbidden' | 'commercial_free' | 'nonprofit_free' | 'paid';
    label: string;
    color: string;      // テキスト色（Tailwindクラス）
    bgColor: string;    // 背景色（Tailwindクラス）
    borderColor: string;
    icon: string;        // material-symbols-outlined のアイコン名
  };
  
  export function getLicenseBadge(script: {
    performance_allowed?: boolean | null;
    nonprofit_fee?: string | null;
    commercial_fee?: string | null;
  }): LicenseBadge {
    // 1. 上演不可が最優先（赤）
    if (script.performance_allowed === false) {
      return {
        key: 'forbidden',
        label: '上演不可',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: 'block',
      };
    }
  
    // 2. 営利上演も無料（緑）
    if (script.commercial_fee === 'free') {
      return {
        key: 'commercial_free',
        label: '営利上演も無料',
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        icon: 'celebration',
      };
    }
  
    // 3. 非営利のみ無料（青）
    if (script.nonprofit_fee === 'free') {
      return {
        key: 'nonprofit_free',
        label: '非営利上演は無料',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: 'school',
      };
    }
  
    // 4. それ以外（有料・要相談を含む）はオレンジ
    return {
      key: 'paid',
      label: '上演には許諾・料金が必要',
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      icon: 'payments',
    };
  }
  
  // 料金の値（'free' / 'paid' / 'negotiable'）を日本語ラベルに変換
  export function feeLabel(fee: string | null | undefined): string {
    if (fee === 'free') return '無料';
    if (fee === 'negotiable') return '要相談';
    return '有料';
  }