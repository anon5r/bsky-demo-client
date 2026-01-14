# Bluesky Client Demo App

このプロジェクトは、Bluesky の OAuth ログインと Chronosky (スケジュール投稿サービス) の API 連携を実演するデモアプリケーションです。

## 特徴

- **Bluesky OAuth ログイン**: `@atproto/oauth-client-browser` を使用したセキュアな認証
- **プロフィール表示**: ログインユーザーのプロフィール情報を表示
- **タイムライン表示**: 自身の最新の投稿を取得・表示
- **即時投稿**: Bluesky への直接投稿（単一投稿およびスレッド投稿をサポート）
- **投稿削除**: 既存の投稿を削除
- **スケジュール投稿**: Chronosky API を使用した日時指定の投稿（単一投稿のみ）

## 技術スタック

- **Frontend**: React 19, TypeScript, Vite
- **Libraries**:
    - `@atproto/api`: Bluesky/AT Protocol 操作
    - `@atproto/oauth-client-browser`: OAuth 認証と DPoP による認証済みリクエスト
    - `jose`: DPoP 関連のユーティリティ
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

```
bsky-client-demo/
├── src/
│   ├── lib/
│   │   ├── bluesky-oauth.ts          # Bluesky OAuth クライアント
│   │   ├── chronosky-xrpc-client.ts  # Chronosky API 呼び出し
│   │   └── dpop.ts                    # DPoP 関連ユーティリティ
│   ├── components/
│   │   ├── LoginView.tsx              # ログイン画面
│   │   ├── OAuthCallback.tsx          # OAuth コールバック処理
│   │   ├── PostForm.tsx               # 投稿フォーム（即時 & スケジュール）
│   │   └── PostList.tsx               # タイムライン表示と削除機能
│   ├── App.tsx                        # メインアプリケーション
│   └── main.tsx                       # エントリーポイント
├── scripts/
│   └── generate-client-metadata.mjs   # OAuth メタデータ生成
├── public/
│   └── .well-known/
│       └── client-metadata.json       # OAuth クライアントメタデータ（自動生成）
└── vercel.json                        # Vercel デプロイ設定
```

## アーキテクチャ

このアプリケーションは、Bluesky OAuth を使用してログインし、取得したセッションの認証済み `fetchHandler` を使って Chronosky API にアクセスします。

1. **Bluesky OAuth ログイン**: ユーザーが自分の Bluesky アカウントでログイン
2. **セッション取得**: `@atproto/oauth-client-browser` が DPoP 付きのセッションを管理
3. **Chronosky API アクセス**: セッションの `fetchHandler` を使って Chronosky API にリクエスト（DPoP と Access Token は自動的に付与される）