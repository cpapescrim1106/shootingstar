/**
 * Gmail Service
 * Handles OAuth2 authentication and Gmail API operations
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getOAuthToken, setOAuthToken, deleteOAuthToken } from '../db/client';

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

export interface GmailEmail {
  id: string;
  threadId: string;
  sender: string;
  subject: string;
  body: string;
  labels: string[];
}

export class GmailAuthError extends Error {
  authUrl: string;

  constructor(authUrl: string) {
    super('Gmail authentication required');
    this.name = 'GmailAuthError';
    this.authUrl = authUrl;
  }
}

export class GmailService {
  private oauth2Client: OAuth2Client;

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    }

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * Get the authorization URL for OAuth flow
   */
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to get tokens from Google');
    }

    // Store tokens in database
    setOAuthToken(
      'gmail',
      tokens.access_token,
      tokens.refresh_token,
      tokens.expiry_date?.toString() || ''
    );

    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Check if we have valid credentials
   */
  async ensureAuthenticated(): Promise<void> {
    const stored = getOAuthToken('gmail');

    if (!stored || !stored.refresh_token) {
      throw new GmailAuthError(this.getAuthUrl());
    }

    // Set credentials
    this.oauth2Client.setCredentials({
      access_token: stored.access_token,
      refresh_token: stored.refresh_token,
      expiry_date: stored.expiry ? parseInt(stored.expiry) : undefined,
    });

    // Check if token needs refresh
    const expiry = stored.expiry ? parseInt(stored.expiry) : 0;
    if (expiry < Date.now()) {
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        setOAuthToken(
          'gmail',
          credentials.access_token || '',
          credentials.refresh_token || stored.refresh_token,
          credentials.expiry_date?.toString() || ''
        );
        this.oauth2Client.setCredentials(credentials);
      } catch (error) {
        // Refresh failed, need to re-authenticate
        deleteOAuthToken('gmail');
        throw new GmailAuthError(this.getAuthUrl());
      }
    }
  }

  /**
   * Get Gmail API client
   */
  private getGmail() {
    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Fetch starred emails
   */
  async getStarredEmails(maxResults: number = 50): Promise<GmailEmail[]> {
    await this.ensureAuthenticated();

    const gmail = this.getGmail();

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:starred',
      maxResults,
    });

    const messages = response.data.messages || [];
    const emails: GmailEmail[] = [];

    for (const message of messages) {
      if (!message.id) continue;

      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
      });

      const headers = msg.data.payload?.headers || [];
      const sender = headers.find((h) => h.name?.toLowerCase() === 'from')?.value || 'Unknown';
      const subject = headers.find((h) => h.name?.toLowerCase() === 'subject')?.value || 'No Subject';

      const body = this.extractEmailBody(msg.data);

      emails.push({
        id: message.id,
        threadId: msg.data.threadId || '',
        sender,
        subject,
        body,
        labels: msg.data.labelIds || [],
      });
    }

    return emails;
  }

  /**
   * Extract text body from email message
   */
  private extractEmailBody(message: any): string {
    let body = '';

    const extractFromParts = (parts: any[]): string => {
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
        if (part.parts) {
          const nested = extractFromParts(part.parts);
          if (nested) return nested;
        }
      }
      return '';
    };

    if (message.payload?.parts) {
      body = extractFromParts(message.payload.parts);
    } else if (message.payload?.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    }

    return body;
  }

  /**
   * Apply a label to an email
   */
  async labelEmail(emailId: string, labelName: string): Promise<void> {
    await this.ensureAuthenticated();

    const gmail = this.getGmail();

    // Get or create label
    const labelId = await this.getOrCreateLabel(labelName);

    await gmail.users.messages.modify({
      userId: 'me',
      id: emailId,
      requestBody: {
        addLabelIds: [labelId],
      },
    });
  }

  /**
   * Get or create a Gmail label
   */
  private async getOrCreateLabel(labelName: string): Promise<string> {
    const gmail = this.getGmail();

    // List existing labels
    const response = await gmail.users.labels.list({ userId: 'me' });
    const labels = response.data.labels || [];

    const existing = labels.find((l) => l.name === labelName);
    if (existing?.id) {
      return existing.id;
    }

    // Create new label
    const created = await gmail.users.labels.create({
      userId: 'me',
      requestBody: {
        name: labelName,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      },
    });

    return created.data.id || '';
  }

  /**
   * Remove star from email
   */
  async unstarEmail(emailId: string): Promise<void> {
    await this.ensureAuthenticated();

    const gmail = this.getGmail();

    await gmail.users.messages.modify({
      userId: 'me',
      id: emailId,
      requestBody: {
        removeLabelIds: ['STARRED'],
      },
    });
  }

  /**
   * Check if Gmail is authenticated (without throwing)
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.ensureAuthenticated();
      return true;
    } catch {
      return false;
    }
  }
}
