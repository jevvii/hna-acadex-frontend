import React from 'react';
import { Text, StyleSheet } from 'react-native';

type TextSegment = {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

type FormattedTextProps = {
  text: string | null | undefined;
  style?: any;
};

/**
 * Parses and renders text with formatting.
 * Supports two formats:
 * 1. JSON array of segments: [{"text": "Hello", "bold": true, "italic": false, "underline": false}]
 * 2. Markdown-like syntax: **bold**, *italic*, __underline__
 */
export function FormattedText({ text, style }: FormattedTextProps) {
  if (!text) return null;

  const segments = parseFormattedText(text);

  if (segments.length === 0) {
    return <Text style={style}>{text}</Text>;
  }

  return (
    <Text style={style}>
      {segments.map((seg, idx) => {
        const textStyle: any[] = [styles.base];
        if (seg.bold) textStyle.push(styles.bold);
        if (seg.italic) textStyle.push(styles.italic);
        if (seg.underline) textStyle.push(styles.underline);

        return (
          <Text key={idx} style={textStyle}>
            {seg.text}
          </Text>
        );
      })}
    </Text>
  );
}

/**
 * Parse text into segments.
 * Handles both JSON segment format and markdown format.
 */
function parseFormattedText(input: string): TextSegment[] {
  // Try JSON format first
  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) {
      const segments = parsed.filter(seg => seg && typeof seg.text === 'string');
      if (segments.length > 0) {
        return segments;
      }
    }
  } catch {
    // Not JSON, fall through to markdown parsing
  }

  // Parse markdown format
  return parseMarkdownFormat(input);
}

/**
 * Parse markdown-like format to segments.
 * Supports: **bold**, *italic*, __underline__
 * Also supports combinations: ***bold+italic***, **__bold+underline__**, etc.
 */
function parseMarkdownFormat(text: string): TextSegment[] {
  const segments: TextSegment[] = [];

  // Pattern order matters - more specific patterns first
  const patterns: Array<{ regex: RegExp; bold: boolean; italic: boolean; underline: boolean }> = [
    { regex: /\*\*\*__(.+?)__\*\*\*/g, bold: true, italic: true, underline: true },
    { regex: /__\*\*\*(.+?)\*\*\*__/g, bold: true, italic: true, underline: true },
    { regex: /\*\*\*(.+?)\*\*\*/g, bold: true, italic: true, underline: false },
    { regex: /\*\*__(.+?)__\*\*/g, bold: true, italic: false, underline: true },
    { regex: /__\*\*(.+?)\*\*__/g, bold: true, italic: false, underline: true },
    { regex: /\*__(.+?)__\*/g, bold: false, italic: true, underline: true },
    { regex: /__\*(.+?)\*__/g, bold: false, italic: true, underline: true },
    { regex: /\*\*(.+?)\*\*/g, bold: true, italic: false, underline: false },
    { regex: /\*(.+?)\*/g, bold: false, italic: true, underline: false },
    { regex: /__(.+?)__/g, bold: false, italic: false, underline: true },
  ];

  let remaining = text;

  while (remaining.length > 0) {
    let matched = false;

    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      const match = pattern.regex.exec(remaining);

      if (match && match.index === 0) {
        segments.push({
          text: match[1],
          bold: pattern.bold,
          italic: pattern.italic,
          underline: pattern.underline,
        });
        remaining = remaining.slice(match[0].length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // No pattern matched at start, find next pattern or use rest
      const nextMatch = remaining.search(/\*\*|\*|__/);
      if (nextMatch > 0) {
        segments.push({
          text: remaining.slice(0, nextMatch),
          bold: false,
          italic: false,
          underline: false,
        });
        remaining = remaining.slice(nextMatch);
      } else if (nextMatch === -1) {
        // No more patterns, add rest as plain text
        if (remaining.length > 0) {
          segments.push({
            text: remaining,
            bold: false,
            italic: false,
            underline: false,
          });
        }
        break;
      } else {
        // Pattern at start but didn't match, take one character as plain
        segments.push({
          text: remaining[0],
          bold: false,
          italic: false,
          underline: false,
        });
        remaining = remaining.slice(1);
      }
    }
  }

  return segments;
}

/**
 * Convert segment format back to markdown (for backward compatibility)
 */
export function toMarkdown(text: string): string {
  if (!text) return '';

  try {
    const segments: TextSegment[] = JSON.parse(text);
    return segments.map(seg => {
      if (seg.bold && seg.italic && seg.underline) {
        return `***__${seg.text}__***`;
      }
      if (seg.bold && seg.italic) {
        return `***${seg.text}***`;
      }
      if (seg.bold && seg.underline) {
        return `**__${seg.text}__**`;
      }
      if (seg.italic && seg.underline) {
        return `*__${seg.text}__*`;
      }
      if (seg.bold) {
        return `**${seg.text}**`;
      }
      if (seg.italic) {
        return `*${seg.text}*`;
      }
      if (seg.underline) {
        return `__${seg.text}__`;
      }
      return seg.text;
    }).join('');
  } catch {
    return text;
  }
}

const styles = StyleSheet.create({
  base: {
    fontSize: 14,
    color: '#0F172A',
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  underline: {
    textDecorationLine: 'underline',
  },
});