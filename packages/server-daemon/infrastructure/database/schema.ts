import { Platform } from '../config/schemas';

export interface OAuthCredential {
  platform: Platform;
  client_id: string;
  client_secret: string;
  scopes: string[];
  created_at: string;
}
