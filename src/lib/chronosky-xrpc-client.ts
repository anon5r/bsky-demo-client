const CHRONOSKY_API_URL = import.meta.env.VITE_CHRONOSKY_API_URL || 'https://api.chronosky.app';

export interface BlobRef {
  $type: 'blob';
  ref: { $link: string };
  mimeType: string;
  size: number;
}

export interface UploadBlobResponse {
  blob: BlobRef;
}

export interface SelfLabels {
  $type: 'com.atproto.label.defs#selfLabels';
  values: Array<{ val: string }>;
}

export interface ThreadPostItem {
  text: string;
  langs?: string[];
  facets?: any[];
  labels?: SelfLabels;
  reply?: {
    root: { uri: string; cid: string };
    parent: { uri: string; cid: string };
  };
  embed?: any;
}

export interface CreateScheduleRequest {
  text?: string;
  posts?: ThreadPostItem[];
  scheduledAt: string;
  parentPostId?: string;
  threadgateRules?: Array<
    | { $type: 'app.bsky.feed.threadgate#mentionRule' }
    | { $type: 'app.bsky.feed.threadgate#followerRule' }
    | { $type: 'app.bsky.feed.threadgate#followingRule' }
    | { $type: 'app.bsky.feed.threadgate#listRule'; list: string }
  >;
  disableQuotePosts?: boolean;
}

export interface CreateScheduleResponse {
  success: boolean;
  postIds: string[];
  scheduledAt: string;
}

export interface ListSchedulesRequest {
  status?: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  page?: number;
  limit?: number;
}

export interface ScheduledPost {
  id: string;
  text: string;
  langs?: string[];
  scheduledAt: string;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  parentPostId?: string;
  threadOrder?: number;
  facets?: any[];
  labels?: SelfLabels;
  disableQuotePosts?: boolean;
  embed?: any;
}

export interface ListSchedulesResponse {
  posts: ScheduledPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdatePostRequest {
  id: string;
  text?: string;
  langs?: string[];
  scheduledAt?: string;
  facets?: any[];
  embed?: any;
  labels?: SelfLabels;
}

export interface UpdatePostResponse {
  post: ScheduledPost;
}

export interface PlanAssignment {
  planId: string;
  planName: string;
  tier: string;
  expiresAt?: string;
  limits: {
    maxConcurrentPosts: number;
    maxPostsPerDay: number;
    maxScheduleDays: number;
    minScheduleInterval: number;
    maxThreadPosts: number;
    maxImagesPerPost: number;
  };
}

export interface GetAssignmentResponse {
  assignment: PlanAssignment | null;
}

export interface PlanUsage {
  concurrentPosts: number;
  postsToday: number;
}

export interface GetUsageResponse {
  usage: PlanUsage;
}

export interface DeleteScheduleRequest {
  id: string;
}

export interface DeleteScheduleResponse {
  success: boolean;
}

/**
 * Chronosky XRPC Client
 * Uses the authenticated fetch handler from Bluesky OAuth session.
 */
export class ChronoskyClient {
  private fetchHandler: (url: string, init?: RequestInit) => Promise<Response>;
  private baseUrl: string;

  constructor(
    fetchHandler: (url: string, init?: RequestInit) => Promise<Response>,
    baseUrl: string = CHRONOSKY_API_URL
  ) {
    this.fetchHandler = fetchHandler;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any,
    params?: URLSearchParams,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/xrpc/${endpoint}`);
    if (params) {
      url.search = params.toString();
    }

    const defaultHeaders: Record<string, string> = {};
    const hasBody =
      body instanceof Blob || body instanceof ArrayBuffer || body instanceof Uint8Array || body;

    if (hasBody && !(body instanceof Blob || body instanceof ArrayBuffer || body instanceof Uint8Array)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const finalHeaders = {
      ...defaultHeaders,
      ...headers,
    };
    const finalBody =
      body instanceof Blob || body instanceof ArrayBuffer || body instanceof Uint8Array
        ? body
        : body
        ? JSON.stringify(body)
        : undefined;

    const response = await this.fetchHandler(url.toString(), {
      method: method.toUpperCase(),
      headers: finalHeaders,
      body: finalBody as any,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: 'UNKNOWN', message: response.statusText }));
      const error = new Error(errorData.message || `API Error: ${response.status}`);
      (error as any).error = errorData.error;
      (error as any).status = response.status;
      throw error;
    }

    return response.json();
  }

  async uploadBlob(blob: Blob): Promise<UploadBlobResponse> {
    return this.request('POST', 'app.chronosky.media.uploadBlob', blob, undefined, {
      'Content-Type': blob.type,
    });
  }

  async createPost(input: CreateScheduleRequest): Promise<CreateScheduleResponse> {
    return this.request('POST', 'app.chronosky.schedule.createPost', input);
  }

  async listPosts(input?: ListSchedulesRequest): Promise<ListSchedulesResponse> {
    const params = new URLSearchParams();
    if (input?.status) params.append('status', input.status);
    if (input?.page) params.append('page', input.page.toString());
    if (input?.limit) params.append('limit', input.limit.toString());

    return this.request('GET', 'app.chronosky.schedule.listPosts', undefined, params);
  }

  async updatePost(input: UpdatePostRequest): Promise<UpdatePostResponse> {
    return this.request('POST', 'app.chronosky.schedule.updatePost', input);
  }

  async deletePost(input: { id: string }): Promise<DeleteScheduleResponse> {
    return this.request('POST', 'app.chronosky.schedule.deletePost', input);
  }

  async getAssignment(): Promise<GetAssignmentResponse> {
    return this.request('GET', 'app.chronosky.plan.getAssignment');
  }

  async getUsage(): Promise<GetUsageResponse> {
    return this.request('GET', 'app.chronosky.plan.getUsage');
  }
}

