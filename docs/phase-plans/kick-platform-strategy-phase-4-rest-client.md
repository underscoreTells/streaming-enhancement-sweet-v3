# Phase 4: REST API Client (Minimal)

## Overview
Create minimal REST client for username → userId resolution with conservative rate limiting and error handling for Kick's undocumented rate limits.

## Tasks
- [ ] Create `RestClient.ts` with rate limiting queue
- [ ] Implement rate limiting: 1 request/second conservative limit
- [ ] Implement exponential backoff on 5xx errors (max 3 retries)
- [ ] Handle HTTP 429 responses: wait 5 seconds before retry
- [ ] Implement `getUser()` method for username lookup
- [ ] Use reverse-engineered API endpoints:
  - `GET /api/v2/channels/{username}` → Channel data
  - `GET /api/v2/channels/{channel}/livestream` → Livestream data
- [ ] Add TypeScript types for API responses
- [ ] Implement proper error handling and logging
- [ ] Add connection timeout and request timeout

## Files to Create/Modify
- `packages/server-daemon/platforms/Kick/rest/RestClient.ts`
- `packages/server-daemon/platforms/Kick/rest/getUser.ts`
- `packages/server-daemon/platforms/Kick/rest/types.ts`

## Acceptance Criteria
- [ ] REST client enforces 1 req/sec rate limit with queue system
- [ ] Handles 429 responses with 5s backoff and retry
- [ ] Implements exponential backoff on 5xx errors (max 3 retries)
- [ ] Retrieves user data by username to resolve user_id
- [ ] getUser() returns channel id from channel data
- [ ] Proper error handling for network errors, timeouts, and API errors
- [ ] TypeScript types defined for all API response structures
- [ ] Client can be configured with custom base URL if needed
- [ ] Logs rate limit hits and retry attempts appropriately

## Dependencies
- Requires: Phase 1 (KickStrategy base structure)
- Depends on: existing `http.ts` from Kick module

## Implementation Notes
- Use simple queue with delay to enforce rate limiting
- exponential backoff: wait(1000 * 2^attempt) up to max
- Use existing `http.ts` if it provides fetch functionality, or use native fetch
- Endpoints are reverse-engineered, structure may change without notice
