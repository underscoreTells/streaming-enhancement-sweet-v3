export type { TokenSet } from './types';
export {
  serializeTokenSet,
  deserializeTokenSet,
  calculateRefreshTimes,
  isTokenValid,
  shouldRefreshToken,
} from './types';

export type { PlatformStrategy } from './PlatformStrategy';

export { OAuthFlow } from './OAuthFlow';

export {
  OAuthError,
  InvalidStateError,
  TokenExpiredError,
  RefreshFailedError,
  InvalidResponseError,
  NetworkError,
  isOAuthError,
  isInvalidStateError,
  isTokenExpiredError,
  isRefreshFailedError,
  isInvalidResponseError,
  isNetworkError,
} from './errors';

export { TwitchOAuth } from './Twitch/TwitchOAuth';
export { createTwitchOAuth } from './Twitch/factory';
export {
  exchangeCodeForTokens as twitchExchangeCodeForTokens,
  refreshAccessToken as twitchRefreshAccessToken
} from './Twitch/http';

export { KickOAuth } from './Kick/KickOAuth';
export { createKickOAuth } from './Kick/factory';
export {
  exchangeCodeForTokens as kickExchangeCodeForTokens,
  refreshAccessToken as kickRefreshAccessToken
} from './Kick/http';

export { YouTubeOAuth } from './YouTube/YouTubeOAuth';
export { createYouTubeOAuth } from './YouTube/factory';
export {
  exchangeCodeForTokens as youtubeExchangeCodeForTokens,
  refreshAccessToken as youtubeRefreshAccessToken
} from './YouTube/http';

export { PKCEManager } from './pkce/PKCEManager';
