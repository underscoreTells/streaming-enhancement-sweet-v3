export interface YouTubeApiResponse<T> {
  kind: string;
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items?: T[];
}

export interface YouTubeError {
  error: {
    code: number;
    message: string;
    errors: Array<{
      domain: string;
      reason: string;
      message: string;
    }>;
  };
}

export interface YouTubeChannel {
  kind: string;
  etag: string;
  id: string;
  snippet?: {
    title: string;
    description: string;
    customUrl?: string;
    publishedAt: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
    };
    defaultLanguage?: string;
    localized: {
      title: string;
      description: string;
    };
    country?: string;
  };
  statistics?: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
}

export interface YouTubeLiveStream {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    isDefaultStream: boolean;
  };
  cdn: {
    format: string;
    ingestionType: string;
    ingestionInfo: {
      streamName: string;
      ingestionAddress: string;
      backupIngestionAddress: string;
    };
    resolution: string;
    frameRate: string;
  };
  status: {
    streamStatus: string;
    healthStatus: {
      status: string;
      lastUpdateTimeS?: string;
      configurationIssues?: string[];
    };
  };
  contentDetails: {
    isReusable: boolean;
    closedCaptionsIngestionUrl: string;
  };
}

export interface YouTubeLiveBroadcast {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    scheduledStartTime: string;
    scheduledEndTime?: string;
    actualStartTime?: string;
    actualEndTime?: string;
    isDefaultBroadcast: boolean;
    liveChatId?: string;
  };
  status: {
    lifeCycleStatus: string;
    privacyStatus: string;
    recordingStatus: string;
    selfDeclaredMadeForKids: boolean;
  };
  contentDetails: {
    monitorStream?: {
      enableMonitorStream: boolean;
      broadcastStreamDelayMs: number;
      embedHtml: string;
    };
    enableEmbed: boolean;
    enableDvr: boolean;
    enableContentEncryption: boolean;
    startWithSlate: boolean;
    recordFromStart: boolean;
    closedCaptionsType: string;
    enableLowLatency: boolean;
    latencyPreference: string;
    projection: string;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    dislikeCount: string;
    commentCount: string;
    concurrentViewers?: string;
  };
}

export interface YouTubeVideo {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
      standard?: { url: string; width: number; height: number };
      maxres?: { url: string; width: number; height: number };
    };
    channelTitle: string;
    tags?: string[];
    categoryId: string;
    liveBroadcastContent: string;
    defaultLanguage?: string;
    localized: {
      title: string;
      description: string;
    };
    defaultAudioLanguage?: string;
  };
  contentDetails: {
    duration: string;
    dimension: string;
    definition: string;
    caption: string;
    licensedContent: boolean;
    contentRating: Record<string, string>;
    projection: string;
    hasCustomThumbnail: boolean;
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    dislikeCount?: string;
    favoriteCount: string;
    commentCount: string;
  };
  liveStreamingDetails?: {
    actualStartTime: string;
    actualEndTime?: string;
    scheduledStartTime: string;
    scheduledEndTime?: string;
    concurrentViewers?: string;
    activeLiveChatId?: string;
  };
}

export interface YouTubeLiveChatMessage {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    liveChatId: string;
    authorChannelId: string;
    publishedAt: string;
    hasDisplayContent: boolean;
    displayMessage: string;
    textMessageDetails?: {
      messageText: string;
    };
    superChatDetails?: {
      amountMicros: string;
      currency: string;
      amountDisplayString: string;
      userComment: string;
      tier: number;
    };
    superStickerDetails?: {
      amountMicros: string;
      currency: string;
      amountDisplayString: string;
      tier: number;
      sticker: {
        displayName: string;
        width: number;
        height: number;
        url: string;
      };
    };
    fanFundingEventDetails?: {
      amountMicros: string;
      currency: string;
      amountDisplayString: string;
      userComment: string;
    };
  };
  authorDetails: {
    channelId: string;
    channelUrl: string;
    displayName: string;
    profileImageUrl: string;
    isVerified: boolean;
    isChatOwner: boolean;
    isChatSponsor: boolean;
    isChatModerator: boolean;
  };
}

export interface YouTubeLiveChatResponse {
  kind: string;
  etag: string;
  nextPageToken: string;
  pollingIntervalMillis: number;
  offlineAt?: string;
  items: YouTubeLiveChatMessage[];
}
