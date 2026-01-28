# Phase 2: REST API Client (YouTube Data API v3)

## Overview
Implement REST client for YouTube Data API v3 with rate limiting, error handling, and token refresh.

## Tasks
- [ ] Create RestClient.ts with HTTP client wrapper
- [ ] Implement get() method with query parameters support
- [ ] Implement post() method with JSON body support
- [ ] Implement getChannel() - lookup by username or custom handle (@username)
- [ ] Implement getLiveStream() - get stream ingestion configuration
- [ ] Implement getLiveBroadcast() - get broadcast lifecycle state
- [ ] Implement getVideo() - get video details with liveStreamingDetails
- [ ] Add automatic OAuth token refresh on 401 errors
- [ ] Implement rate limiting (1 req/sec default, with queue management)
- [ ] Add retry logic for 429 (5s wait) and 5xx errors (exponential backoff, max 3)
- [ ] Create types.ts with all YouTube API response interfaces
- [ ] Create RestClient.test.ts with comprehensive unit tests
- [ ] Mock YouTube API responses for all endpoints
- [ ] Test rate limiting, retry logic, and token refresh
- [ ] Run npm test to verify all tests pass (including Phase 1 tests)
- [ ] Verify Phase 2 tests pass before proceeding to Phase 3

## Files to Create/Modify
- `packages/server-daemon/platforms/YouTube/rest/RestClient.ts` (CREATE)
- `packages/server-daemon/platforms/YouTube/rest/getChannel.ts` (CREATE)
- `packages/server-daemon/platforms/YouTube/rest/getLiveStream.ts` (CREATE)
- `packages/server-daemon/platforms/YouTube/rest/getLiveBroadcast.ts` (CREATE)
- `packages/server-daemon/platforms/YouTube/rest/getVideo.ts` (CREATE)
- `packages/server-daemon/platforms/YouTube/rest/types.ts` (CREATE)
- `packages/server-daemon/platforms/YouTube/rest/index.ts` (CREATE)
- `packages/server-daemon/__tests__/platforms/YouTube/RestClient.test.ts` (CREATE)

## Acceptance Criteria
- [ ] REST client successfully calls YouTube Data API v3 endpoints
- [ ] Token refresh works on 401 errors
- [ ] Rate limiting prevents exceeding 1 req/sec
- [ ] Retry logic handles 429 and 5xx errors correctly
- [ ] getChannel() resolves username/handle to channel ID
- [ ] getVideo() returns liveStreamingDetails including liveChatId
- [ ] All API responses are properly typed
- [ ] **Unit tests created and passing**
- [ ] **Rate limiting verified in tests**
- [ ] **npm test completes with no failures (including all previous phases)**

## Dependencies
- Requires: Phase 1 completed and tests passing
- Requires: YouTubeOAuth for token management
- Requires: OAuthCredentialsRepository for API keys
