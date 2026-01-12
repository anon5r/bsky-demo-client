import { generateDPoPProof } from './dpop';

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
 * Performs manual DPoP proof generation to ensure correct htm/htu claims.
 */
export class ChronoskyClient {
  private accessToken: string;
  private dpopKey: CryptoKeyPair;
  private baseUrl: string;

  constructor(
    accessToken: string,
    dpopKey: CryptoKeyPair,
    baseUrl: string = CHRONOSKY_API_URL
  ) {
    this.accessToken = accessToken;
    this.dpopKey = dpopKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(method: string, endpoint: string, body?: any, params?: URLSearchParams): Promise<T> {
    const url = new URL(`${this.baseUrl}/xrpc/${endpoint}`);
    if (params) {
      url.search = params.toString();
    }

    const htu = url.origin + url.pathname; // DPoP usually uses URL without query params
    const dpopProof = await generateDPoPProof({
      privateKey: this.dpopKey.privateKey,
      publicKey: this.dpopKey.publicKey,
      method: method,
      url: htu,
      accessToken: this.accessToken,
    });

    const response = await fetch(url.toString(), {
      method: method.toUpperCase(),
      headers: {
        'Authorization': `DPoP ${this.accessToken}`,
        'DPoP': dpopProof,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
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