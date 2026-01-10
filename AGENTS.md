# Third-Party Demo App - AI Assistant Instructions

このドキュメントは、Chronosky XRPC API と連携するサードパーティアプリケーションの実装に関する完全なガイドです。

## プロジェクト概要

### 目的
- **Bluesky OAuth** による第三者アプリケーションログインのデモ
- **Chronosky XRPC API** への OAuth アクセスとスケジュール投稿機能のデモ
- 2つの異なる OAuth フローを1つのアプリで実現

### アーキテクチャ

```
Third-Party Demo App (React + Vite SPA)
├── Bluesky OAuth Flow (ユーザーログイン)
│   └── Third-Party App → PDS → Third-Party App
│       client_id: 自身の client_id
│       redirect_uri: /oauth/callback
│
└── Chronosky OAuth Flow (API アクセス)
    └── Third-Party App → PDS → Chronosky API → Third-Party App
        client_id: Chronosky API の client_id
        redirect_uri: /oauth/chronosky/callback (プロキシ経由)
```

## 技術スタック

### フロントエンド
- **React 19** - UI フレームワーク
- **TypeScript** - 型安全性
- **Vite** - ビルドツール

### OAuth ライブラリ
- **@atproto/oauth-client-browser** - Bluesky OAuth 実装
- **jose** - JWT/JWK 操作（DPoP 生成）

### デプロイ
- **Vercel** - 本番環境（推奨）
- SPA として動作、すべてのルートを index.html にリライト

## セットアップ

### 1. 依存関係

```json
{
  "dependencies": {
    "@atproto/api": "^0.16.11",
    "@atproto/oauth-client-browser": "0.3.27",
    "jose": "^5.9.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.6",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.9.3",
    "vite": "^6.0.7"
  }
}
```

### 2. 環境変数

```bash
# .env または Vercel Environment Variables
VITE_APP_URL=https://your-app.vercel.app

# オプション（デフォルト値あり）
VITE_CHRONOSKY_API_URL=https://chronopost-api.anon5r.dev
```

### 3. ビルドスクリプト

```json
{
  "scripts": {
    "dev": "node scripts/generate-client-metadata.mjs && vite",
    "build": "node scripts/generate-client-metadata.mjs && tsc && vite build",
    "preview": "vite preview"
  }
}
```

## OAuth フロー実装

### Bluesky OAuth Flow (ユーザーログイン)

#### 1. クライアントメタデータ生成

```javascript
// scripts/generate-client-metadata.mjs
const clientMetadata = {
  client_id: `${APP_URL}/.well-known/client-metadata.json`,
  client_name: "Third-Party Demo App",
  client_uri: APP_URL,
  redirect_uris: [
    `${APP_URL}/oauth/callback`,
    `${APP_URL}/oauth/chronosky/callback`
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

#### 2. OAuth 開始

```typescript
// lib/bluesky-oauth.ts
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

const client = await BrowserOAuthClient.load({
  clientId: CLIENT_METADATA_URL,
  handleResolver: 'https://bsky.social',
  responseMode: 'query',
});

await client.signIn(handle, {
  state: crypto.randomUUID(),
  signal: new AbortController().signal,
});
```

#### 3. コールバック処理

```typescript
// components/OAuthCallback.tsx
const result = await client.signInCallback();
const session = result.session; // IndexedDB に自動保存される

// セッション情報を取得
const handle = await getHandleFromProfile(session.sub);
```

#### 4. セッション復元

```typescript
// アプリ起動時
const client = await BrowserOAuthClient.load({ ... });
const result = await client.init(); // IndexedDB から復元

if (result) {
  // ログイン済み
  setSession(result.session);
}
```

### Chronosky OAuth Flow (API アクセス)

#### アーキテクチャの重要な違い

**問題**: 同じ `client_id` では2つの異なる OAuth フローを実現できない
- sessionStorage はリダイレクトで消える
- pathname による判別も SPA では信頼できない

**解決**: プロキシフロー
- Chronosky API が PDS とのトークン交換を代行
- トークンを URL パラメータで Third-Party App に渡す

#### 1. OAuth 開始

```typescript
// lib/chronosky-oauth.ts
export async function startChronoskyOAuth(handle: string): Promise<string> {
  // 1. ハンドルから DID と PDS を解決
  const { did, pdsUrl } = await resolveHandle(handle);
  
  // 2. OAuth メタデータ取得
  const metadata = await getOAuthMetadata(pdsUrl);
  
  // 3. DPoP キーペアと PKCE パラメータ生成
  const dpopKeyPair = await generateDPoPKeyPair();
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(32);
  
  // 4. localStorage/sessionStorage に保存
  sessionStorage.setItem('chronosky_oauth_state', state);
  sessionStorage.setItem('chronosky_code_verifier', codeVerifier);
  localStorage.setItem('chronosky_dpop_keypair', JSON.stringify(dpopKeyPair));
  localStorage.setItem('chronosky_user_did', did);
  
  // 5. プロキシリダイレクト URI を構築
  const proxyRedirectUri = new URL(CHRONOSKY_PROXY_CALLBACK);
  proxyRedirectUri.searchParams.set('callback_url', CHRONOSKY_REDIRECT_URI);
  
  // 6. 認可 URL を構築（Chronosky API の client_id を使用）
  const authUrl = new URL(metadata.authorizationEndpoint);
  authUrl.searchParams.set('client_id', CHRONOSKY_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', proxyRedirectUri.toString());
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'atproto transition:generic');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('login_hint', handle);
  
  return authUrl.toString();
}
```

#### 2. プロキシサーバー実装 (Chronosky API)

```typescript
// Chronosky API: /oauth/proxy/callback
app.get('/oauth/proxy/callback', async c => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const iss = c.req.query('iss');
  const callbackUrl = c.req.query('callback_url');
  
  // トークン交換
  const result = await oauthClient.exchangeCodeForTokens({ code, state, iss });
  
  // Third-Party App にリダイレクト（トークンをパラメータで渡す）
  const redirectUrl = new URL(callbackUrl);
  redirectUrl.searchParams.set('state', state);
  redirectUrl.searchParams.set('token', result.tokens.access_token);
  redirectUrl.searchParams.set('refresh_token', result.tokens.refresh_token || '');
  redirectUrl.searchParams.set('expires_at', (Date.now() + result.tokens.expires_in * 1000).toString());
  
  return c.redirect(redirectUrl.toString());
});
```

#### 3. コールバック処理 (Third-Party App)

```typescript
// components/OAuthCallback.tsx
async function handleChronoskyCallback(
  code: string | null,
  state: string,
  handle: string,
  token?: string | null,
  refreshToken?: string | null,
  expiresAt?: string | null
) {
  // state 検証
  const storedState = sessionStorage.getItem('chronosky_oauth_state');
  if (state !== storedState) {
    throw new Error('Invalid state parameter');
  }
  
  // プロキシフローではトークンが直接渡される
  if (!token) {
    throw new Error('No access token provided by Chronosky API proxy');
  }
  
  // トークンを localStorage に保存
  const chronoskyTokens = {
    accessToken: token,
    refreshToken: refreshToken || '',
    expiresAt: expiresAt ? parseInt(expiresAt, 10) : (Date.now() + 3600 * 1000),
  };
  
  localStorage.setItem('chronosky_tokens', JSON.stringify(chronoskyTokens));
  
  // クリーンアップ
  sessionStorage.removeItem('chronosky_oauth_state');
  sessionStorage.removeItem('chronosky_code_verifier');
}
```

#### 4. DPoP 実装

```typescript
// lib/dpop.ts
import * as jose from 'jose';

export async function generateDPoPKeyPair(): Promise<DPoPKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );
  
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  
  return {
    privateKey: JSON.stringify(privateKeyJwk),
    publicKey: JSON.stringify(publicKeyJwk),
  };
}

export async function generateDPoPProof(options: {
  privateKey: string;
  publicKey: string;
  method: string;
  url: string;
  accessToken?: string;
  nonce?: string;
}): Promise<string> {
  const privateKeyJwk = JSON.parse(options.privateKey);
  const publicKeyJwk = JSON.parse(options.publicKey);
  
  const header = {
    alg: 'ES256',
    typ: 'dpop+jwt',
    jwk: {
      kty: publicKeyJwk.kty,
      crv: publicKeyJwk.crv,
      x: publicKeyJwk.x,
      y: publicKeyJwk.y,
    },
  };
  
  const payload: any = {
    jti: crypto.randomUUID(),
    htm: options.method,
    htu: options.url,
    iat: Math.floor(Date.now() / 1000),
  };
  
  if (options.accessToken) {
    const encoder = new TextEncoder();
    const data = encoder.encode(options.accessToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashBase64 = btoa(String.fromCharCode(...hashArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    payload.ath = hashBase64;
  }
  
  if (options.nonce) {
    payload.nonce = options.nonce;
  }
  
  const privateKey = await jose.importJWK(privateKeyJwk, 'ES256');
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader(header)
    .sign(privateKey);
  
  return jwt;
}
```

### XRPC API 呼び出し

```typescript
// lib/chronosky-xrpc-client.ts
export async function createScheduledPost(input: CreateScheduledPostInput): Promise<ScheduledPost> {
  const authState = getChronoskyAuthState();
  
  if (!authState.tokens || !authState.dpopKeyPair) {
    throw new Error('Not authenticated with Chronosky');
  }
  
  const url = new URL(`/xrpc/app.chronosky.schedule.createPost`, CHRONOSKY_API_URL);
  
  // DPoP Proof 生成
  const dpopProof = await generateDPoPProof({
    privateKey: authState.dpopKeyPair.privateKey,
    publicKey: authState.dpopKeyPair.publicKey,
    method: 'POST',
    url: url.toString(),
    accessToken: authState.tokens.accessToken,
  });
  
  // リクエスト
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Authorization': `DPoP ${authState.tokens.accessToken}`,
      'DPoP': dpopProof,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'XRPC request failed');
  }
  
  return response.json();
}
```

## React コンポーネント構成

### App.tsx (ルート)

```typescript
function App() {
  const [isBlueskyAuthenticated, setIsBlueskyAuthenticated] = useState(false);
  const [isChronoskyAuthenticated, setIsChronoskyAuthenticated] = useState(false);
  const [blueskySession, setBlueskySession] = useState<BlueskySession | null>(null);
  const [currentView, setCurrentView] = useState<'login' | 'dashboard' | 'callback'>('login');
  
  useEffect(() => {
    // OAuth コールバック検出
    const searchParams = new URLSearchParams(window.location.search);
    const hasCode = searchParams.has('code') && searchParams.has('state');
    const hasToken = searchParams.has('token') && searchParams.has('state');
    
    const isBlueskyCallback = window.location.pathname === '/oauth/callback';
    const isChronoskyCallback = window.location.pathname === '/oauth/chronosky/callback';
    
    if ((hasCode || hasToken) && (isBlueskyCallback || isChronoskyCallback)) {
      // OAuth callback in progress
      setCurrentView('callback');
      return;
    }
    
    // 通常のページロード - 認証状態確認
    checkAuthStatus();
  }, []);
  
  async function checkAuthStatus() {
    const session = await getBlueskySession();
    setIsBlueskyAuthenticated(!!session);
    setBlueskySession(session);
    
    const chronoskyAuth = getChronoskyAuthState();
    setIsChronoskyAuthenticated(!!chronoskyAuth.tokens);
    
    if (session) {
      setCurrentView('dashboard');
    }
  }
  
  // ... rest of component
}
```

### OAuthCallback.tsx

```typescript
export function OAuthCallback({ onSuccess }: OAuthCallbackProps) {
  useEffect(() => {
    handleCallback();
  }, []);
  
  async function handleCallback() {
    const searchParams = new URLSearchParams(window.location.search);
    
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refresh_token');
    const expiresAt = searchParams.get('expires_at');
    
    // pathname で判別
    const isChronoskyCallback = window.location.pathname === '/oauth/chronosky/callback';
    
    if (isChronoskyCallback) {
      // Chronosky OAuth callback (proxy flow)
      const handle = sessionStorage.getItem('chronosky_oauth_handle');
      await handleChronoskyCallback(code, state!, handle!, token, refreshToken, expiresAt);
      
      sessionStorage.removeItem('chronosky_oauth_handle');
      window.history.replaceState({}, document.title, '/');
      
      onSuccess(); // Chronosky 認証完了
    } else {
      // Bluesky OAuth callback
      const session = await handleBlueskyCallback();
      
      window.history.replaceState({}, document.title, '/');
      
      onSuccess(session); // Bluesky 認証完了
    }
  }
  
  // ... rest of component
}
```

### ChronoskyAuth.tsx

```typescript
export function ChronoskyAuth({ session, onSuccess }: ChronoskyAuthProps) {
  async function handleAuth() {
    const handle = session.handle;
    
    // sessionStorage に保存（コールバック時に使用）
    sessionStorage.setItem('chronosky_oauth_handle', handle);
    
    // OAuth フロー開始
    const authUrl = await startChronoskyOAuth(handle);
    window.location.href = authUrl;
  }
  
  // ... rest of component
}
```

### PostForm.tsx (スケジュール投稿)

```typescript
export function PostForm() {
  const [posts, setPosts] = useState<string[]>(['']);
  const [scheduledAt, setScheduledAt] = useState('');
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (posts.length === 1) {
      await createScheduledPost({
        text: posts[0],
        scheduledAt: new Date(scheduledAt).toISOString(),
      });
    } else {
      await createScheduledThread({
        posts: posts.map(text => ({ text })),
        scheduledAt: new Date(scheduledAt).toISOString(),
      });
    }
    
    showToast('Post(s) scheduled successfully!', 'success');
  }
  
  // ... rest of component
}
```

## Vercel デプロイ

### vercel.json

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "installCommand": "pnpm install",
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
   - Root Directory: プロジェクトルート（このディレクトリ）
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

### 1. SPA ルーティング

**問題**: Vite SPA では `pathname` がブラウザ履歴によって書き換わる可能性がある

**解決**: 
- Vercel の `rewrites` 設定で、すべてのパスを `index.html` にマッピング
- React Router は使わず、`window.location.pathname` で直接判別

### 2. OAuth パラメータの保持

**問題**: sessionStorage はリダイレクトで消える可能性がある

**解決**:
- Chronosky OAuth ではプロキシフローを使用し、トークンを URL パラメータで受け取る
- 重要な情報は localStorage に保存（DPoP キーペア、トークンなど）

### 3. 2つの OAuth フローの分離

**Bluesky OAuth**:
- `client_id`: 自身の client_id
- `redirect_uri`: `/oauth/callback`
- セッション: IndexedDB（BrowserOAuthClient が管理）

**Chronosky OAuth**:
- `client_id`: Chronosky API の client_id
- `redirect_uri`: `/oauth/chronosky/callback`（プロキシ経由）
- トークン: localStorage（手動管理）

### 4. DPoP 実装

- ES256 アルゴリズム（ECDSA P-256）
- JWT ヘッダーに公開鍵（JWK）を含める
- `ath` クレーム: アクセストークンの SHA-256 ハッシュ（API リクエスト時のみ）

### 5. エラーハンドリング

```typescript
try {
  await createScheduledPost(input);
  showToast('Success', 'success');
} catch (error) {
  console.error('Failed:', error);
  showToast(
    error instanceof Error ? error.message : 'Failed',
    'error'
  );
}
```

## トラブルシューティング

### OAuth コールバックでログイン画面に戻る

**原因**: `pathname` が正しく検出されていない

**確認**:
1. Vercel の `rewrites` 設定が正しいか
2. `window.location.pathname` がコールバック時に正しいパスか（コンソールログで確認）

### IndexedDB にセッションが保存されない

**原因**: `signInCallback()` 後すぐに `init()` を呼ぶと失敗する

**解決**:
- `signInCallback()` 後は `init()` を呼ばない
- URL パラメータをクリアしてから、ページリロード時に `init()` で復元

### DPoP エラー

**原因**: DPoP Proof の生成が不正

**確認**:
1. `alg`: `ES256`
2. `typ`: `dpop+jwt`
3. `jwk`: 公開鍵（x, y 座標）
4. `ath`: アクセストークンの SHA-256 ハッシュ（base64url エンコード）

### CORS エラー

**原因**: client-metadata.json のヘッダー設定不足

**解決**: `vercel.json` で CORS ヘッダーを設定

## Chronosky API エンドポイント

### プロキシコールバック
```
GET https://chronopost-api.anon5r.dev/oauth/proxy/callback?code=...&state=...&callback_url=...
```

### クライアントメタデータ
```
GET https://chronopost-api.anon5r.dev/client-metadata.json
```

### XRPC メソッド

#### スケジュール投稿作成
```
POST https://chronopost-api.anon5r.dev/xrpc/app.chronosky.schedule.createPost
Headers:
  Authorization: DPoP <access_token>
  DPoP: <dpop_proof>
  Content-Type: application/json

Body:
{
  "text": "Hello World",
  "scheduledAt": "2025-01-15T12:00:00Z"
}
```

#### スレッド作成
```
POST https://chronopost-api.anon5r.dev/xrpc/app.chronosky.schedule.createThread
Headers:
  Authorization: DPoP <access_token>
  DPoP: <dpop_proof>
  Content-Type: application/json

Body:
{
  "posts": [
    { "text": "Post 1" },
    { "text": "Post 2" }
  ],
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
2. ✅ Chronosky OAuth によるスケジュール投稿 API アクセス
3. ✅ DPoP による安全なトークンバインディング
4. ✅ プロキシフローによる複数 OAuth フローの実現
5. ✅ Vercel での SPA デプロイ

別プロジェクトとして作成する際は、このドキュメントをベースに実装してください。
