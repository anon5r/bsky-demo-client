import { Agent } from '@atproto/api';

const CHRONOSKY_API_URL = import.meta.env.VITE_CHRONOSKY_API_URL || 'https://api.chronosky.app';

export interface CreateScheduledPostInput {
  text: string;
  scheduledAt: string;
  images?: { blob: Blob; alt?: string }[];
  langs?: string[];
}

export interface CreateScheduledThreadInput {
  posts: { text: string }[];
  scheduledAt: string;
}

export interface ScheduledPost {
  uri: string;
  cid: string;
  scheduledAt: string;
}

/**
 * Creates a scheduled post using the Chronosky XRPC API.
 * Uses the authenticated fetch handler to automatically sign requests with DPoP and Access Token.
 */
export async function createScheduledPost(
  fetchHandler: (url: string, init?: RequestInit) => Promise<Response>, 
  input: CreateScheduledPostInput
): Promise<ScheduledPost> {
  const url = new URL(`${CHRONOSKY_API_URL}/xrpc/app.chronosky.schedule.create`);
  
  const response = await fetchHandler(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Chronosky API request failed: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Creates a scheduled thread.
 * Note: The official guide currently documents 'create' for single posts.
 * We assume 'createThread' or multiple calls might be needed, but sticking to previous pattern if available.
 * If 'createThread' is not in the new guide, we might need to loop 'create'.
 * The new guide DOES NOT mention createThread. It only mentions 'create'.
 * However, 'replyTo' is supported.
 * So to schedule a thread, we likely need to chain 'create' calls?
 * BUT, if we schedule post A for T, and post B for T (replying to A), 
 * we don't have A's URI yet if it's just scheduled?
 * Actually, 'create' response returns 'uri' of the *schedule*, not the future post.
 * So we cannot chain replies for *future* posts easily unless the API supports it.
 * 
 * For now, I will comment out createScheduledThread or implement it as a loop if possible, 
 * but since the prompt asked to follow the NEW guide, and the new guide doesn't mention createThread,
 * I should probably remove it or clarify.
 * 
 * However, the user's previous request implemented thread scheduling.
 * If I remove it, I break functionality.
 * I'll keep the function signature but implement it using `app.chronosky.schedule.create` if possible,
 * or assuming `createThread` still exists on the server even if not in guide.
 * 
 * Wait, the new guide is "Third Party Client Guide". Maybe `createThread` was experimental.
 * Let's assume for now we only support single post scheduling strictly per guide, 
 * OR we assume the server still has `createThread`.
 * 
 * Let's try to keep `createScheduledThread` but mapped to what we know.
 * Actually, I will remove it for now to strictly follow the guide, 
 * OR I will leave it as is but pointing to the new URL structure if I want to be risky.
 * 
 * Safe bet: Implement `createScheduledPost` strictly per guide.
 * Update PostForm to use it.
 */