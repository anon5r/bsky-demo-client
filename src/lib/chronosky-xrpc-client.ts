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

export interface ContentLabels {
  sexual?: boolean;
  nudity?: boolean;
  porn?: boolean;
  'graphic-media'?: boolean;
  violence?: boolean;
}

export interface ThreadPostItem {
  content: string;
  languages?: string[];
  facets?: any[];
  contentLabels?: ContentLabels; // Changed from labels to contentLabels with boolean flags
  embed?: {
    $type: string;
    images?: Array<{
      alt: string;
      image: BlobRef;
    }>;
    [key: string]: any;
  };
}

// Type definitions based on the NEW guide
export interface CreateScheduleRequest {
  text?: string; // Backward compatibility, posts is preferred
  posts?: ThreadPostItem[];
  scheduledAt: string;
  parentPostRecordKey?: string;
  threadgateRules?: Array<'mention' | 'follower' | 'following'>;
  disableQuotePosts?: boolean;
}

export interface CreateScheduleResponse {
  success: boolean;
  postIds: string[];
  scheduledAt: string;
  status: string;
  postCount: number;
}

export interface ListSchedulesRequest {
  status?: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  page?: number;
  limit?: number;
}

export interface ScheduledPost {
  id: string;
  content: string;
  scheduledAt: string;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  parentPostId?: string;
  threadOrder?: number;
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

export interface UpdateScheduleRequest {
  id: string;
  content?: string;
  scheduledAt?: string;
  languages?: string[];
  facets?: any[];
  embed?: any;
}

export interface UpdateScheduleResponse {
  post: ScheduledPost;
}

export interface DeleteScheduleRequest {
  id: string;
}

export interface DeleteScheduleResponse {
  success: boolean;
}

export interface ErrorResponse {
  error: string;
  message: string;
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

  private async request<T>(method: string, endpoint: string, body?: any, params?: URLSearchParams, headers: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}/xrpc/${endpoint}`);
    if (params) {
      url.search = params.toString();
    }

    const defaultHeaders: Record<string, string> = {};
    if (!(body instanceof Blob || body instanceof ArrayBuffer || body instanceof Uint8Array)) {
        defaultHeaders['Content-Type'] = 'application/json';
    }

    const finalHeaders = { ...defaultHeaders, ...headers };
    const finalBody = (body instanceof Blob || body instanceof ArrayBuffer || body instanceof Uint8Array) 
        ? body 
        : (body ? JSON.stringify(body) : undefined);

    const response = await this.fetchHandler(url.toString(), {
      method: method.toUpperCase(),
      headers: finalHeaders,
      body: finalBody as any,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'UNKNOWN', message: response.statusText }));
      const error = new Error(errorData.message || `API Error: ${response.status}`);
      (error as any).error = errorData.error;
      (error as any).status = response.status;
      throw error;
    }

    return response.json();
  }

  async uploadBlob(blob: Blob): Promise<UploadBlobResponse> {
    return this.request(
      'POST',
      'app.chronosky.media.uploadBlob',
      blob,
      undefined,
      { 'Content-Type': blob.type }
    );
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

  async updatePost(input: UpdateScheduleRequest): Promise<UpdateScheduleResponse> {
    return this.request('POST', 'app.chronosky.schedule.updatePost', input);
  }

  async deletePost(input: DeleteScheduleRequest): Promise<DeleteScheduleResponse> {
    return this.request('POST', 'app.chronosky.schedule.deletePost', input);
  }
}