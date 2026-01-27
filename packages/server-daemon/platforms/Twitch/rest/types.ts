export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  view_count: number;
  created_at: string;
}

export interface TwitchUsersResponse {
  data: TwitchUser[];
}

export interface TwitchErrorResponse {
  error: string;
  status: number;
  message: string;
}
