# 美容師練習管理Webアプリ

Google Apps Scriptで開発された美容師練習管理ウェブアプリケーションです。このアプリは美容師（主にアシスタント）の練習記録を効率的に管理します。

## 概要

このアプリケーションは、Googleフォームで行っていた美容師の練習記録管理をより効率化するために開発されました。主な機能としてログイン認証、練習内容の記録、ウィッグ在庫の簡易管理などがあります。

## 背景と目的

現在Googleフォームを利用して複数店舗（4店舗）のアシスタントの練習記録を管理していますが、入力の手間、機能的な制約、集計・分析の準備負荷といった課題があります。

本アプリは、以下の実現により、練習記録管理の効率化と利便性向上を目指します：

- ログイン機能による記録者特定と、名前・店舗などの自動入力
- スタッフマスター情報との連携
- 店舗、役職、技術カテゴリーに応じた入力項目の動的表示
- ウィッグ在庫の簡易管理機能
- スマートフォンからの入力操作性向上
- 保守性・拡張性を考慮したデータ形式での記録収集

## ファイル構造

```
src/
├── Code.js               # メインエントリーポイント、定数定義
├── Utils.js              # ユーティリティ関数
├── Auth.js               # 認証機能
├── Record.js             # 練習記録機能
├── Admin.js              # 管理者機能
├── Inventory.js          # 在庫管理
├── appsscript.json       # プロジェクト設定ファイル
└── html/
    ├── index.html        # メインコンテナページ
    ├── login.html        # ログインページ
    ├── record.html       # 練習記録入力画面
    ├── admin-master.html # 管理者マスター管理画面
    ├── admin-inventory.html # 管理者在庫管理画面
    ├── css/
    │   └── styles.css.html # スタイルシート
    └── js/
        ├── common.js.html     # 共通JavaScript関数
        ├── login.js.html      # ログイン処理
        ├── record.js.html     # 練習記録処理
        ├── admin-master.js.html    # マスター管理処理
        └── admin-inventory.js.html # 在庫管理処理
```

## 開発環境のセットアップ

### 前提条件

- [Node.js](https://nodejs.org/)
- [Google Clasp](https://github.com/google/clasp)
- Google アカウント

### 開発環境のセットアップ

1. Claspのインストールとログイン:

```bash
npm install -g @google/clasp
clasp login
```

2. プロジェクトのクローン:

```bash
mkdir -p src
clasp clone [YOUR_SCRIPT_ID] --rootDir ./src
```

3. 依存関係のインストール:

```bash
npm install
```

## 開発作業

### ローカル開発からGASへのプッシュ

```bash
# 変更をプッシュ
clasp push

# または npm スクリプト経由
npm run push
```

### プロジェクトをブラウザで開く

```bash
clasp open
# または
npm run open
```

### デプロイの実行/更新

```bash
# 新規デプロイ
npm run deploy

# 既存デプロイの更新
npm run deploy:update
```

## Google Spreadsheetの準備

アプリケーションはSpreadsheetをデータベースとして使用します。以下のシートが必要です:

- スタッフマスター (`STAFF_MASTER_SHEET_NAME`)
- 練習記録 (`PRACTICE_RECORD_SHEET_NAME`)
- ウィッグ在庫 (`INVENTORY_SHEET_NAME`)
- 店舗マスター (`STORE_MASTER_SHEET_NAME`)
- 役職マスター (`ROLE_MASTER_SHEET_NAME`)
- トレーナーマスター (`TRAINER_MASTER_SHEET_NAME`)
- 技術カテゴリーマスター (`TECH_CATEGORY_SHEET_NAME`)
- 詳細技術項目マスター (`TECH_DETAIL_SHEET_NAME`)

## デプロイ方法

1. `Code.js`の`SPREADSHEET_ID`を実際のスプレッドシートIDに設定します
2. Claspを使ってプロジェクトをプッシュします: `clasp push`
3. ウェブアプリとしてデプロイします: `clasp deploy --type web --description "美容師練習管理アプリ"`

## 使用方法

1. ユーザーはGoogleアカウント（または社員番号とパスワード）でログイン
2. ログイン後、自動的に自分の情報が表示され、練習記録を入力できる
3. 管理者権限を持つユーザーは管理者機能にアクセス可能:
   - マスターデータ（店舗、役職、トレーナー、技術カテゴリー、詳細技術項目）の管理
   - ウィッグ在庫の管理

## 機能要件概要

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

## 注意点

- 本アプリはスタッフマスターシートが既に存在することを前提としています
- 初回実行時に他の必要なシートは自動的に作成されます
- セキュリティを高めるため、本番環境ではパスワード保存方法の強化を検討してください
- Google Apps Scriptの制約（実行時間、API制限など）に注意してください

## 技術スタック

- **バックエンド:** Google Apps Script (JavaScriptベース)
- **フロントエンド:** HTML, CSS, JavaScript (Bootstrapフレームワーク)
- **データベース:** Google スプレッドシート