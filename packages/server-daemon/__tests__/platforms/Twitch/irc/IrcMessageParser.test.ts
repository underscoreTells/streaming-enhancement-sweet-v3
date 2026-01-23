import { describe, it, expect } from 'vitest';
import { IrcMessageParser } from '../../../../platforms/Twitch/irc/IrcMessageParser';
import type { IrcMessage } from '../../../../platforms/Twitch/irc/types';

describe('IrcMessageParser', () => {
  describe('parse', () => {
    it('should parse simple command without tags or prefix', () => {
      const message = 'PING :tmi.twitch.tv';
      const result = IrcMessageParser.parse(message);

      expect(result.raw).toBe(message);
      expect(result.command).toBe('PING');
      expect(result.params).toEqual(['tmi.twitch.tv']);
      expect(result.tags).toBeUndefined();
      expect(result.prefix).toBeUndefined();
    });

    it('should parse command with prefix only', () => {
      const message = ':tmi.twitch.tv PING';
      const result = IrcMessageParser.parse(message);

      expect(result.raw).toBe(message);
      expect(result.prefix).toBe('tmi.twitch.tv');
      expect(result.command).toBe('PING');
      expect(result.params).toEqual([]);
      expect(result.tags).toBeUndefined();
    });

    it('should parse command with tags only', () => {
      const message = '@badge-info=;badges=;color=#008000;display-name=testuser;emotes=;flags=;id=12345;mod=0;room-id=67890;subscriber=0;tmi-sent-ts=1234567890;turbo=0;user-id=11111;user-type= PRIVMSG #channel :Hello world';
      const result = IrcMessageParser.parse(message);

      expect(result.raw).toBe(message);
      expect(result.command).toBe('PRIVMSG');
      expect(result.tags).toBeDefined();
      expect(result.tags!.display_name).toBe('testuser');
      expect(result.tags!.color).toBe('#008000');
      expect(result.prefix).toBeUndefined();
      expect(result.params).toEqual(['#channel', 'Hello world']);
    });

    it('should parse full IRC message with tags, prefix, and command', () => {
      const message = '@badge-info=;badges=;color=#008000; :testuser!testuser@testuser.tmi.twitch.tv PRIVMSG #channel :Test message';
      const result = IrcMessageParser.parse(message);

      expect(result.raw).toBe(message);
      expect(result.tags?.color).toBe('#008000');
      expect(result.prefix).toBe('testuser!testuser@testuser.tmi.twitch.tv');
      expect(result.command).toBe('PRIVMSG');
      expect(result.params).toEqual(['#channel', 'Test message']);
    });

    it('should parse JOIN message', () => {
      const message = ':testuser!testuser@testuser.tmi.twitch.tv JOIN #channel';
      const result = IrcMessageParser.parse(message);

      expect(result.prefix).toBe('testuser!testuser@testuser.tmi.twitch.tv');
      expect(result.command).toBe('JOIN');
      expect(result.params).toEqual(['#channel']);
    });

    it('should parse PART message', () => {
      const message = ':testuser!testuser@testuser.tmi.twitch.tv PART #channel';
      const result = IrcMessageParser.parse(message);

      expect(result.prefix).toBe('testuser!testuser@testuser.tmi.twitch.tv');
      expect(result.command).toBe('PART');
      expect(result.params).toEqual(['#channel']);
    });

    it('should parse multiple parameters', () => {
      const message = 'cmd param1 param2 param3';
      const result = IrcMessageParser.parse(message);

      expect(result.command).toBe('cmd');
      expect(result.params).toEqual(['param1', 'param2', 'param3']);
    });

    it('should parse trailing parameter with colons', () => {
      const message = 'PRIVMSG #channel :Message with :colons in :it';
      const result = IrcMessageParser.parse(message);

      expect(result.command).toBe('PRIVMSG');
      expect(result.params).toEqual(['#channel', 'Message with :colons in :it']);
    });

    it('should handle empty tags', () => {
      const message = '@ :prefix IRC';
      const result = IrcMessageParser.parse(message);

      expect(result.tags).toBeDefined();
      expect(result.tags).toEqual({});
      expect(result.prefix).toBe('prefix');
      expect(result.command).toBe('IRC');
    });

    it('should handle unknown command', () => {
      const message = 'UNKNOWN COMMAND PARAM1 PARAM2';
      const result = IrcMessageParser.parse(message);

      expect(result.command).toBe('UNKNOWN');
      expect(result.params).toEqual(['COMMAND', 'PARAM1', 'PARAM2']);
    });
  });

  describe('parseTags', () => {
    it('should parse single tag', () => {
      const message = '@display-name=testuser PRIVMSG #channel :Hi';
      const result = IrcMessageParser.parse(message);

      expect(result.tags?.display_name).toBe('testuser');
    });

    it('should parse multiple tags', () => {
      const message = '@badge-info=;badges=broadcaster/1;color=#FF0000;display-name=TestUser;emotes=;flags=0-8:P.20;id=abc123;mod=0;room-id=xyz;subscriber=0;tmi-sent-ts=1640995200000;turbo=0;user-id=12345;user-type= PRIVMSG #channel :Hi';
      const result = IrcMessageParser.parse(message);

      expect(result.tags?.badge_info).toBe('');
      expect(result.tags?.badges).toBe('broadcaster/1');
      expect(result.tags?.color).toBe('#FF0000');
      expect(result.tags?.display_name).toBe('TestUser');
      expect(result.tags?.id).toBe('abc123');
      expect(result.tags?.user_id).toBe('12345');
    });

    it('should decode escaped backslash sequences', () => {
      const message = '@message=Hello\\sWorld\\:with\\sspecial\\\\chars PRIVMSG #channel :Hi';
      const result = IrcMessageParser.parse(message);

      expect(result.tags?.message).toBe('Hello World;with special\\chars');
    });

    it('should decode \\s to space', () => {
      const message = '@display-name=user\\sname PRIVMSG #channel :Hi';
      const result = IrcMessageParser.parse(message);

      expect(result.tags?.display_name).toBe('user name');
    });

    it('should decode \\: to semicolon', () => {
      const message = '@tag=value\\:more PRIVMSG #channel :Hi';
      const result = IrcMessageParser.parse(message);

      expect(result.tags?.tag).toBe('value;more');
    });

    it('should decode \\\\ to single backslash', () => {
      const message = '@tag=value\\\\slash PRIVMSG #channel :Hi';
      const result = IrcMessageParser.parse(message);

      expect(result.tags?.tag).toBe('value\\slash');
    });

    it('should decode \\r to carriage return', () => {
      const message = '@tag=value\\rreturn PRIVMSG #channel :Hi';
      const result = IrcMessageParser.parse(message);

      expect(result.tags?.tag).toBe('value\rreturn');
    });

    it('should decode \\n to newline', () => {
      const message = '@tag=line1\\nline2 PRIVMSG #channel :Hi';
      const result = IrcMessageParser.parse(message);

      expect(result.tags?.tag).toBe('line1\nline2');
    });

    it('should handle tags with no value', () => {
      const message = '@empty= PRIVMSG #channel :Hi';
      const result = IrcMessageParser.parse(message);

      expect(result.tags?.empty).toBe('');
    });

    it('should handle missing equals sign in tag', () => {
      const message = '@valueonly PRIVMSG #channel :Hi';
      const result = IrcMessageParser.parse(message);

      expect(result.tags?.valueonly).toBe('');
    });

    it('should parse badges correctly', () => {
      const message = '@badges=broadcaster/1,subscriber/24;badges-entries=broadcaster/1/1,subscriber/0/1 PRIVMSG #channel :Hi';
      const result = IrcMessageParser.parse(message);

      expect(result.tags?.badges).toBe('broadcaster/1,subscriber/24');
      expect(result.tags?.badges_entries).toBe('broadcaster/1/1,subscriber/0/1');
    });

    it('should parse emote tags correctly', () => {
      const message = '@emotes=25:0-4 KRiP:7-10 PRIVMSG #channel :KappaK RIP';
      const result = IrcMessageParser.parse(message);

      expect(result.tags?.emotes).toBe('25:0-4 KRiP:7-10');
    });

    it('should handle empty tag value with key=value;', () => {
      const message = '@key1=value1;key2=;key3=value3 PRIVMSG #channel :Hi';
      const result = IrcMessageParser.parse(message);

      expect(result.tags?.key1).toBe('value1');
      expect(result.tags?.key2).toBe('');
      expect(result.tags?.key3).toBe('value3');
    });
  });

  describe('Real-world examples', () => {
    it('should parse Twitch PRIVMSG', () => {
      const message = '@badge-info=subscriber/24;badges=subscriber/24;color=#19E6E6;display-name=TestUser;emotes=;flags=;id=12345678-1234-1234-1234-123456789012;mod=0;room-id=67890;subscriber=1;tmi-sent-ts=1640995200000;turbo=0;user-id=11111;user-type= :testuser!testuser@testuser.tmi.twitch.tv PRIVMSG #channel :Hello, chat!';
      const result = IrcMessageParser.parse(message);

      expect(result.command).toBe('PRIVMSG');
      expect(result.prefix).toBe('testuser!testuser@testuser.tmi.twitch.tv');
      expect(result.params).toEqual(['#channel', 'Hello, chat!']);
      expect(result.tags?.display_name).toBe('TestUser');
      expect(result.tags?.badges).toBe('subscriber/24');
    });

    it('should parse 376 RPL_ENDOFMOTD', () => {
      const message = ':tmi.twitch.tv 376 :End of /MOTD command';
      const result = IrcMessageParser.parse(message);

      expect(result.prefix).toBe('tmi.twitch.tv');
      expect(result.command).toBe('376');
      expect(result.params).toEqual(['End of /MOTD command']);
    });

    it('should parse NOTICE message', () => {
      const message = '@msg-id=msg_channel_suspended :tmi.twitch.tv NOTICE #channel :The room has been suspended.';
      const result = IrcMessageParser.parse(message);

      expect(result.prefix).toBe('tmi.twitch.tv');
      expect(result.command).toBe('NOTICE');
      expect(result.tags?.msg_id).toBe('msg_channel_suspended');
    });
  });
});
