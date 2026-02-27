import { supabaseAdmin } from '../lib/supabase';
import { logger } from '../lib/logger';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
  badge?: number;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * pushService
 * ─────────────────────────────────────────────────────────────────────
 * Sends Expo push notifications from the server.
 *
 * Why server-side:
 *  - Token lookup uses service role key — clients can never enumerate tokens
 *  - Rate limiting and abuse prevention at the API layer
 *  - Push events are auditable
 *  - Client never touches Expo push infrastructure directly
 */
export const pushService = {

  /**
   * Send a notification to a single user.
   * Looks up all their registered push tokens from push_tokens table.
   * Fire-and-forget — never throws, always logs failures.
   */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data: Record<string, unknown> = {}
  ): Promise<void> {
    // Fetch all push tokens for this user (may be on multiple devices)
    const { data: rows, error } = await supabaseAdmin
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId);

    if (error) {
      logger.warn('pushService: failed to fetch tokens', { userId, error: error.message });
      return;
    }

    if (!rows || rows.length === 0) {
      logger.debug('pushService: no tokens for user', { userId });
      return;
    }

    const messages: PushPayload[] = rows.map(({ token }: { token: string }) => ({
      to: token,
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
    }));

    await pushService._sendBatch(messages, userId);
  },

  /**
   * Send to multiple users at once (e.g. notify all passengers on a ride).
   * Batches into a single Expo API call.
   */
  async sendToUsers(
    userIds: string[],
    title: string,
    body: string,
    data: Record<string, unknown> = {}
  ): Promise<void> {
    if (userIds.length === 0) return;

    const { data: rows, error } = await supabaseAdmin
      .from('push_tokens')
      .select('token, user_id')
      .in('user_id', userIds);

    if (error) {
      logger.warn('pushService: failed to fetch tokens for batch', { error: error.message });
      return;
    }
    if (!rows || rows.length === 0) return;

    const messages: PushPayload[] = rows.map(({ token }: { token: string }) => ({
      to: token,
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
    }));

    await pushService._sendBatch(messages, `[${userIds.join(',')}]`);
  },

  /**
   * Internal: send a batch of messages to Expo push API.
   * Expo accepts up to 100 messages per request.
   */
  async _sendBatch(messages: PushPayload[], logLabel: string): Promise<void> {
    // Chunk into batches of 100 (Expo limit)
    const CHUNK_SIZE = 100;
    for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
      const chunk = messages.slice(i, i + CHUNK_SIZE);

      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
          body: JSON.stringify(chunk),
        });

        const json = await res.json() as { data: ExpoTicket[] };

        // Log any per-token errors from Expo
        const failed = json.data?.filter(t => t.status === 'error') ?? [];
        if (failed.length > 0) {
          logger.warn('pushService: Expo reported ticket errors', {
            userId: logLabel,
            failed: failed.map(t => ({ message: t.message, error: t.details?.error })),
          });
        } else {
          logger.debug('pushService: sent batch', { userId: logLabel, count: chunk.length });
        }
      } catch (err) {
        // Never crash the main request — push is best-effort
        logger.error('pushService: failed to send batch', {
          userId: logLabel,
          error: (err as Error).message,
        });
      }
    }
  },
};
