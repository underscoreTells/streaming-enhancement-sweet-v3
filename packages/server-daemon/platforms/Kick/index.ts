export { KickOAuth } from './KickOAuth';
export { KickStrategy, type ConnectionState, type KickStrategyConfig, type KickHealthStatus } from './KickStrategy';
export { createKickOAuth, createKickStrategy } from './factory';
export * from './http';

export { PusherWebSocket } from './websocket';
export * from './websocket/types';
export { PusherWebSocket } from './websocket/PusherWebSocket';

export { KickEventHandler, createEventHandlers, KickEventType } from './event';
export type { EventHandler } from './event/types';

export { RestClient } from './rest';
export { getUser, getChannelLivestream, getUsersByUsername } from './rest/getUser';
export type { KickChannelData, KickLivestreamData, KickErrorResponse } from './rest/types';
