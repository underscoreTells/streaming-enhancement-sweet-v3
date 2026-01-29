import type { IrcMessage } from './types';

export class IrcMessageParser {
  private static readonly TAG_PATTERN = /^@([^\s]*)\s/;

  /**
   * Parse an IRC message into components
   */
  static parse(message: string): IrcMessage {
    const result: IrcMessage = {
      raw: message,
      command: '',
      params: [],
    };

    let remaining = message;

    // Parse tags
    const tagMatch = remaining.match(IrcMessageParser.TAG_PATTERN);
    if (tagMatch) {
      result.tags = IrcMessageParser.parseTags(tagMatch[1]);
      remaining = remaining.substring(tagMatch[0].length);
    }

    // Parse prefix
    if (remaining.startsWith(':')) {
      const spaceIndex = remaining.indexOf(' ');
      if (spaceIndex !== -1) {
        result.prefix = remaining.substring(1, spaceIndex);
        remaining = remaining.substring(spaceIndex + 1);
      }
    }

    // Parse command and params
    const spaceIndex = remaining.indexOf(' ');
    if (spaceIndex !== -1) {
      result.command = remaining.substring(0, spaceIndex);
      const paramsPart = remaining.substring(spaceIndex + 1);

      // Handle trailing parameter (contains spaces)
      if (paramsPart.startsWith(':')) {
        // Entire paramsPart is a single parameter after :
        result.params = [paramsPart.substring(1)];
      } else {
        const colonIndex = paramsPart.indexOf(' :');
        if (colonIndex !== -1) {
          result.params = paramsPart.substring(0, colonIndex).split(' ');
          result.params.push(paramsPart.substring(colonIndex + 2));
        } else {
          result.params = paramsPart.split(' ');
        }
      }
    } else {
      result.command = remaining;
    }

    return result;
  }

  /**
   * Parse IRC tags (key=value;key=value format)
   */
  private static parseTags(tagsString: string): Record<string, string> {
    if (!tagsString) {
      return {};
    }

    const tags: Record<string, string> = {};
    const pairs = tagsString.split(';');

    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      tags[key] = value === undefined ? '' : IrcMessageParser.unescapeTagValue(value);
    }

    return tags;
  }

  /**
   * Unescape IRC tag values (backslash escaping)
   * Note: Process \\ last to avoid creating new escape sequences
   */
  private static unescapeTagValue(value: string): string {
    return value
      .replace(/\\s/g, ' ')
      .replace(/\\:/g, ';')
      .replace(/\\r/g, '\r')
      .replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\');
  }
}
