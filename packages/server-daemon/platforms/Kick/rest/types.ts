export interface KickChannelData {
  id: number;
  user_id: number;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  followers_count?: number;
  is_verified?: boolean;
  is_banned?: boolean;
  created_at?: string;
}

export interface KickLivestreamData {
  id: number;
  channel_id: number;
  session_title: string;
  category_id?: string;
  category_name?: string;
  thumbnail?: string;
  is_live: boolean;
  viewer_count?: number;
  language?: string;
  created_at?: string;
}

export interface KickErrorResponse {
  message?: string;
  data?: string;
}
