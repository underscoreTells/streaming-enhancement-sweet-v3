# Phase 1: Define Platform Interfaces

## Overview
Create separate TypeScript interfaces for OAuth, WebSocket, and REST strategies that TwitchStrategy will implement.

## Tasks
- [ ] Create PlatformOAuthStrategy interface (refactor existing OAuth methods)
- [ ] Create PlatformWebSocketStrategy interface with connect, disconnect, subscribe methods
- [ ] Create PlatformRestStrategy interface with GET, POST methods
- [ ] Update PlatformStrategy.ts to reference new interfaces
- [ ] Mark TwitchOAuth class as implementing PlatformOAuthStrategy

## Files to Create
- `packages/server-daemon/platforms/interfaces/PlatformOAuthStrategy.ts`
- `packages/server-daemon/platforms/interfaces/PlatformWebSocketStrategy.ts`
- `packages/server-daemon/platforms/interfaces/PlatformRestStrategy.ts`
- `packages/server-daemon/platforms/interfaces/index.ts`

## Files to Modify
- `packages/server-daemon/platforms/PlatformStrategy.ts`
- `packages/server-daemon/platforms/Twitch/TwitchOAuth.ts`

## Acceptance Criteria
- [ ] All three interfaces defined with required methods
- [ ] TypeScript compilation passes
- [ ] TwitchOAuth implements PlatformOAuthStrategy
- [ ] Export barrel file created
- [ ] Interfaces documented with JSDoc

## Dependencies
- None
