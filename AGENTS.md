# Bluesky Client Demo App - AI Assistant Instructions

このドキュメントは、Bluesky OAuth と Chronosky API を使用したサードパーティアプリケーションの実装に関するガイドです。

## プロジェクト概要

### 目的
- **Bluesky OAuth** による第三者アプリケーションログインのデモ
- **Chronosky API** を使用したスケジュール投稿機能のデモ
- Bluesky OAuth セッションの認証済み fetchHandler を使った安全な API アクセス

### アーキテクチャ

```
Third-Party Demo App (React + Vite SPA)
└── Bluesky OAuth Flow
    ├── ユーザーログイン
    │   └── Third-Party App → PDS → Third-Party App
    │       client_id: 自身の client_id
    │       redirect_uri: /oauth/callback
    │
    └── Chronosky API アクセス
        └── Bluesky セッションの fetchHandler を使用
            - DPoP と Access Token は自動的に付与される
            - Chronosky API エンドポイント: https://api.chronosky.app
```

## 技術スタック

### フロントエンド
- **React 19** - UI フレームワーク
- **TypeScript** - 型安全性
- **Vite** - ビルドツール（rolldown-vite 使用）

### OAuth ライブラリ
- **@atproto/oauth-client-browser** - Bluesky OAuth 実装（DPoP サポート）
- **@atproto/api** - Bluesky/AT Protocol 操作
- **jose** - JWT/JWK 操作（DPoP 関連のユーティリティ）

### デプロイ
- **Vercel** - 本番環境（推奨）
- SPA として動作、すべてのルートを index.html にリライト

## セットアップ

### 1. 依存関係

```json
{
  "dependencies": {
    "@atproto/api": "^0.18.13",
    "@atproto/oauth-client-browser": "^0.3.39",
    "jose": "^6.1.3",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@types/node": "^24.10.1",
    "@types/react": "^19.2.5",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "typescript": "~5.9.3",
    "vite": "npm:rolldown-vite@7.2.5"
  }
}
```

### 2. 環境変数

```bash
# .env または Vercel Environment Variables
VITE_APP_URL=https://your-app.vercel.app

# オプション（デフォルト値あり）
VITE_CHRONOSKY_API_URL=https://api.chronosky.app
```

### 3. ビルドスクリプト

```json
{
  "scripts": {
    "dev": "node scripts/generate-client-metadata.mjs && vite",
    "build": "node scripts/generate-client-metadata.mjs && tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

## OAuth フロー実装

### 1. クライアントメタデータ生成

```javascript
// scripts/generate-client-metadata.mjs
const clientMetadata = {
  client_id: `${APP_URL}/.well-known/client-metadata.json`,
  client_name: "Bluesky Client Demo App",
  client_uri: APP_URL,
  redirect_uris: [
    `${APP_URL}/oauth/callback`
  ],
  scope: "atproto transition:generic",
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  response_mode: "query",
  token_endpoint_auth_method: "none",
  application_type: "web",
  dpop_bound_access_tokens: true
};
```

**重要なポイント**:
- `dpop_bound_access_tokens: true` - DPoP を有効化
- `redirect_uris` に `/oauth/callback` のみを指定

### 2. Bluesky OAuth ログイン

```typescript
// lib/bluesky-oauth.ts
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

const CLIENT_METADATA_URL = `${import.meta.env.VITE_APP_URL}/.well-known/client-metadata.json`;

let clientInstance: BrowserOAuthClient | null = null;

export async function getBlueskyClient(): Promise<BrowserOAuthClient> {
  if (clientInstance) return clientInstance;

  clientInstance = await BrowserOAuthClient.load({
    clientId: CLIENT_METADATA_URL,
    handleResolver: 'https://bsky.social',
    responseMode: 'query',
  });

  return clientInstance;
}
```

### 3. ログイン処理

```typescript
// App.tsx
async function handleLogin(handle: string) {
  const client = await getBlueskyClient();
  try {
    await client.signIn(handle, {
      state: crypto.randomUUID(),
      prompt: 'login',
    });
  } catch (e) {
    console.error("Login failed", e);
    alert("Login failed: " + e);
  }
}
```

### 4. OAuth コールバック処理

```typescript
// components/OAuthCallback.tsx
export function OAuthCallback({ onSuccess }: OAuthCallbackProps) {
  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    try {
      const client = await getBlueskyClient();
      const result = await client.signInCallback();

      // セッション情報を取得
      const session = result.session;

      // URL パラメータをクリア
      window.history.replaceState({}, document.title, '/');

      // 親コンポーネントに通知
      onSuccess(session);
    } catch (error) {
      console.error('OAuth callback error:', error);
      // エラー時はログイン画面に戻る
      window.location.href = '/';
    }
  }

  return <div>Completing login...</div>;
}
```

### 5. セッション復元

```typescript
// App.tsx
async function checkAuth() {
  try {
    const client = await getBlueskyClient();
    const result = await client.init(); // IndexedDB から復元

    if (result) {
      setBskySession(result.session);
      await initAgent(result.session);
      setCurrentView('dashboard');
    }
  } catch (e) {
    console.error("Auth check failed", e);
  }
}
```

### 6. Agent 初期化

```typescript
// App.tsx
async function initAgent(session: OAuthSession) {
  try {
    const tokenInfo = await session.getTokenInfo();

    // Agent 用のセッションマネージャーを作成
    const sessionManager = {
      service: tokenInfo.aud,
      fetch: (url: string, init?: RequestInit) => session.fetchHandler(url, init),
      did: session.sub
    };

    // @ts-ignore
    const agent = new Agent(sessionManager);

    setAgent(agent);
  } catch (e) {
    console.error("Failed to init agent", e);
  }
}
```

## Chronosky API 連携

### 概要

Chronosky API へのアクセスには、Bluesky OAuth セッションの認証済み `fetchHandler` を使用します。この fetchHandler は、自動的に以下を処理します：

- DPoP Proof の生成と付与
- Access Token の付与
- トークンのリフレッシュ（必要な場合）

### スケジュール投稿の実装

```typescript
// lib/chronosky-xrpc-client.ts
import { Agent } from '@atproto/api';

const CHRONOSKY_API_URL = import.meta.env.VITE_CHRONOSKY_API_URL || 'https://api.chronosky.app';

export interface CreateScheduledPostInput {
  text: string;
  scheduledAt: string;
  images?: { blob: Blob; alt?: string }[];
  langs?: string[];
}

export interface ScheduledPost {
  uri: string;
  cid: string;
  scheduledAt: string;
}

/**
 * Creates a scheduled post using the Chronosky XRPC API.
 * Uses the authenticated fetch handler to automatically sign requests with DPoP and Access Token.
 */
export async function createScheduledPost(
  fetchHandler: (url: string, init?: RequestInit) => Promise<Response>,
  input: CreateScheduledPostInput
): Promise<ScheduledPost> {
  const url = new URL(`${CHRONOSKY_API_URL}/xrpc/app.chronosky.schedule.create`);

  const response = await fetchHandler(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Chronosky API request failed: ${response.status}`);
  }

  return response.json();
}
```

### UI での使用例

```typescript
// components/PostForm.tsx
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setStatus('loading');
  setErrorMsg('');

  try {
    if (mode === 'schedule') {
      // Chronosky Schedule (単一投稿のみ)
      await createScheduledPost(fetchHandler, {
        text: posts[0],
        scheduledAt: new Date(scheduledAt).toISOString(),
      });

      setStatus('success');
      setPosts(['']);
      setScheduledAt('');
    } else {
      // Post Now (Sequentially for threads)
      let root: { uri: string; cid: string } | undefined = undefined;
      let parent: { uri: string; cid: string } | undefined = undefined;

      for (const text of posts) {
        if (!text.trim()) continue;

        const res: any = await agent.post({
          text,
          reply: root && parent ? { root, parent } : undefined,
          createdAt: new Date().toISOString()
        });

        if (!root) {
          root = { uri: res.uri, cid: res.cid };
        }
        parent = { uri: res.uri, cid: res.cid };
      }

      setStatus('success');
      setPosts(['']);
      if (onPostCreated) onPostCreated();
    }
  } catch (error) {
    console.error(error);
    setStatus('error');
    setErrorMsg(error instanceof Error ? error.message : 'Unknown error');
  }
}
```

## React コンポーネント構成

### App.tsx (ルート)

```typescript
function App() {
  const [bskySession, setBskySession] = useState<OAuthSession | null>(null);
  const [currentView, setCurrentView] = useState<'login' | 'dashboard' | 'callback'>('login');
  const [agent, setAgent] = useState<Agent | null>(null);

  useEffect(() => {
    const isCallback = window.location.pathname === '/oauth/callback';

    if (isCallback) {
      setCurrentView('callback');
      return;
    }

    checkAuth();
  }, []);

  // ... rest of component
}
```

### LoginView.tsx

ユーザーがハンドル（例: `user.bsky.social`）を入力してログインするシンプルな UI。

### PostForm.tsx

- **即時投稿モード**: Agent を使って直接 Bluesky に投稿（スレッドサポート）
- **スケジュールモード**: Chronosky API を使って投稿をスケジュール（単一投稿のみ）

### PostList.tsx

ログインユーザーの最新の投稿を表示し、削除機能を提供。

## Vercel デプロイ

### vercel.json

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/.well-known/client-metadata.json",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/json"
        },
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        }
      ]
    }
  ]
}
```

### デプロイ手順

1. **Vercel プロジェクト作成**
   - Root Directory: プロジェクトルート
   - Framework: Vite

2. **環境変数設定**
   ```
   VITE_APP_URL=https://your-app.vercel.app
   ```

3. **デプロイ後**
   - 実際の URL で `VITE_APP_URL` を更新
   - 再デプロイ

4. **動作確認**
   - `https://your-app.vercel.app/.well-known/client-metadata.json` を確認
   - OAuth フローをテスト

## 重要な実装ポイント

### 1. DPoP の自動処理

`@atproto/oauth-client-browser` が提供する `fetchHandler` は、以下を自動的に処理します：

- DPoP Proof の生成
- `DPoP` ヘッダーの付与
- `Authorization: DPoP <access_token>` ヘッダーの付与
- トークンの有効期限チェックとリフレッシュ

このため、手動で DPoP を生成する必要はありません。

### 2. セッション管理

- セッション情報は IndexedDB に自動的に保存される
- `client.init()` を呼び出すことで、ページリロード後もセッションを復元できる
- ログアウト時は `session.signOut()` を呼び出す

### 3. SPA ルーティング

- Vercel の `rewrites` 設定で、すべてのパスを `index.html` にマッピング
- `window.location.pathname` で OAuth コールバックを検出

### 4. Agent の使用

`@atproto/api` の `Agent` クラスを使用して、Bluesky の標準 API（投稿取得、投稿作成、削除など）を操作します。

## トラブルシューティング

### OAuth コールバックでログイン画面に戻る

**原因**: `pathname` が正しく検出されていない、またはコールバック処理でエラーが発生

**確認**:
1. Vercel の `rewrites` 設定が正しいか
2. ブラウザのコンソールでエラーを確認
3. `window.location.pathname` がコールバック時に `/oauth/callback` か

### IndexedDB にセッションが保存されない

**原因**: `signInCallback()` でエラーが発生している

**解決**:
- `signInCallback()` の catch ブロックでエラーをログ出力
- OAuth メタデータの `redirect_uris` が正しいか確認

### Chronosky API でエラーが発生

**原因**: fetchHandler が正しく渡されていない、または API エンドポイントが間違っている

**確認**:
1. `session.fetchHandler` を正しく渡しているか
2. `VITE_CHRONOSKY_API_URL` が正しく設定されているか
3. API エンドポイント: `https://api.chronosky.app/xrpc/app.chronosky.schedule.create`

### CORS エラー

**原因**: client-metadata.json のヘッダー設定不足

**解決**: `vercel.json` で CORS ヘッダーを設定（上記参照）

## Chronosky API エンドポイント

### スケジュール投稿作成
```
POST https://api.chronosky.app/xrpc/app.chronosky.schedule.create
Headers:
  Authorization: DPoP <access_token>  # fetchHandler が自動付与
  DPoP: <dpop_proof>                   # fetchHandler が自動付与
  Content-Type: application/json

Body:
{
  "text": "Hello World",
  "scheduledAt": "2025-01-15T12:00:00Z"
}
```

## 参考資料

### AT Protocol OAuth
- https://atproto.com/specs/oauth
- https://www.rfc-editor.org/rfc/rfc9449.html (DPoP)

### Bluesky OAuth Client
- https://github.com/bluesky-social/atproto/tree/main/packages/oauth/oauth-client-browser

### Vite
- https://vitejs.dev/guide/

### Vercel
- https://vercel.com/docs/frameworks/vite

## まとめ

このアプリケーションは以下を実現します：

1. ✅ Bluesky OAuth による第三者アプリログイン
2. ✅ DPoP による安全なトークンバインディング（自動処理）
3. ✅ Bluesky OAuth セッションを使った Chronosky API アクセス
4. ✅ 即時投稿（単一 & スレッド）とスケジュール投稿（単一のみ）
5. ✅ Vercel での SPA デプロイ

**重要な変更点**（以前の実装からの変更）:
- Chronosky 専用の OAuth フローを削除
- プロキシフローを削除
- スレッドスケジューリングを削除（現在は単一投稿のみ）
- Bluesky OAuth セッションの fetchHandler を直接使用することで実装を簡略化
