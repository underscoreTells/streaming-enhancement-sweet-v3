# Phase 6: REST API Client (Minimal)

## Overview
Create REST API client with minimal endpoint - getUser() to resolve usernames to user_ids for EventSub subscriptions.

## Tasks
- [ ] Create RestClient class with fetch wrapper
- [ ] Add Bearer token authentication (from OAuth)
- [ ] Implement rate limiting (Twitch Helix: 800/min per token with token bucket)
- [ ] Implement getUser(username) endpoint
- [ ] Implement getUsers(usernames[]) batch endpoint
- [ ] Implement getUsersById(userIds[]) batch endpoint
- [ ] Add retry logic for 429/500 errors
- [ ] Use TwitchConverter and TwitchUserAdapter

## Files to Create
- `packages/server-daemon/platforms/Twitch/rest/RestClient.ts`
- `packages/server-daemon/platforms/Twitch/rest/getUser.ts`
- `packages/server-daemon/platforms/Twitch/rest/types.ts`

## Files to Modify
- `packages/server-daemon/platforms/Twitch/TwitchStrategy.ts` (integrate RestClient)

## Acceptance Criteria
- [ ] HTTP requests to api.twitch.tv/helix with Bearer token
- [ ] Rate limiting enforced (800/min token bucket with backoff)
- [ ] Retry for 429 (token bucket reset) and 500 errors
- [ ] getUser(username) returns user with user_id
- [ ] getUsers(usernames[]) returns array of users
- [ ] getUsersById(userIds[]) returns array of users
- [ ] Uses TwitchConverter and TwitchUserAdapter
- [ ] Error handling for auth failures

## Dependencies
- Phase 2: TwitchStrategy facade
- Shared models: TwitchConverter, TwitchUserAdapter
- Research: @docs/research/API-RESEARCH.md
