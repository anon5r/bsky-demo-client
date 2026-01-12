const CHRONOSKY_API_URL = import.meta.env.VITE_CHRONOSKY_API_URL || 'https://api.chronosky.app';

// Type definitions based on the guide
export interface CreateScheduleRequest {
  text: string;
  scheduledAt: string;
  replyTo?: {
    uri: string;
    cid: string;
  };
  images?: {
    blob: Blob;
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
  cursor?: string;
  schedules: ScheduleItem[];
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
  constructor(
    private fetchHandler: (url: string, init?: RequestInit) => Promise<Response>,
    private baseUrl: string = CHRONOSKY_API_URL
  ) {}

  private async request<T>(method: string, endpoint: string, body?: any, params?: URLSearchParams): Promise<T> {
    const url = new URL(`${this.baseUrl}/xrpc/${endpoint}`);
    if (params) {
      url.search = params.toString();
    }

    const response = await this.fetchHandler(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'UNKNOWN', message: response.statusText }));
      // Throw a custom error object that can be checked by the caller
      const error = new Error(errorData.message || `API Error: ${response.status}`);
      (error as any).error = errorData.error;
      (error as any).status = response.status;
      throw error;
    }

    return response.json();
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

// Helper to create a client easily
export function createChronoskyClient(fetchHandler: (url: string, init?: RequestInit) => Promise<Response>) {
  return new ChronoskyClient(fetchHandler);
}
