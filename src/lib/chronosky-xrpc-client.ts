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

// Type definitions based on the guide
export interface CreateScheduleRequest {
  text: string;
  scheduledAt: string;
  replyTo?: {
    uri: string;
    cid: string;
  };
  images?: {
    blob: BlobRef;
    alt?: string;
  }[];
  langs?: string[];
  labels?: {
    values: { val: string }[];
  };
}

export interface CreateScheduleResponse {
  uri: string;
  cid: string;
  scheduledAt: string;
}

export interface ListSchedulesRequest {
  limit?: number;
  cursor?: string;
  status?: 'pending' | 'posted' | 'failed' | 'cancelled';
}

export interface ScheduleItem {
  uri: string;
  cid: string;
  text: string;
  scheduledAt: string;
  status: string;
  createdAt: string;
}

export interface ListSchedulesResponse {
  posts: ScheduleItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  cursor?: string;
}

export interface UpdateScheduleRequest {
  uri: string;
  text?: string;
  scheduledAt?: string;
}

export interface UpdateScheduleResponse {
  uri: string;
  cid: string;
  scheduledAt: string;
}

export interface DeleteScheduleRequest {
  uri: string;
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

    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const finalHeaders = { ...defaultHeaders, ...headers };
    
    // If body is Blob/Buffer/Uint8Array, don't stringify (and Content-Type might be set by caller)
    const isBinary = body instanceof Blob || body instanceof ArrayBuffer || body instanceof Uint8Array;
    const finalBody = isBinary ? body : (body ? JSON.stringify(body) : undefined);

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
    if (input?.limit) params.append('limit', input.limit.toString());
    if (input?.cursor) params.append('cursor', input.cursor);
    if (input?.status) params.append('status', input.status);

    return this.request('GET', 'app.chronosky.schedule.listPosts', undefined, params);
  }

  async updatePost(input: UpdateScheduleRequest): Promise<UpdateScheduleResponse> {
    return this.request('POST', 'app.chronosky.schedule.updatePost', input);
  }

  async deletePost(input: DeleteScheduleRequest): Promise<DeleteScheduleResponse> {
    return this.request('POST', 'app.chronosky.schedule.deletePost', input);
  }
}