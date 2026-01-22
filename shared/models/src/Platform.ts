export type Platform = 'twitch' | 'kick' | 'youtube';

export const PLATFORM_VALUES = {
  Twitch: 'twitch',
  Kick: 'kick',
  YouTube: 'youtube',
} as const;

export function isValidPlatform(value: unknown): value is Platform {
  return (
    typeof value === 'string' &&
    (value === 'twitch' || value === 'kick' || value === 'youtube')
  );
}

export function getPlatformName(platform: Platform): string {
  switch (platform) {
    case 'twitch':
      return 'Twitch';
    case 'kick':
      return 'Kick';
    case 'youtube':
      return 'YouTube';
  }
}
