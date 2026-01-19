import { Logger } from 'winston';
import { KeystoreManager } from '../../infrastructure/keystore/KeystoreManager';
import { OAuthCredentialsRepository } from '../../infrastructure/database/OAuthCredentialsRepository';
import { OAuthConfig } from '../../infrastructure/config/Config';
import { TwitchOAuth } from './TwitchOAuth';

export function createTwitchOAuth(
  logger: Logger,
  keystore: KeystoreManager,
  oauthRepo: OAuthCredentialsRepository,
  config: OAuthConfig
): TwitchOAuth {
  return new TwitchOAuth(logger, keystore, oauthRepo, config);
}
