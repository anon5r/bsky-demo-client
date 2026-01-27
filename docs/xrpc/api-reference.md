# XRPC API リファレンス

Chronosky XRPC API は AT Protocol 標準の XRPC (Cross-system Remote Procedure
Call) プロトコルに準拠した API です。

## 概要

- **ベース URL**: `https://api.chronosky.example.com/xrpc` (本番環境)
- **認証方式**: OAuth 2.0 + DPoP (Demonstrating Proof-of-Possession)
- **リクエスト形式**: JSON
- **レスポンス形式**: JSON
- **文字エンコーディング**: UTF-8

## 認証

すべての XRPC エンドポイントは認証が必要です。詳細は
[third-party-client-authentication.md](./third-party-client-authentication.md)
を参照してください。

### 認証ヘッダー

**必須ヘッダー:**

```
Authorization: DPoP <access_token>
DPoP: <dpop_proof>
```

**オプションヘッダー:**

```
X-Atproto-DID: <user_did>
```

**📝 X-Atproto-DID ヘッダーについて**

`X-Atproto-DID`
ヘッダーは**オプション**です。このヘッダーを送信する場合、API は以下を検証します：

- ヘッダーの DID と access token から取得した DID が一致すること
- 不一致の場合、401 Unauthorized エラーを返します

**推奨事項:**

- サードパーティクライアントは通常、このヘッダーを送信する必要はありません
- API が自動的に access token から DID を抽出します
- セキュリティ強化のために DID を明示的に検証したい場合にのみ使用してください

## エンドポイント一覧

### スケジュール投稿管理

- [app.chronosky.schedule.createPost](#appchronoskyschedule
  createpost) - 投稿をスケジュール
- [app.chronosky.schedule.listPosts](#appchronoskyschedulelistposts) - 投稿一覧を取得
- [app.chronosky.schedule.getPost](#appchronoskyschedulegetpost) - 投稿詳細を取得
- [app.chronosky.schedule.updatePost](#appchronoskyscheduleupdatepost) - 投稿を更新
- [app.chronosky.schedule.deletePost](#appchronoskyschedule
  deletepost) - 投稿を削除
- [app.chronosky.schedule.retryFailedPosts](#appchronoskyscheduleretry
  failedposts) - 失敗した投稿を再試行

### メディアアップロード

- [app.chronosky.media.uploadBlob](#appchronoskymediauploadblob) - 画像をアップロード

### プラン管理

- [app.chronosky.plan.getAssignment](#appchronoskyplangetassignment) - アクティブなプラン割り当てを取得
- [app.chronosky.plan.listAssignments](#appchronoskyplanlistassignments) - プラン割り当て履歴を取得
- [app.chronosky.plan.getUsage](#appchronoskyplangetusage) - プラン使用状況を取得
- [app.chronosky.plan.redeemTicket](#appchronoskyplanredeemticket) - チケットを使用してプランを有効化

---

## スケジュール投稿管理

### app.chronosky.schedule.createPost

スケジュールされた投稿を作成します。単一投稿またはスレッド（複数投稿）を作成できます。

**メソッド**: `POST` **パス**: `/xrpc/app.chronosky.schedule.createPost`

#### リクエストボディ

```typescript
{
  posts: Array<{
    text: string;                    // 投稿テキスト (最大 300 文字)
    langs?: string[];                // 言語コード (ISO 639-1、最大 3 つ)
    facets?: Facet[];                // リッチテキスト装飾 (メンション、リンクなど)
    embed?: EmbedUnion;              // 埋め込みメディア (画像、リンクカードなど)
    labels?: {                       // コンテンツラベル (selfLabels)
      $type: 'com.atproto.label.defs#selfLabels';
      values: Array<{ val: string }>;
    };
  }>;
  scheduledAt: string;               // ISO 8601 形式の日時
  threadgateRules?: Array<           // スレッドゲート設定 (任意)
    'mention' | 'follower' | 'following'
  > | null;
  disableQuotePosts?: boolean;       // 引用投稿を無効化 (任意)
}
```

#### レスポンス

```typescript
{
  id: string; // 作成された投稿の ID
  scheduledAt: string; // スケジュール日時 (ISO 8601)
  postCount: number; // 作成された投稿数 (スレッドの場合は複数)
}
```

#### エラー

- `400 VALIDATION_ERROR` - リクエストパラメータが不正
- `401 UNAUTHORIZED` - 認証エラー
- `429 RATE_LIMIT_EXCEEDED` - レート制限超過
- `403 PLAN_LIMIT_EXCEEDED` - プラン制限超過

#### 例

**単一投稿の作成:**

```bash
curl -X POST https://api.chronosky.example.com/xrpc/app.chronosky.schedule.createPost \
  -H 'Authorization: DPoP <access_token>' \
  -H 'DPoP: <dpop_proof>' \
  -H 'Content-Type: application/json' \
  -d '{
    "posts": [
      {
        "text": "Hello, Bluesky! 🚀",
        "langs": ["en"]
      }
    ],
    "scheduledAt": "2025-01-23T12:00:00Z"
  }'
```

**スレッドの作成:**

```bash
curl -X POST https://api.chronosky.example.com/xrpc/app.chronosky.schedule.createPost \
  -H 'Authorization: DPoP <access_token>' \
  -H 'DPoP: <dpop_proof>' \
  -H 'Content-Type: application/json' \
  -d '{
    "posts": [
      {
        "text": "Thread post 1/3",
        "langs": ["en"]
      },
      {
        "text": "Thread post 2/3",
        "langs": ["en"]
      },
      {
        "text": "Thread post 3/3",
        "langs": ["en"]
      }
    ],
    "scheduledAt": "2025-01-23T15:00:00Z"
  }'
```

**画像付き投稿:**

```bash
# 先に画像をアップロード
curl -X POST https://api.chronosky.example.com/xrpc/app.chronosky.media.uploadBlob \
  -H 'Authorization: DPoP <access_token>' \
  -H 'DPoP: <dpop_proof>' \
  -H 'Content-Type: image/jpeg' \
  --data-binary @image.jpg

# レスポンスから blob を取得
# {
#   "blob": {
#     "$type": "blob",
#     "ref": { "$link": "bafkreixyz..." },
#     "mimeType": "image/jpeg",
#     "size": 123456
#   }
#}

# 投稿を作成
curl -X POST https://api.chronosky.example.com/xrpc/app.chronosky.schedule.createPost \
  -H 'Authorization: DPoP <access_token>' \
  -H 'DPoP: <dpop_proof>' \
  -H 'Content-Type: application/json' \
  -d '{
    "posts": [
      {
        "text": "Check out this image!",
        "langs": ["en"],
        "embed": {
          "$type": "app.bsky.embed.images",
          "images": [
            {
              "alt": "Description of the image",
              "image": {
                "$type": "blob",
                "ref": { "$link": "bafkreixyz..." },
                "mimeType": "image/jpeg",
                "size": 123456
              }
            }
          ]
        }
      }
    ],
    "scheduledAt": "2025-01-23T18:00:00Z"
  }'
```

---

### app.chronosky.schedule.listPosts

スケジュールされた投稿の一覧を取得します。

**メソッド**: `GET` **パス**: `/xrpc/app.chronosky.schedule.listPosts`

#### クエリパラメータ

- `status` (任意): 投稿のステータスでフィルタリング
  - `PENDING` - 実行待ち
  - `EXECUTING` - 実行中
  - `COMPLETED` - 完了
  - `FAILED` - 失敗
  - `CANCELLED` - キャンセル済み
  - **📝 注意:**
    status パラメータは大文字・小文字どちらでも指定できます。API が自動的に大文字に変換します。
    - 例: `?status=pending` → 自動的に `PENDING` として処理
- `limit` (任意): 取得件数 (デフォルト: 50、最大: 100)
- `cursor` (任意): ページネーション用カーソル

#### レスポンス

```typescript
{
  posts: Array<{
    id: string;
    userId: string;
    text: string;
    scheduledAt: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    langs?: string[];
    facets?: Facet[];
    embed?: EmbedUnion;
    labels?: SelfLabels;
    threadgateRules?: string[];
    disableQuotePosts?: boolean;
  }>;
  cursor?: string;                   // 次のページがある場合のみ
}
```

#### 例

```bash
# すべての投稿を取得
curl -X GET 'https://api.chronosky.example.com/xrpc/app.chronosky.schedule.listPosts' \
  -H 'Authorization: DPoP <access_token>' \
  -H 'DPoP: <dpop_proof>'

# PENDING ステータスの投稿のみ取得
curl -X GET 'https://api.chronosky.example.com/xrpc/app.chronosky.schedule.listPosts?status=PENDING' \
  -H 'Authorization: DPoP <access_token>' \
  -H 'DPoP: <dpop_proof>'
```

---

### app.chronosky.schedule.getPost

スケジュールされた投稿の詳細を取得します。

**メソッド**: `GET` **パス**: `/xrpc/app.chronosky.schedule.getPost`

#### クエリパラメータ

- `postId` (必須): 投稿 ID

#### レスポンス

```typescript
{
  id: string;
  userId: string;
  text: string;
  scheduledAt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  langs?: string[];
  facets?: Facet[];
  embed?: EmbedUnion;
  labels?: SelfLabels;
  threadgateRules?: string[];
  disableQuotePosts?: boolean;
  error?: string;                    // エラーがある場合
  retryCount?: number;
}
```

#### 例

```bash
curl -X GET 'https://api.chronosky.example.com/xrpc/app.chronosky.schedule.getPost?postId=post-123' \
  -H 'Authorization: DPoP <access_token>' \
  -H 'DPoP: <dpop_proof>'
```

---

### app.chronosky.schedule.updatePost

スケジュールされた投稿を更新します。

**メソッド**: `POST` **パス**: `/xrpc/app.chronosky.schedule.updatePost`

#### リクエストボディ

```typescript
{
  postId: string;                    // 更新する投稿の ID
  posts?: Array<{                    // 更新する投稿内容 (任意)
    text: string;
    langs?: string[];
    facets?: Facet[];
    embed?: EmbedUnion;
    labels?: SelfLabels;
  }>;
  scheduledAt?: string;              // 更新するスケジュール日時 (任意)
  threadgateRules?: Array<string> | null;
  disableQuotePosts?: boolean;
}
```

#### レスポンス

```typescript
{
  id: string;
  userId: string;
  text: string;
  scheduledAt: string;
  status: string;
  updatedAt: string;
}
```

#### 例

```bash
curl -X POST https://api.chronosky.example.com/xrpc/app.chronosky.schedule.updatePost \
  -H 'Authorization: DPoP <access_token>' \
  -H 'DPoP: <dpop_proof>' \
  -H 'Content-Type: application/json' \
  -d '{
    "postId": "post-123",
    "posts": [
      {
        "text": "Updated post content",
        "langs": ["en"]
      }
    ],
    "scheduledAt": "2025-01-24T10:00:00Z"
  }'
```

---

### app.chronosky.schedule.deletePost

スケジュールされた投稿を削除します。

**メソッド**: `POST` **パス**: `/xrpc/app.chronosky.schedule.deletePost`

#### リクエストボディ

```typescript
{
  postId: string; // 削除する投稿の ID
}
```

#### レスポンス

```typescript
{
  success: boolean;
}
```

#### 例

```bash
curl -X POST https://api.chronosky.example.com/xrpc/app.chronosky.schedule.deletePost \
  -H 'Authorization: DPoP <access_token>' \
  -H 'DPoP: <dpop_proof>' \
  -H 'Content-Type: application/json' \
  -d '{
    "postId": "post-123"
  }'
```

---

### app.chronosky.schedule.retryFailedPosts

失敗したすべての投稿を再試行します。

**メソッド**: `POST` **パス**: `/xrpc/app.chronosky.schedule.retryFailedPosts`

#### リクエストボディ

```typescript
{
} // 空のオブジェクト
```

#### レスポンス

```typescript
{
  retriedCount: number; // 再試行した投稿数
}
```

#### 例

```bash
curl -X POST https://api.chronosky.example.com/xrpc/app.chronosky.schedule.retryFailedPosts \
  -H 'Authorization: DPoP <access_token>' \
  -H 'DPoP: <dpop_proof>' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

---

## メディアアップロード

### app.chronosky.media.uploadBlob

画像をアップロードして blob 参照を取得します。アップロードされた画像は投稿作成時に使用できます。

**メソッド**: `POST` **パス**: `/xrpc/app.chronosky.media.uploadBlob`

#### リクエスト

- **Content-Type**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- **Body**: バイナリ画像データ

#### レスポンス

```typescript
{
  blob: {
    $type: 'blob';
    ref: {
      $link: string;
    } // CID (Content Identifier)
    mimeType: string;
    size: number;
  }
}
```

#### 制約

- **最大ファイルサイズ**: 1 MB
- **サポートされる形式**: JPEG, PNG, WebP, GIF
- **最大画像サイズ**: 2000 x 2000 ピクセル

#### 例

```bash
curl -X POST https://api.chronosky.example.com/xrpc/app.chronosky.media.uploadBlob \
  -H 'Authorization: DPoP <access_token>' \
  -H 'DPoP: <dpop_proof>' \
  -H 'Content-Type: image/jpeg' \
  --data-binary @image.jpg
```

---

## プラン管理

### app.chronosky.plan.getAssignment

現在アクティブなプラン割り当てを取得します。

**メソッド**: `GET` **パス**: `/xrpc/app.chronosky.plan.getAssignment`

#### レスポンス

```typescript
{
  assignment: {
    id: string;
    planId: string;
    planName: string;
    tier: 'FREE' | 'PREMIUM' | 'PROFESSIONAL';
    activatedAt: string;
    expiresAt: string | null;
    limits: {
      pending_posts_limit: number;
      monthly_posts_limit: number;
      max_schedule_days: number;
      schedule_interval_minutes: number;
      thread_posts_limit: number;
      max_images_per_post: number;
    };
  } | null;
}
```

#### 例

```bash
curl -X GET 'https://api.chronosky.example.com/xrpc/app.chronosky.plan.getAssignment' \
  -H 'Authorization: DPoP <access_token>' \
  -H 'DPoP: <dpop_proof>'
```

---

### app.chronosky.plan.listAssignments

プラン割り当ての履歴を取得します。

**メソッド**: `GET` **パス**: `/xrpc/app.chronosky.plan.listAssignments`

#### クエリパラメータ

- `limit` (任意): 取得件数 (デフォルト: 20、最大: 100)
- `cursor` (任意): ページネーション用カーソル

#### レスポンス

```typescript
{
  assignments: Array<{
    id: string;
    planId: string;
    planName: string;
    tier: string;
    activatedAt: string;
    expiresAt: string | null;
    status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  }>;
  cursor?: string;
}
```

---

### app.chronosky.plan.getUsage

プランの使用状況を取得します。

**メソッド**: `GET` **パス**: `/xrpc/app.chronosky.plan.getUsage`

#### クエリパラメータ

- `period` (任意): 集計期間 (`DAILY`, `MONTHLY`)

#### レスポンス

```typescript
{
  usage: {
    pendingPosts: number; // 現在の保留中投稿数
    monthlyPosts: number; // 今月の投稿数
    limits: {
      pending_posts_limit: number;
      monthly_posts_limit: number;
    }
    percentUsed: {
      pendingPosts: number; // 使用率 (%)
      monthlyPosts: number;
    }
  }
}
```

---

### app.chronosky.plan.redeemTicket

チケットコードを使用してプランを有効化します。

**メソッド**: `POST` **パス**: `/xrpc/app.chronosky.plan.redeemTicket`

#### リクエストボディ

```typescript
{
  ticketCode: string; // チケットコード
}
```

#### レスポンス

```typescript
{
  assignment: {
    id: string;
    planId: string;
    planName: string;
    tier: string;
    activatedAt: string;
    expiresAt: string | null;
  }
}
```

#### エラー

- `404 TICKET_NOT_FOUND` - チケットが見つからない
- `400 TICKET_ALREADY_USED` - チケットは既に使用済み
- `400 TICKET_EXPIRED` - チケットの有効期限が切れている

---

## エラーハンドリング

すべてのエラーレスポンスは以下の形式です：

```typescript
{
  error: string;                     // エラーコード (大文字とアンダースコア)
  message: string;                   // 人間が読めるエラーメッセージ
  code?: number;                     // HTTP ステータスコード
}
```

### 共通エラーコード

- `400 VALIDATION_ERROR` - リクエストパラメータが不正
- `401 UNAUTHORIZED` - 認証エラー (トークンが無効または期限切れ)
- `403 FORBIDDEN` - アクセス権限なし
- `404 NOT_FOUND` - リソースが見つからない
- `429 RATE_LIMIT_EXCEEDED` - レート制限超過
- `500 INTERNAL_SERVER_ERROR` - サーバー内部エラー

### プラン制限エラー

- `403 PLAN_LIMIT_EXCEEDED` - プラン制限超過 (追加情報が含まれます)
  ```typescript
  {
    error: 'PLAN_LIMIT_EXCEEDED',
    message: 'Pending posts limit exceeded',
    limit: 10,
    actual: 15,
    code: 403
  }
  ```

---

## レート制限

XRPC API にはレート制限が適用されます。

### 制限値

- **認証済みリクエスト**: 300 リクエスト / 5 分
- **投稿作成**: プランによって異なります (プラン制限を参照)

### レート制限ヘッダー

レスポンスには以下のヘッダーが含まれます：

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 250
X-RateLimit-Reset: 1640000000
```

---

## プラン情報ヘッダー

すべてのレスポンスには、現在のプラン情報がヘッダーに含まれます：

```
X-Plan-Name: Premium
X-Plan-Tier: PREMIUM
X-Plan-Expires-At: 2025-12-31T23:59:59Z
X-Plan-Max-Concurrent-Posts: 50
X-Plan-Max-Posts-Per-Day: 1000
X-Plan-Max-Schedule-Days: 90
X-Plan-Min-Schedule-Interval: 1
X-Plan-Max-Thread-Posts: 25
X-Plan-Max-Images-Per-Post: 4
```

---

## Lexicon スキーマ

Chronosky XRPC API のすべてのメソッドは、AT
Protocol の Lexicon スキーマで定義されています。スキーマはカスタム API 経由で取得できます：

**個別スキーマの取得:**

```
GET https://api.chronosky.app/lexicons/{nsid}
```

例:

```
GET https://api.chronosky.app/lexicons/app.chronosky.schedule.createPost
```

**利用可能なスキーマ一覧:**

```
GET https://api.chronosky.app/lexicons
```

詳細は [Lexicon Documentation](./lexicon-schemas.md) を参照してください。

---

## サポート

- **ドキュメント**: https://docs.chronosky.example.com
- **GitHub Issues**: https://github.com/chronosky/chronosky/issues
- **サポートメール**: support@chronosky.example.com
