# Bluesky + Chronosky Demo App

このプロジェクトは、Bluesky の OAuth ログインと、サードパーティサービスである Chronosky (スケジュール投稿) の連携を実演するデモアプリケーションです。

## 特徴

- **Bluesky OAuth ログイン**: `@atproto/oauth-client-browser` を使用したセキュアな認証。
- **タイムライン表示**: 自身の最新の投稿を取得・表示。
- **ポスト投稿 & 削除**: Bluesky への直接投稿と、既存の投稿の削除。
- **Chronosky 連携**: 
    - 代理 OAuth フローを使用したサードパーティ API への認可。
    - DPoP (Demonstrating Proof-of-Possession) を使用した XRPC リクエスト。
    - 日時を指定したスケジュール投稿機能。

## 技術スタック

- **Frontend**: React 19, TypeScript, Vite
- **Libraries**: 
    - `@atproto/api`: Bluesky/AT Protocol 操作
    - `@atproto/oauth-client-browser`: OAuth 認証
    - `jose`: DPoP Proof 生成のための JWT/JWK 操作
- **Deployment**: Vercel (SPA)

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env` ファイルを作成し、アプリの URL を指定します（ローカル開発の場合）。

```bash
VITE_APP_URL=http://localhost:5173
```

### 3. ローカル開発サーバーの起動

```bash
npm run dev
```

このコマンドを実行すると、`scripts/generate-client-metadata.mjs` が走り、`public/.well-known/client-metadata.json` が自動生成されます。

## デプロイ (Vercel)

1. Vercel にプロジェクトをインポートします。
2. 環境変数 `VITE_APP_URL` に、デプロイ後の URL（例: `https://your-app.vercel.app`）を設定します。
3. `vercel.json` が含まれているため、SPA のルーティングと OAuth メタデータ用のヘッダーは自動的に設定されます。

## プロジェクト構造

- `src/lib/`: OAuth および XRPC クライアントのロジック
    - `bluesky-oauth.ts`: Bluesky ログイン用
    - `chronosky-oauth.ts`: Chronosky 認可フロー (Proxy)
    - `chronosky-xrpc-client.ts`: スケジュール投稿 API 呼び出し
    - `dpop.ts`: DPoP Proof 生成ユーティリティ
- `src/components/`: UI コンポーネント
    - `OAuthCallback.tsx`: ログイン後のリダイレクト処理
    - `PostForm.tsx`: 投稿（即時・予約）フォーム
    - `PostList.tsx`: タイムライン表示と削除機能
- `scripts/`: ビルド済みメタデータ生成スクリプト
- `vercel.json`: Vercel 用のデプロイ設定