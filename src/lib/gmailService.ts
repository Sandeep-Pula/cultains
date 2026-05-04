const gmailClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
const gmailScopes = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
].join(' ');

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type GoogleIdentityWindow = Window & {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (response: GoogleTokenResponse) => void;
        }) => GoogleTokenClient;
      };
    };
  };
};

export type GmailMailboxKey = 'INBOX' | 'SENT' | 'DRAFT' | 'SPAM' | 'TRASH' | 'STARRED' | 'ALL';

export type GmailMessageSummary = {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  labelIds: string[];
};

export type GmailMessageDetail = GmailMessageSummary & {
  to: string;
  bodyText: string;
};

export type GmailLabel = {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
};

type GmailMessagePayload = {
  headers?: Array<{ name: string; value: string }>;
  body?: { data?: string };
  parts?: GmailMessagePayload[];
};

type GmailMessageApiResponse = {
  id: string;
  threadId: string;
  snippet?: string;
  labelIds?: string[];
  payload?: GmailMessagePayload;
};

const loadGoogleIdentityScript = () =>
  new Promise<void>((resolve, reject) => {
    if ((window as GoogleIdentityWindow).google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Unable to load Google Identity Services.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Google Identity Services.'));
    document.head.appendChild(script);
  });

const getHeader = (payload: GmailMessagePayload | undefined, headerName: string) =>
  payload?.headers?.find((header) => header.name.toLowerCase() === headerName.toLowerCase())?.value || '';

const decodeBase64Url = (value = '') => {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
};

const getBodyText = (payload?: GmailMessagePayload): string => {
  if (!payload) return '';
  const directBody = decodeBase64Url(payload.body?.data);
  if (directBody.trim()) return directBody;
  const plainPart = payload.parts?.find((part) =>
    part.headers?.some((header) => header.name.toLowerCase() === 'content-type' && header.value.toLowerCase().includes('text/plain')),
  );
  const plainBody = decodeBase64Url(plainPart?.body?.data);
  if (plainBody.trim()) return plainBody;
  return payload.parts?.map(getBodyText).find((part) => part.trim()) || '';
};

const toSummary = (message: GmailMessageApiResponse): GmailMessageSummary => ({
  id: message.id,
  threadId: message.threadId,
  from: getHeader(message.payload, 'From'),
  subject: getHeader(message.payload, 'Subject') || '(No subject)',
  date: getHeader(message.payload, 'Date'),
  snippet: message.snippet || '',
  labelIds: message.labelIds || [],
});

const encodeRawEmail = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const gmailFetch = async <T>(accessToken: string, path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Gmail API request failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
};

export const gmailService = {
  isConfigured: Boolean(gmailClientId),

  async connect(prompt: 'consent' | '' = 'consent') {
    if (!gmailClientId) {
      throw new Error('Missing VITE_GOOGLE_CLIENT_ID. Add a Google OAuth web client ID and restart the dev server.');
    }

    await loadGoogleIdentityScript();
    const google = (window as GoogleIdentityWindow).google?.accounts?.oauth2;
    if (!google) {
      throw new Error('Google Identity Services did not initialize.');
    }

    return new Promise<string>((resolve, reject) => {
      const tokenClient = google.initTokenClient({
        client_id: gmailClientId,
        scope: gmailScopes,
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (!response.access_token) {
            reject(new Error('Google did not return a Gmail access token.'));
            return;
          }
          resolve(response.access_token);
        },
      });
      tokenClient.requestAccessToken({ prompt });
    });
  },

  async getProfile(accessToken: string) {
    return gmailFetch<{ emailAddress: string; messagesTotal: number; threadsTotal: number }>(accessToken, '/profile');
  },

  async listLabels(accessToken: string) {
    const response = await gmailFetch<{ labels?: GmailLabel[] }>(accessToken, '/labels');
    return response.labels || [];
  },

  async listMessages(accessToken: string, mailbox: GmailMailboxKey, query = '') {
    const params = new URLSearchParams({
      maxResults: '20',
      includeSpamTrash: mailbox === 'SPAM' || mailbox === 'TRASH' ? 'true' : 'false',
    });
    if (mailbox !== 'ALL') params.append('labelIds', mailbox);
    if (query.trim()) params.set('q', query.trim());

    const listed = await gmailFetch<{ messages?: Array<{ id: string; threadId: string }> }>(accessToken, `/messages?${params.toString()}`);
    const messages = listed.messages || [];
    const details = await Promise.all(messages.map((message) =>
      gmailFetch<GmailMessageApiResponse>(
        accessToken,
        `/messages/${message.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      ),
    ));
    return details.map(toSummary);
  },

  async getMessage(accessToken: string, messageId: string): Promise<GmailMessageDetail> {
    const message = await gmailFetch<GmailMessageApiResponse>(accessToken, `/messages/${messageId}?format=full`);
    return {
      ...toSummary(message),
      to: getHeader(message.payload, 'To'),
      bodyText: getBodyText(message.payload),
    };
  },

  async sendMessage(accessToken: string, payload: { to: string; subject: string; body: string }) {
    const raw = [
      `To: ${payload.to}`,
      `Subject: ${payload.subject || '(No subject)'}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      payload.body,
    ].join('\r\n');
    return gmailFetch<{ id: string; threadId: string }>(accessToken, '/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw: encodeRawEmail(raw) }),
    });
  },

  async markRead(accessToken: string, messageId: string) {
    return gmailFetch(accessToken, `/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
    });
  },

  async markUnread(accessToken: string, messageId: string) {
    return gmailFetch(accessToken, `/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({ addLabelIds: ['UNREAD'] }),
    });
  },

  async archive(accessToken: string, messageId: string) {
    return gmailFetch(accessToken, `/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({ removeLabelIds: ['INBOX'] }),
    });
  },

  async moveToSpam(accessToken: string, messageId: string) {
    return gmailFetch(accessToken, `/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({ addLabelIds: ['SPAM'], removeLabelIds: ['INBOX'] }),
    });
  },

  async trash(accessToken: string, messageId: string) {
    return gmailFetch(accessToken, `/messages/${messageId}/trash`, { method: 'POST' });
  },
};
