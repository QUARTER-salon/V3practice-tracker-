# 美容師練習管理 Web アプリケーション
— Practice & Inventory Manager for Hair-Salon Assistants —

Google Apps Script（GAS）と Bootstrap 4 で構築した、美容師（主にアシスタント）の**練習記録**と**ウィッグ在庫**を一元管理する Web アプリです。

---

## 目次

1.  🎯 目的と背景
2.  🗂 プロジェクト構成
3.  ⚙️ 開発環境
4.  📊 スプレッドシートの準備
5.  🚀 デプロイ手順
6.  🏗 開発フロー & ブランチ戦略
7.  🔒 セキュリティ指針
8.  💼 機能要件
9.  📱 使用方法
10. 🐞 既知の課題 & ロードマップ
11. 🤝 貢献方法
12. 🛠 技術スタック

---

## 1. 🎯 目的と背景

現在Googleフォームを利用して複数店舗（4店舗）のアシスタントの練習記録を管理していますが、入力の手間、機能的な制約、集計・分析の準備負荷といった課題があります。

本アプリは、以下の実現により、練習記録管理の効率化と利便性向上を目指します：

-   **記録業務の効率化**: Google フォーム運用で発生する入力負荷とデータ前処理を解消
    - ログイン機能による記録者特定と、名前・店舗などの自動入力
    - スタッフマスター情報との連携
    - 店舗、役職、技術カテゴリーに応じた入力項目の動的表示
-   **在庫最適化**: 店舗別ウィッグ在庫をリアルタイムに可視化し欠品／過剰を抑制
    - ウィッグ在庫の簡易管理機能
-   **データ活用**: 練習内容・回数・評価を蓄積し、育成計画や発注計画に活かす
    - スマートフォンからの入力操作性向上
    - 保守性・拡張性を考慮したデータ形式での記録収集

---

## 2. 🗂 プロジェクト構成

```text
src/
├── backend/                # Google Apps Script (V8)
│   ├── Code.js             # エントリポイント / 定数
│   ├── Auth.js             # 認証 & セッション
│   ├── Record.js           # 練習記録 CRUD
│   ├── Inventory.js        # 在庫管理 CRUD
│   ├── Admin.js            # マスター管理 CRUD
│   ├── Utils.js            # 共通ユーティリティ
│   └── appsscript.json     # GAS 設定
└── frontend/
    ├── html/               # HTML テンプレート
    │   ├── index.html
    │   ├── login.html
    │   ├── record.html
    │   ├── admin-master.html
    │   └── admin-inventory.html
    ├── css/
    │   └── styles.css      # カスタムスタイル
    └── js/                 # クライアント JS (ES modules)
        ├── common.js
        ├── login.js
        ├── record.js
        ├── admin-master.js
        └── admin-inventory.js
```

## 3. ⚙️ 開発環境

| ツール | バージョン | 備考 |
| :--- | :--- | :--- |
| Node.js | ≥ 18 | clasp 動作用 |
| @google/clasp | ^ 2.4 | GAS CLI |
| Git | ≥ 2.30 | GitHub 連携 |
| Google Apps Script | V8 | ランタイム |
| Jest | ^ 30 (dev) | ユニットテスト |
| Vitest | ^ 2 (dev) | フロントエンドテスト |

セットアップ手順

```bash
# 1. リポジトリ取得
git clone https://github.com/QUARTER-salon/V3practice-tracker-.git
cd V3practice-tracker-

# 2. 依存パッケージ
npm install

# 3. GAS プロジェクトをクローン
mkdir -p src/backend
clasp clone ${SCRIPT_ID} --rootDir ./src/backend
```

## 4. 📊 スプレッドシートの準備

アプリケーションはSpreadsheetをデータベースとして使用します。以下のシートが必要です:

- スタッフマスター (`STAFF_MASTER_SHEET_NAME`)
- 練習記録 (`PRACTICE_RECORD_SHEET_NAME`)
- ウィッグ在庫 (`INVENTORY_SHEET_NAME`)
- 店舗マスター (`STORE_MASTER_SHEET_NAME`)
- 役職マスター (`ROLE_MASTER_SHEET_NAME`)
- トレーナーマスター (`TRAINER_MASTER_SHEET_NAME`)
- 技術カテゴリーマスター (`TECH_CATEGORY_SHEET_NAME`)
- 詳細技術項目マスター (`TECH_DETAIL_SHEET_NAME`)

注意：本アプリはスタッフマスターシートが既に存在することを前提としています。初回実行時に他の必要なシートは自動的に作成されます。

## 5. 🚀 デプロイ手順

```bash
# 1. 開発 → GAS へ push
npm run push          # clasp push

# 2. Web アプリとして新規デプロイ
npm run deploy        # clasp deploy --type web --description "v1.x"

# 3. 更新時
npm run deploy:update
```

重要: appsscript.json

```json
{
  "webapp": {
    "access": "ANYONE_WITH_GOOGLE_ACCOUNT",
    "executeAs": "USER_ACCESSING"
  }
}
```

## 6. 🏗 開発フロー & ブランチ戦略

```text
main          安定版 (マージ＝本番反映)
feature/*     新機能
fix/*         バグ修正
hotfix/*      本番緊急修正
```

- git pull origin main で最新同期

- git checkout -b feature/◯◯ でブランチ作成

- 実装 → npm run push で GAS 上で動作確認

- git add . && git commit -m "feat: ◯◯"

- git push origin feature/◯◯ → PR → Code Review

- main マージ後、npm run deploy:update

## 7. 🔒 セキュリティ指針

| 項目 | 採用ポリシー |
| :--- | :--- |
| 認証 | Google アカウント / 社員番号+パスワード (SHA-256 + ソルト) |
| セッション | CacheService + Script Properties + JWT Cookie (リフレッシュ) |
| アクセス制御 | isUserAdmin() が毎回スタッフマスターを確認 |
| CSRF | X-GAS-CSRF ワンタイムトークン |
| OAuth スコープ | spreadsheets, userinfo.email のみ (外部リクエスト無効) |
| エラーハンドル | ユーザには汎用メッセージ、Logger に詳細 |

## 8. 💼 機能要件

### 認証機能
- Googleアカウント認証またはID/パスワード認証によるログイン
- ユーザー情報取得とセッション管理
- ログアウト機能
- 管理者権限の判定

### 練習記録機能
- ログインユーザーの店舗、役職、名前を自動表示
- 練習記録入力（トレーナー、日時、技術カテゴリ、詳細技術項目、回数など）
- 選択内容に応じた入力欄の動的制御
- ウィッグ在庫連携

### 管理者機能: マスター管理
- 各種マスターデータ（店舗、役職、トレーナー、技術カテゴリー、詳細技術項目）のCRUD操作
- マスターデータ間の連携（例: 店舗名変更時のトレーナーマスター更新）

### 管理者機能: 在庫管理
- 店舗ごとのウィッグ在庫管理
- 在庫数の手動更新

## 9. 📱 使用方法

1. ユーザーはGoogleアカウント（または社員番号とパスワード）でログイン
2. ログイン後、自動的に自分の情報が表示され、練習記録を入力できる
3. 管理者権限を持つユーザーは管理者機能にアクセス可能:
   - マスターデータ（店舗、役職、トレーナー、技術カテゴリー、詳細技術項目）の管理
   - ウィッグ在庫の管理

## 10. 🐞 既知の課題 & ロードマップ

| フェーズ | 期限 | 内容 |
| :--- | :--- | :--- |
| Phase 1<br>セキュリティ強化 | 2025-05 | Webapp access 制限 / パスワード SHA-256 化 / セッション刷新 |
| Phase 2<br>パフォーマンス & 整合性 | 2025-06 | getRange 列限定化 / LockService 導入 / キャッシュ 5 min |
| Phase 3<br>UI & コード整理 | 2025-07 | CSS 二重タグ解消 / 共通 util 統合 / 自主練評価欄 disable |
| Phase 4<br>環境分離 & スコープ最適化 | 2025-07 | SPREADSHEET_ID を Script Properties 化 / OAuth 最小化 |
| Phase 5<br>国際化 & テスト | 2025-08 | i18n 辞書導入 / Jest & Vitest カバレッジ ≥ 80 % |

## 11. 🤝 貢献方法

- Issue を起票し担当を宣言

- 該当フェーズのブランチを切る (feature/phaseX-◯◯)

- 上記フローに従い PR 作成

- CI でユニットテストをパスさせる（GitHub Actions）

## 12. 🛠 技術スタック

- **バックエンド:** Google Apps Script (JavaScriptベース)
- **フロントエンド:** HTML, CSS, JavaScript (Bootstrapフレームワーク)
- **データベース:** Google スプレッドシート
- **バージョン管理:** Git、GitHub

---

© 2025 QUARTER Salon