import { Logger } from 'winston';
import { KeystoreManager } from '../../infrastructure/keystore/KeystoreManager';
import { OAuthCredentialsRepository } from '../../infrastructure/database/OAuthCredentialsRepository';
import { OAuthConfig } from '../../infrastructure/config/Config';
import { PKCEManager } from '../pkce/PKCEManager';
import { KickOAuth } from './KickOAuth';
import { KickStrategy } from './KickStrategy';
import type { KickStrategyConfig } from './KickStrategy';

export function createKickOAuth(
  logger: Logger,
  keystore: KeystoreManager,
  oauthRepo: OAuthCredentialsRepository,
  config: OAuthConfig,
  pkceManager?: PKCEManager
): KickOAuth {
  return new KickOAuth(
    logger,
    keystore,
    oauthRepo,
    config,
    pkceManager ?? new PKCEManager()
  );
}

export function createKickStrategy(
  logger: Logger,
  oauth: KickOAuth,
  config?: KickStrategyConfig
): KickStrategy {
  return new KickStrategy(logger, oauth, config);
}
