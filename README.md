# Bluesky Client Demo App

このプロジェクトは、Bluesky の OAuth ログインと Chronosky (スケジュール投稿サービス) の API 連携を実演するデモアプリケーションです。

## 特徴

- **Bluesky OAuth ログイン**: `@atproto/oauth-client-browser` を使用したセキュアな認証（DPoP 対応）
- **タイムライン**: 自身の最新の投稿を取得・表示。いいね、リポスト、リプライ、削除が可能
- **リッチな投稿フォーム**:
    - **即時投稿**: 画像・動画のアップロード、スレッド投稿に対応
    - **スケジュール投稿**: Chronosky API を使用した日時指定の投稿（単一投稿）
    - **高度なエディタ**: Tiptap を使用したメンションやリンクの入力サポート
- **プロフィール**: ユーザー情報の表示、投稿一覧、フォロー/フォロワーリストの閲覧
- **通知**: メンション、いいね、リポストなどの通知をリアルタイムに近い感覚で確認
- **検索**: ユーザーや投稿の検索機能
- **スレッド表示**: 投稿の詳細なリプライツリーを表示
- **レスポンシブデザイン**: デスクトップとモバイルの両方に最適化された UI
- **ダークモード**: ライト/ダークテーマの切り替えに対応

## 技術スタック

- **Frontend**: React 19, TypeScript, Vite (rolldown-vite)
- **Libraries**:
    - `@atproto/api`: Bluesky/AT Protocol 操作
    - `@atproto/oauth-client-browser`: OAuth 認証と DPoP による認証済みリクエスト
    - `@tiptap/react`: リッチテキストエディタ
    - `jose`: DPoP 関連のユーティリティ
- **Deployment**: Vercel (SPA + API Functions)

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. ローカル開発サーバーの起動

```bash
npm run dev
```

このコマンドを実行すると、`scripts/inject-auth-config.mjs` が走り、OAuth メタデータ用の設定が `api/client-metadata.ts` に注入されます。

## デプロイ (Vercel)

1. Vercel にプロジェクトをインポートします。
2. `vercel.json` が含まれているため、SPA のルーティングと OAuth メタデータ用の API Functions は自動的に設定されます。
3. `client_id` はアクセスされたドメイン（Vercel のプレビュー URL を含む）から動的に生成されるため、特別な環境設定なしで OAuth が動作します。

## プロジェクト構造

```
bsky-client-demo/
├── api/
│   ├── client-metadata.ts         # OAuth クライアントメタデータを提供（Vercel Function）
│   └── _shared/
│       └── auth-config.ts         # OAuth スコープなどの共通設定
├── docs/                          # API ドキュメントやガイド
├── public/
│   └── .well-known/               # 静的ファイル用
├── scripts/
│   ├── inject-auth-config.mjs     # ビルド時に OAuth 設定を注入
│   └── test.ts                    # テスト用スクリプト
├── src/
│   ├── lib/
│   │   ├── bluesky-oauth.ts       # Bluesky OAuth クライアント初期化
│   │   ├── chronosky-xrpc-client.ts # Chronosky API 連携
│   │   ├── bluesky-richtext.ts    # リッチテキスト処理
│   │   └── dpop.ts                 # DPoP 関連ユーティリティ
│   ├── components/
│   │   ├── post-form/             # 投稿フォーム関連のサブコンポーネント
│   │   ├── Layout.tsx             # 全体レイアウト（サイドバー、ナビ）
│   │   ├── PostForm.tsx           # 投稿フォーム主コンポーネント
│   │   ├── PostList.tsx           # タイムライン表示
│   │   ├── ProfileView.tsx        # ユーザープロフィール画面
│   │   ├── ThreadView.tsx         # スレッド詳細画面
│   │   └── ...                    # その他 UI コンポーネント
│   ├── App.tsx                    # メインアプリケーション（ルーティング管理）
│   └── main.tsx                   # エントリーポイント
└── vercel.json                    # Vercel デプロイ・ルーティング設定
```

## アーキテクチャ

このアプリケーションは、Bluesky OAuth を使用してログインし、取得したセッションの認証済み `fetchHandler` を使って Bluesky API および Chronosky API にアクセスします。

1. **動的な OAuth メタデータ**: `api/client-metadata.ts` が、リクエスト時のホスト名に基づいて `client_id` や `redirect_uris` を動的に生成します。これにより、ローカル環境、プレビュー環境、本番環境のすべてで同一のコードが動作します。
2. **Bluesky OAuth ログイン**: ユーザーが自分の Bluesky アカウントでログインし、DPoP トークンを取得します。
3. **セッション管理**: `@atproto/oauth-client-browser` が IndexedDB を使用してセッションを永続化し、リロード後もログイン状態を維持します。
4. **API アクセス**: `session.fetchHandler` を使用することで、すべてのリクエストに自動的に DPoP 証明とアクセストークンが付与されます。