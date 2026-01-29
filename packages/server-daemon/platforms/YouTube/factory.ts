import { Logger } from 'winston';
import { KeystoreManager } from '../../infrastructure/keystore/KeystoreManager';
import { OAuthCredentialsRepository } from '../../infrastructure/database/OAuthCredentialsRepository';
import { OAuthConfig } from '../../infrastructure/config/Config';
import { YouTubeOAuth } from './YouTubeOAuth';
import { YouTubeStrategy, YouTubeStrategyConfig } from './YouTubeStrategy';

export function createYouTubeOAuth(
  logger: Logger,
  keystore: KeystoreManager,
  oauthRepo: OAuthCredentialsRepository,
  config: OAuthConfig
): YouTubeOAuth {
  return new YouTubeOAuth(logger, keystore, oauthRepo, config);
}

export function createYouTubeStrategy(
  logger: Logger,
  oauth: YouTubeOAuth,
  config?: YouTubeStrategyConfig
): YouTubeStrategy {
  return new YouTubeStrategy(logger, oauth, config);
}
