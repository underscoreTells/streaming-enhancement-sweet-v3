export interface StreamStats {
  streamId: string;
  viewerCount: number;
  followerCount: number;
  subscriberCount: number | null;
  uptime: number | null;
  timestamp: Date;
}
