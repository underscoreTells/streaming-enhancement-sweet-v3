# Phase 5: IRC WebSocket Client

## Overview
Create IRC WebSocket client for Twitch chat with send (PRIVMSG) and receive capabilities, message parsing, and command support.

## Tasks
- [ ] Create IrcClient class wrapping ws WebSocket
- [ ] Connect to wss://irc-ws.chat.twitch.tv:443
- [ ] Implement authentication (PASS oauth:token, NICK username)
- [ ] Create IrcMessageParser for parsing IRC protocol messages
- [ ] Implement JOIN command for joining channels
- [ ] Implement PRIVMSG for sending and receiving chat messages
- [ ] Handle IRCv3 tags (badges, color, display-name, emotes)
- [ ] Handle PING/PONG keepalive (ws autoPong handles PONG response)
- [ ] Add reconnection logic with exponential backoff
- [ ] Parse messages with TwitchConverter and TwitchChatMessageAdapter

## Files to Create
- `packages/server-daemon/platforms/Twitch/irc/IrcClient.ts`
- `packages/server-daemon/platforms/Twitch/irc/IrcMessageParser.ts`
- `packages/server-daemon/platforms/Twitch/irc/types.ts`

## Files to Modify
- `packages/server-daemon/platforms/Twitch/TwitchStrategy.ts` (integrate IrcClient)

## Acceptance Criteria
- [ ] Connects to wss://irc-ws.chat.twitch.tv:443
- [ ] Authenticates with oauth token (PASS, NICK)
- [ ] Joins channels with JOIN #channel
- [ ] Sends messages with PRIVMSG #channel :message
- [ ] Receives messages and parses IRC tags
- [ ] Keepalive (PING) handled with ws autoPong
- [ ] Reconnects on disconnect with backoff
- [ ] Uses TwitchConverter and TwitchChatMessageAdapter
- [ ] Emits chat events to TwitchStrategy EventEmitter

## Dependencies
- Phase 3: ws library added, TwitchStrategy facade
- Shared models: TwitchConverter, TwitchChatMessageAdapter
- Research: @docs/research/twitch-websocket-apis-research.md
