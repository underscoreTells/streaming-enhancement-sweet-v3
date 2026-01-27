export interface IrcTags {
  badges?: string;
  'badge-info'?: string;
  color?: string;
  'display-name'?: string;
  emotes?: string;
  'first-msg'?: string;
  flags?: string;
  id?: string;
  mod?: string;
  'returning-chatter'?: string;
  'room-id'?: string;
  subscriber?: string;
  'tmi-sent-ts'?: string;
  turbo?: string;
  'user-id'?: string;
  'user-type'?: string;
}

export interface IrcMessage {
  raw: string;
  tags?: IrcTags;
  prefix?: string;
  command: string;
  params: string[];
}
