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

export interface SelfLabels {
  $type: 'com.atproto.label.defs#selfLabels';
  values: Array<{ val: string }>;
}

export interface ThreadPostItem {
  text: string;
  langs?: string[];
  facets?: any[];
  labels?: SelfLabels;
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
  text?: string; // Simple single post content
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
  embed?: {
    $type: string;
    images?: Array<{
      alt: string;
      image: BlobRef;
    }>;
    external?: {
      uri: string;
      title: string;
      description: string;
      thumb?: BlobRef;
    };
    record?: {
      uri: string;
      cid: string;
    };
    [key: string]: any;
  };
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
  text?: string;
  scheduledAt?: string;
  langs?: string[];
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
    const hasBody = body instanceof Blob || body instanceof ArrayBuffer || body instanceof Uint8Array || body;
    
    if (hasBody && !(body instanceof Blob || body instanceof ArrayBuffer || body instanceof Uint8Array)) {
        defaultHeaders['Content-Type'] = 'application/json';
    }

    const finalHeaders = { ...defaultHeaders, ...headers };
    const finalBody = (body instanceof Blob || body instanceof ArrayBuffer || body instanceof Uint8Array) 
        ? body 
        : (body ? JSON.stringify(body) : undefined);

    console.log(`ChronoskyClient: Requesting ${method} ${url.toString()}`);
    // Note: We cannot see headers added by fetchHandler easily as they are added internally.
    // But we can verify if the fetchHandler itself is working.
    
    const response = await this.fetchHandler(url.toString(), {
      method: method.toUpperCase(),
      headers: finalHeaders,
      body: finalBody as any,
    });

    if (!response.ok) {
      console.error(`ChronoskyClient: Error ${response.status} ${response.statusText}`);
      const errorData = await response.json().catch(() => ({ error: 'UNKNOWN', message: response.statusText }));
      console.error('ChronoskyClient: Error Details:', errorData);
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