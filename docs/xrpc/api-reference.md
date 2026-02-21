# XRPC API リファレンス

Chronosky XRPC API は AT Protocol 標準の XRPC (Cross-system Remote Procedure
Call) プロトコルに準拠した API です。

## 概要

- **ベース URL**: `https://api.chronosky.app/xrpc` (本番環境)
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

## エンドポイント一覧

### スケジュール投稿管理

- [app.chronosky.schedule.createPost](#appchronoskyschedulecreatepost) - 投稿をスケジュール
- [app.chronosky.schedule.listPosts](#appchronoskyschedulelistposts) - 投稿一覧を取得
- [app.chronosky.schedule.getPost](#appchronoskyschedulegetpost) - 投稿詳細を取得
- [app.chronosky.schedule.updatePost](#appchronoskyscheduleupdatepost) - 投稿を更新
- [app.chronosky.schedule.deletePost](#appchronoskyscheduledeletepost) - 投稿を削除

### メディアアップロード

- [app.chronosky.media.uploadBlob](#appchronoskymediauploadblob) - 画像をアップロード

### プラン管理

- [app.chronosky.plan.getUsage](#appchronoskyplangetusage) - プラン使用状況を取得

---

## スケジュール投稿管理

### app.chronosky.schedule.createPost

スケジュールされた投稿を作成します。単一投稿またはスレッド（複数投稿）を作成できます。

**メソッド**: `POST` **パス**: `/xrpc/app.chronosky.schedule.createPost`

#### リクエストボディ

```typescript
{
  text?: string;                     // 単一投稿時のテキスト
  posts?: Array<{                    // スレッド（複数投稿）時のリスト
    text: string;
    langs?: string[];
    facets?: Facet[];
    embed?: EmbedUnion;
    labels?: SelfLabels;
  }>;
  scheduledAt: string;               // ISO 8601 形式の日時
  parentPostId?: string;             // リプライ先の投稿 ID (任意)
  threadgateRules?: Array<{          // スレッドゲート設定 (任意)
    $type: 'app.bsky.feed.threadgate#mentionRule' | 
           'app.bsky.feed.threadgate#followerRule' | 
           'app.bsky.feed.threadgate#followingRule' |
           'app.bsky.feed.threadgate#listRule';
    list?: string;
  }>;
  disableQuotePosts?: boolean;       // 引用投稿を無効化 (任意)
}
```

#### レスポンス

```typescript
{
  success: boolean;
  postIds: string[]; // 作成された投稿の ID リスト
  scheduledAt: string; // スケジュール日時 (ISO 8601)
}
```

---

### app.chronosky.schedule.listPosts

スケジュールされた投稿の一覧を取得します。

**メソッド**: `GET` **パス**: `/xrpc/app.chronosky.schedule.listPosts`

#### クエリパラメータ

- `status` (任意): 投稿のステータス (`PENDING`, `EXECUTING`, `COMPLETED`, `FAILED`, `CANCELLED`)
- `limit` (任意): 取得件数 (デフォルト: 50、最大: 100)
- `page` (任意): ページ番号

#### レスポンス

```typescript
{
  posts: Array<{
    id: string;
    text: string;
    scheduledAt: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    // ... その他詳細フィールド
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

### app.chronosky.schedule.getPost

スケジュールされた投稿の詳細を取得します。

**メソッド**: `GET` **パス**: `/xrpc/app.chronosky.schedule.getPost`

#### クエリパラメータ

- `id` (必須): 投稿 ID

#### レスポンス

```typescript
{
  post: {
    id: string;
    text: string;
    scheduledAt: string;
    status: string;
    // ... その他詳細フィールド
  }
}
```

---

### app.chronosky.schedule.updatePost

スケジュールされた投稿を更新します。

**メソッド**: `POST` **パス**: `/xrpc/app.chronosky.schedule.updatePost`

#### リクエストボディ

```typescript
{
  id: string;                        // 更新する投稿の ID
  text?: string;
  langs?: string[];
  scheduledAt?: string;
  facets?: Facet[];
  embed?: any;
  labels?: SelfLabels;
}
```

#### レスポンス

```typescript
{
  post: {
    id: string;
    text: string;
    scheduledAt: string;
    status: string;
    updatedAt: string;
  }
}
```

---

### app.chronosky.schedule.deletePost

スケジュールされた投稿を削除します。

**メソッド**: `POST` **パス**: `/xrpc/app.chronosky.schedule.deletePost`

#### リクエストボディ

```typescript
{
  id: string; // 削除する投稿の ID
}
```

#### レスポンス

```typescript
{
  success: boolean;
}
```

---

## メディアアップロード

### app.chronosky.media.uploadBlob

画像をアップロードして blob 参照を取得します。

**メソッド**: `POST` **パス**: `/xrpc/app.chronosky.media.uploadBlob`

#### レスポンス

```typescript
{
  blob: {
    $type: 'blob';
    ref: { $link: string };
    mimeType: string;
    size: number;
  }
}
```

---

## プラン管理

### app.chronosky.plan.getUsage

プランの使用状況を取得します。

**メソッド**: `GET` **パス**: `/xrpc/app.chronosky.plan.getUsage`

#### レスポンス

```typescript
{
  usage: {
    concurrentPosts: number; // 現在の保留中投稿数
    postsToday: number; // 本日の投稿数
  }
}
```
