export interface CategoryCache {
  getCategory(categoryId: string, platform: 'twitch' | 'kick' | 'youtube'): Promise<string>;
  clear(): void;
}
