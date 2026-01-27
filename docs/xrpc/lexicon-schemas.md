# Chronosky Lexicon スキーマ

Chronosky XRPC API のすべてのメソッドは、AT
Protocol の Lexicon スキーマで定義されています。

## Lexicon とは

Lexicon は AT
Protocol におけるスキーマ定義言語で、API のインターフェースを形式的に記述します。これにより、以下のメリットがあります：

- **型安全性**: クライアントライブラリの自動生成が可能
- **相互運用性**: 異なる実装間での互換性確保
- **ドキュメント**: 自動的にドキュメント生成可能
- **バリデーション**: リクエスト/レスポンスの自動検証

## NSID について

Lexicon の NSID (Namespaced Identifier) は、逆ドメイン形式で記述されます。

**Chronosky の NSID:**

- `app.chronosky.schedule.*` - スケジュール投稿管理
- `app.chronosky.plan.*` - プラン管理
- `app.chronosky.media.*` - メディアアップロード

**注意:** AT
Protocol 仕様では、Lexicon スキーマは atproto リポジトリ (`did:plc:*/com.atproto.lexicon.schema/*`) または DNS
TXT レコード (`_lexicon.*`) で公開することが推奨されています。Chronosky では、これらの標準的な方法に加えて、開発者向けの利便性のために XRPC エンドポイント経由でのアクセスも提供しています。

## スキーマの取得方法

### カスタム API エンドポイント経由

Chronosky は開発者の利便性のために、カスタム API 経由で Lexicon スキーマを提供しています：

**個別スキーマの取得:**

```
GET https://api.chronosky.app/lexicons/{nsid}
```

例:

```bash
curl https://api.chronosky.app/lexicons/app.chronosky.schedule.createPost
```

**利用可能なスキーマ一覧の取得:**

```
GET https://api.chronosky.app/lexicons
```

レスポンス:

```json
{
  "lexicons": [
    "app.chronosky.schedule.createPost",
    "app.chronosky.schedule.listPosts",
    ...
  ],
  "count": 11
}
```

**注意:** このエンドポイントは AT
Protocol 標準ではなく、Chronosky 独自の実装です。AT Protocol 標準の方法（DNS
TXT レコードと atproto リポジトリ）は別途実装されます。

### AT Protocol 標準の方法

**DNS TXT レコード** と **atproto リポジトリ** 経由での公開は別途設定されます：

- DNS TXT レコード: `_lexicon.chronosky.app`
- atproto リポジトリ: `did:plc:xxxxxxxx/com.atproto.lexicon.schema/*`

## 定義済みスキーマ一覧

### スケジュール投稿管理

#### app.chronosky.schedule.createPost

投稿をスケジュールする procedure メソッドです。

**NSID**: `app.chronosky.schedule.createPost` **種類**: `procedure`

**Input:**

- `posts` (required): `ThreadPostItem[]` - 投稿内容の配列
- `scheduledAt` (required): `string` - ISO 8601 形式の日時
- `threadgateRules` (optional): `string[]` - スレッドゲート設定
- `disableQuotePosts` (optional): `boolean` - 引用投稿を無効化

**Output:**

- `id`: `string` - 作成された投稿の ID
- `scheduledAt`: `string` - スケジュール日時
- `postCount`: `integer` - 作成された投稿数

**Errors:**

- `ValidationError` - リクエストパラメータが不正
- `PlanLimitError` - プラン制限超過
- `RateLimitError` - レート制限超過

---

#### app.chronosky.schedule.listPosts

スケジュールされた投稿一覧を取得する query メソッドです。

**NSID**: `app.chronosky.schedule.listPosts` **種類**: `query`

**Parameters:**

- `status` (optional): `string` - 投稿ステータスでフィルタリング
- `limit` (optional): `integer` - 取得件数 (最大 100)
- `cursor` (optional): `string` - ページネーション用カーソル

**Output:**

- `posts`: `ScheduledPost[]` - 投稿の配列
- `cursor` (optional): `string` - 次のページがある場合のカーソル

---

#### app.chronosky.schedule.getPost

投稿詳細を取得する query メソッドです。

**NSID**: `app.chronosky.schedule.getPost` **種類**: `query`

**Parameters:**

- `postId` (required): `string` - 投稿 ID

**Output:**

- `post`: `ScheduledPost` - 投稿詳細

**Errors:**

- `NotFoundError` - 投稿が見つからない

---

#### app.chronosky.schedule.updatePost

投稿を更新する procedure メソッドです。

**NSID**: `app.chronosky.schedule.updatePost` **種類**: `procedure`

**Input:**

- `postId` (required): `string` - 更新する投稿の ID
- `posts` (optional): `ThreadPostItem[]` - 更新する投稿内容
- `scheduledAt` (optional): `string` - 更新するスケジュール日時
- `threadgateRules` (optional): `string[]` - スレッドゲート設定
- `disableQuotePosts` (optional): `boolean` - 引用投稿を無効化

**Output:**

- `post`: `ScheduledPost` - 更新された投稿

**Errors:**

- `NotFoundError` - 投稿が見つからない
- `ValidationError` - リクエストパラメータが不正

---

#### app.chronosky.schedule.deletePost

投稿を削除する procedure メソッドです。

**NSID**: `app.chronosky.schedule.deletePost` **種類**: `procedure`

**Input:**

- `postId` (required): `string` - 削除する投稿の ID

**Output:**

- `success`: `boolean` - 削除成功フラグ

**Errors:**

- `NotFoundError` - 投稿が見つからない

---

#### app.chronosky.schedule.retryFailedPosts

失敗した投稿を再試行する procedure メソッドです。

**NSID**: `app.chronosky.schedule.retryFailedPosts` **種類**: `procedure`

**Input:** (空のオブジェクト)

**Output:**

- `retriedCount`: `integer` - 再試行した投稿数

---

### メディアアップロード

#### app.chronosky.media.uploadBlob

画像をアップロードする procedure メソッドです。

**NSID**: `app.chronosky.media.uploadBlob` **種類**: `procedure`

**Input:**

- Content-Type: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Body: バイナリ画像データ

**Output:**

- `blob`: `BlobRef` - アップロードされた画像の blob 参照

**Errors:**

- `ValidationError` - 画像が不正 (形式、サイズなど)
- `PlanLimitError` - プラン制限超過

---

### プラン管理

#### app.chronosky.plan.getAssignment

アクティブなプラン割り当てを取得する query メソッドです。

**NSID**: `app.chronosky.plan.getAssignment` **種類**: `query`

**Parameters:** (なし)

**Output:**

- `assignment` (nullable): `PlanAssignment` - プラン割り当て情報

---

#### app.chronosky.plan.listAssignments

プラン割り当て履歴を取得する query メソッドです。

**NSID**: `app.chronosky.plan.listAssignments` **種類**: `query`

**Parameters:**

- `limit` (optional): `integer` - 取得件数 (最大 100)
- `cursor` (optional): `string` - ページネーション用カーソル

**Output:**

- `assignments`: `PlanAssignment[]` - プラン割り当ての配列
- `cursor` (optional): `string` - 次のページがある場合のカーソル

---

#### app.chronosky.plan.getUsage

プラン使用状況を取得する query メソッドです。

**NSID**: `app.chronosky.plan.getUsage` **種類**: `query`

**Parameters:**

- `period` (optional): `string` - 集計期間 (`DAILY`, `MONTHLY`)

**Output:**

- `usage`: `UsageStats` - 使用状況統計

---

#### app.chronosky.plan.redeemTicket

チケットを使用してプランを有効化する procedure メソッドです。

**NSID**: `app.chronosky.plan.redeemTicket` **種類**: `procedure`

**Input:**

- `ticketCode` (required): `string` - チケットコード

**Output:**

- `assignment`: `PlanAssignment` - 有効化されたプラン割り当て

**Errors:**

- `NotFoundError` - チケットが見つからない
- `ValidationError` - チケットが無効 (使用済み、期限切れなど)

---

## 共通型定義

### ThreadPostItem

投稿内容を表す型です。

```typescript
{
  text: string;                      // 投稿テキスト (最大 300 文字)
  langs?: string[];                  // 言語コード (ISO 639-1、最大 3 つ)
  facets?: Facet[];                  // リッチテキスト装飾
  embed?: EmbedUnion;                // 埋め込みメディア
  labels?: SelfLabels;               // コンテンツラベル
}
```

**バリデーション:**

- `text` が空の場合、`embed` は必須
- `text` の最大長は 300 文字
- `langs` の最大要素数は 3
- `facets` の最大要素数は 50

---

### Facet

リッチテキストの装飾を表す型です。

```typescript
{
  index: {
    byteStart: integer; // バイト単位の開始位置
    byteEnd: integer; // バイト単位の終了位置
  }
  features: Array<
    // 装飾の種類
    | { $type: 'app.bsky.richtext.facet#mention'; did: string }
    | { $type: 'app.bsky.richtext.facet#link'; uri: string }
    | { $type: 'app.bsky.richtext.facet#tag'; tag: string }
  >;
}
```

---

### EmbedUnion

埋め込みメディアを表す union 型です。

```typescript
| {
    $type: 'app.bsky.embed.images';
    images: Array<{
      alt: string;
      image: BlobRef;
    }>;
  }
| {
    $type: 'app.bsky.embed.external';
    external: {
      uri: string;
      title: string;
      description: string;
      thumb?: BlobRef;
    };
  }
| {
    $type: 'app.bsky.embed.record';
    record: {
      uri: string;
      cid: string;
    };
  }
| {
    $type: 'app.bsky.embed.recordWithMedia';
    record: {
      record: {
        uri: string;
        cid: string;
      };
    };
    media: EmbedUnion;                // images または external
  }
```

---

### SelfLabels

コンテンツラベルを表す型です。

```typescript
{
  $type: 'com.atproto.label.defs#selfLabels';
  values: Array<{ val: string }>;
}
```

**有効な値:**

- `porn` - アダルトコンテンツ
- `sexual` - 性的なコンテンツ
- `nudity` - ヌード
- `graphic-media` - グラフィックコンテンツ

---

### BlobRef

Blob 参照を表す型です。

```typescript
{
  $type: 'blob';
  ref: {
    $link: string;
  } // CID (Content Identifier)
  mimeType: string; // MIME タイプ
  size: integer; // バイト単位のサイズ
}
```

---

### ScheduledPost

スケジュールされた投稿を表す型です。

```typescript
{
  id: string;                        // 投稿 ID
  text: string;                      // 投稿テキスト
  scheduledAt: string;               // スケジュール日時 (ISO 8601)
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: string;                 // 作成日時
  updatedAt: string;                 // 更新日時
  langs?: string[];
  facets?: Facet[];
  embed?: EmbedUnion;
  labels?: SelfLabels;
  threadgateRules?: string[];
  disableQuotePosts?: boolean;
  error?: string;                    // エラーメッセージ (ある場合)
  retryCount?: integer;              // 再試行回数
}
```

---

### PlanAssignment

プラン割り当てを表す型です。

```typescript
{
  id: string;                        // 割り当て ID
  planId: string;                    // プラン ID
  planName: string;                  // プラン名
  tier: 'FREE' | 'PREMIUM' | 'PROFESSIONAL';
  activatedAt: string;               // 有効化日時
  expiresAt: string | null;          // 有効期限 (null の場合は無期限)
  limits: PlanLimits;                // プラン制限
  status?: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
}
```

---

### PlanLimits

プラン制限を表す型です。

```typescript
{
  pending_posts_limit: integer; // 同時保留可能な投稿数
  monthly_posts_limit: integer; // 月間投稿数制限
  max_schedule_days: integer; // 最大スケジュール日数
  schedule_interval_minutes: integer; // 最小スケジュール間隔 (分)
  thread_posts_limit: integer; // スレッドの最大投稿数
  max_images_per_post: integer; // 1 投稿あたりの最大画像数
}
```

---

### UsageStats

使用状況統計を表す型です。

```typescript
{
  pendingPosts: integer; // 現在の保留中投稿数
  monthlyPosts: integer; // 今月の投稿数
  limits: {
    pending_posts_limit: integer;
    monthly_posts_limit: integer;
  }
  percentUsed: {
    pendingPosts: number; // 使用率 (%)
    monthlyPosts: number;
  }
}
```

---

## エラー型

### ValidationError

リクエストパラメータのバリデーションエラーです。

```typescript
{
  error: 'VALIDATION_ERROR';
  message: string; // エラーの詳細
  code: 400;
}
```

---

### PlanLimitError

プラン制限超過エラーです。

```typescript
{
  error: string; // 具体的なエラーコード
  message: string; // エラーの詳細
  limit: integer; // 制限値
  actual: integer; // 実際の値
  code: 403 | 429;
}
```

**エラーコード例:**

- `PENDING_POSTS_LIMIT_EXCEEDED` - 保留中投稿数の制限超過
- `MONTHLY_POSTS_LIMIT_EXCEEDED` - 月間投稿数の制限超過
- `THREAD_POSTS_LIMIT_EXCEEDED` - スレッドの投稿数制限超過
- `MAX_IMAGES_EXCEEDED` - 画像数の制限超過

---

### NotFoundError

リソースが見つからないエラーです。

```typescript
{
  error: 'NOT_FOUND';
  message: string;
  code: 404;
}
```

---

### RateLimitError

レート制限超過エラーです。

```typescript
{
  error: 'RATE_LIMIT_EXCEEDED';
  message: string;
  code: 429;
  retryAfter?: integer;              // 再試行までの秒数
}
```

---

## AT Protocol 標準型

Chronosky は以下の AT Protocol 標準型を使用しています：

- `app.bsky.feed.post` - 投稿の基本構造
- `app.bsky.embed.images` - 画像埋め込み
- `app.bsky.embed.external` - 外部リンク埋め込み
- `app.bsky.embed.record` - レコード埋め込み (引用投稿)
- `app.bsky.embed.recordWithMedia` - メディア付きレコード埋め込み
- `app.bsky.richtext.facet` - リッチテキスト装飾
- `com.atproto.label.defs#selfLabels` - セルフラベル

詳細は [AT Protocol Lexicon Documentation](https://atproto.com/specs/lexicon)
を参照してください。

---

## クライアントライブラリでの使用

### TypeScript

```typescript
import { BskyAgent } from '@atproto/api';

// Chronosky XRPC エンドポイントを使用
const agent = new BskyAgent({
  service: 'https://api.chronosky.example.com'
});

// OAuth で認証 (DPoP トークンを使用)
await agent.login({
  identifier: 'your-handle.bsky.social',
  password: 'your-password'
});

// XRPC メソッドを呼び出し
const result = await agent.api.app.chronosky.schedule.createPost({
  posts: [
    {
      text: 'Hello from TypeScript!',
      langs: ['en']
    }
  ],
  scheduledAt: new Date(Date.now() + 3600000).toISOString()
});

console.log(`Created post: ${result.data.id}`);
```

---

## カスタム Lexicon の作成

Chronosky の Lexicon スキーマは以下のルールに従っています：

1. **命名規則**: `app.chronosky.{category}.{method}`
2. **カテゴリ**: `schedule`, `media`, `plan`
3. **メソッド種類**: `query` (GET) または `procedure` (POST)
4. **AT Protocol 互換**: 標準型を最大限活用

カスタム Lexicon を作成する場合は、[AT Protocol Lexicon Specification](https://atproto.com/specs/lexicon)
に従ってください。

---

## 参考資料

- [AT Protocol Documentation](https://atproto.com/)
- [AT Protocol Lexicon Specification](https://atproto.com/specs/lexicon)
- [Bluesky Lexicon Schemas](https://github.com/bluesky-social/atproto/tree/main/lexicons)
- [Chronosky THIRD_PARTY_CLIENT_GUIDE.md](../../THIRD_PARTY_CLIENT_GUIDE.md)

---

## 開発者向けアクセス方法

### XRPC API エンドポイント

Chronosky は開発者の利便性のために、XRPC
API 経由で Lexicon スキーマへのアクセスを提供しています：

```bash
# 個別スキーマの取得
curl https://api.chronosky.app/lexicons/app.chronosky.schedule.createPost

# 利用可能なスキーマ一覧
curl https://api.chronosky.app/lexicons
```

### 検証方法

Lexicon スキーマが正しく取得できることを確認：

```bash
# スキーマ取得のテスト
curl https://api.chronosky.app/lexicons/app.chronosky.schedule.createPost

# レスポンスの "lexicon" フィールドが 1 であることを確認
# "id" フィールドが "app.chronosky.schedule.createPost" であることを確認
```

### トラブルシューティング

**問題**: クライアントが Lexicon を取得できない

**原因**:

- Lexicon エンドポイントへのアクセスに失敗している
- NSID が正しくない
- ネットワーク接続の問題

**解決策**:

1. 正しいエンドポイントを使用: `https://api.chronosky.app/lexicons/{nsid}`
2. NSID の形式を確認（例: `app.chronosky.schedule.createPost`）
3. API サーバーの稼働状況を確認
