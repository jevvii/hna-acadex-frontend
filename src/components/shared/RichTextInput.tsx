import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/colors';

type TextSegment = {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

type RichTextInputProps = {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  headerStyle?: boolean;
};

/**
 * Rich text input component with formatting toolbar.
 * Shows formatted text in real-time while typing.
 * Supports combined bold, italic, and underline formatting.
 *
 * Storage format: JSON array of segments, or plain string (backward compatible)
 */
export function RichTextInput({
  label,
  value,
  onChangeText,
  placeholder = 'Enter text here...',
  headerStyle = false,
}: RichTextInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Parse the stored value into segments
  const parseValue = useCallback((storedValue: string): TextSegment[] => {
    if (!storedValue) return [];
    try {
      const parsed = JSON.parse(storedValue);
      if (Array.isArray(parsed)) {
        return parsed.filter(seg => seg && typeof seg.text === 'string');
      }
    } catch {
      // Not JSON - check for markdown format
      if (storedValue.includes('**') || storedValue.includes('*') || storedValue.includes('__')) {
        return parseMarkdown(storedValue);
      }
    }
    // Plain text fallback
    return storedValue ? [{ text: storedValue, bold: false, italic: false, underline: false }] : [];
  }, []);

  // Parse markdown format to segments
  const parseMarkdown = (text: string): TextSegment[] => {
    const segments: TextSegment[] = [];
    const patterns = [
      { regex: /\*\*\*__(.+?)__\*\*\*/g, bold: true, italic: true, underline: true },
      { regex: /\*\*\*(.+?)\*\*\*/g, bold: true, italic: true, underline: false },
      { regex: /\*\*__(.+?)__\*\*/g, bold: true, italic: false, underline: true },
      { regex: /\*__(.+?)__\*/g, bold: false, italic: true, underline: true },
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
          segments.push({
            text: remaining,
            bold: false,
            italic: false,
            underline: false,
          });
          break;
        } else {
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
  };

  // Convert segments to storage format
  const segmentsToValue = useCallback((segments: TextSegment[]): string => {
    const allPlain = segments.every(seg => !seg.bold && !seg.italic && !seg.underline);
    if (allPlain) {
      return segments.map(seg => seg.text).join('');
    }
    return JSON.stringify(segments);
  }, []);

  const segments = parseValue(value);
  const plainText = segments.map(s => s.text).join('');

  // Merge adjacent segments with same formatting
  const mergeSegments = useCallback((segs: TextSegment[]): TextSegment[] => {
    if (segs.length <= 1) return segs;

    const merged: TextSegment[] = [segs[0]];
    for (let i = 1; i < segs.length; i++) {
      const prev = merged[merged.length - 1];
      const curr = segs[i];

      if (prev.bold === curr.bold &&
          prev.italic === curr.italic &&
          prev.underline === curr.underline) {
        prev.text += curr.text;
      } else {
        merged.push({ ...curr });
      }
    }
    return merged;
  }, []);

  // Insert a segment at a position
  const insertSegment = (segs: TextSegment[], newSeg: TextSegment, pos: number): TextSegment[] => {
    if (segs.length === 0) {
      return [newSeg];
    }

    const result: TextSegment[] = [];
    let charCount = 0;
    let inserted = false;

    for (const seg of segs) {
      if (inserted) {
        result.push(seg);
        continue;
      }

      if (charCount + seg.text.length <= pos) {
        result.push(seg);
        charCount += seg.text.length;
      } else {
        // Position is within this segment
        const offset = pos - charCount;

        if (offset > 0) {
          result.push({ ...seg, text: seg.text.slice(0, offset) });
        }

        result.push(newSeg);

        if (offset < seg.text.length) {
          result.push({ ...seg, text: seg.text.slice(offset) });
        }

        inserted = true;
      }
    }

    if (!inserted) {
      result.push(newSeg);
    }

    return result;
  };

  // Remove characters from segments
  const removeCharacters = (segs: TextSegment[], oldText: string, newText: string): TextSegment[] => {
    // Find what was removed
    let removeStart = 0;
    let removeEnd = oldText.length;

    for (let i = 0; i < Math.min(oldText.length, newText.length); i++) {
      if (oldText[i] !== newText[i]) {
        removeStart = i;
        break;
      }
    }

    for (let i = oldText.length - 1, j = newText.length - 1; i >= removeStart && j >= 0; i--, j--) {
      if (oldText[i] !== newText[j]) {
        removeEnd = i + 1;
        break;
      }
    }

    // Build new segments
    const result: TextSegment[] = [];
    let charCount = 0;

    for (const seg of segs) {
      const segStart = charCount;
      const segEnd = charCount + seg.text.length;
      charCount = segEnd;

      if (segEnd <= removeStart) {
        // Segment is before removal
        result.push(seg);
      } else if (segStart >= removeEnd) {
        // Segment is after removal
        result.push(seg);
      } else {
        // Segment overlaps with removal
        const beforeStart = removeStart - segStart;
        const afterStart = removeEnd - segStart;

        if (beforeStart > 0) {
          result.push({ ...seg, text: seg.text.slice(0, beforeStart) });
        }
        if (afterStart < seg.text.length) {
          result.push({ ...seg, text: seg.text.slice(afterStart) });
        }
      }
    }

    return result.filter(s => s.text.length > 0);
  };

  // Handle text input
  const handleTextChange = useCallback((newText: string) => {
    const oldText = plainText;

    if (newText.length > oldText.length) {
      // Text was added - find what was added and where
      let addedText = '';
      let insertPos = 0;

      // Find insertion point
      for (let i = 0; i < Math.min(newText.length, oldText.length); i++) {
        if (newText[i] !== oldText[i]) {
          insertPos = i;
          break;
        }
      }

      if (newText.startsWith(oldText)) {
        // Appended at end
        insertPos = oldText.length;
        addedText = newText.slice(oldText.length);
      } else if (newText.endsWith(oldText)) {
        // Prepended at start
        insertPos = 0;
        addedText = newText.slice(0, newText.length - oldText.length);
      } else {
        // Inserted in middle
        let foundPos = false;
        for (let i = 0; i < Math.min(newText.length, oldText.length); i++) {
          if (newText[i] !== oldText[i]) {
            insertPos = i;
            addedText = newText.slice(i, i + (newText.length - oldText.length));
            foundPos = true;
            break;
          }
        }
        if (!foundPos) {
          insertPos = 0;
          addedText = newText.slice(0, newText.length - oldText.length);
        }
      }

      if (!addedText) {
        addedText = newText.slice(insertPos, insertPos + (newText.length - oldText.length));
      }

      // Create new segment for added text
      const newSegment: TextSegment = {
        text: addedText,
        bold: isBold,
        italic: isItalic,
        underline: isUnderline,
      };

      // Insert into segments
      const newSegments = insertSegment(segments, newSegment, insertPos);
      onChangeText(segmentsToValue(mergeSegments(newSegments)));
    } else if (newText.length < oldText.length) {
      // Text was deleted
      const newSegments = removeCharacters(segments, oldText, newText);
      onChangeText(segmentsToValue(mergeSegments(newSegments)));
    } else {
      // Same length, just update
      onChangeText(newText);
    }
  }, [plainText, segments, isBold, isItalic, isUnderline, mergeSegments, segmentsToValue, onChangeText]);

  // Render formatted preview
  const renderFormattedPreview = () => {
    if (segments.length === 0 || plainText.length === 0) {
      return (
        <Text style={styles.previewText}>
          <Text style={styles.previewPlaceholder}>{placeholder}</Text>
        </Text>
      );
    }

    return (
      <Text style={styles.previewText}>
        {segments.map((seg, idx) => {
          const textStyle: any[] = [];
          if (seg.bold) textStyle.push({ fontWeight: '700' });
          if (seg.italic) textStyle.push({ fontStyle: 'italic' });
          if (seg.underline) textStyle.push({ textDecorationLine: 'underline' });

          return (
            <Text key={idx} style={textStyle}>
              {seg.text}
            </Text>
          );
        })}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, headerStyle && styles.labelHeader]}>
          {label}
        </Text>
      )}

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolbarBtn, isBold && styles.toolbarBtnActive]}
          onPress={() => setIsBold(!isBold)}
          activeOpacity={0.7}
        >
          <Text style={[styles.toolbarBtnText, isBold && styles.toolbarBtnTextActive]}>B</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolbarBtn, isItalic && styles.toolbarBtnActive]}
          onPress={() => setIsItalic(!isItalic)}
          activeOpacity={0.7}
        >
          <Text style={[styles.toolbarBtnText, styles.italicText, isItalic && styles.toolbarBtnTextActive]}>I</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolbarBtn, isUnderline && styles.toolbarBtnActive]}
          onPress={() => setIsUnderline(!isUnderline)}
          activeOpacity={0.7}
        >
          <Text style={[styles.toolbarBtnText, isUnderline && styles.toolbarBtnTextActive]}>U</Text>
        </TouchableOpacity>
        {(isBold || isItalic || isUnderline) && (
          <View style={styles.activeTag}>
            <Text style={styles.activeTagText}>
              {isBold && 'Bold'}
              {isBold && isItalic && ' + '}
              {isItalic && 'Italic'}
              {(isBold || isItalic) && isUnderline && ' + '}
              {isUnderline && 'Underline'}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={plainText}
          onChangeText={handleTextChange}
          multiline
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          textAlignVertical="top"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>

      {plainText.length > 0 && (isBold || isItalic || isUnderline) && (
        <View style={styles.previewBox}>
          <Text style={styles.previewLabel}>Preview:</Text>
          <ScrollView nestedScrollEnabled>
            {renderFormattedPreview()}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// Helper function to convert stored value to markdown for display
export function richTextToMarkdown(value: string): string {
  if (!value) return '';
  try {
    const segments: TextSegment[] = JSON.parse(value);
    return segments.map(seg => {
      let text = seg.text;
      if (seg.bold && seg.italic && seg.underline) {
        return `***__${text}__***`;
      }
      if (seg.bold && seg.italic) {
        return `***${text}***`;
      }
      if (seg.bold && seg.underline) {
        return `**__${text}__**`;
      }
      if (seg.italic && seg.underline) {
        return `*__${text}__*`;
      }
      if (seg.bold) {
        return `**${text}**`;
      }
      if (seg.italic) {
        return `*${text}*`;
      }
      if (seg.underline) {
        return `__${text}__`;
      }
      return text;
    }).join('');
  } catch {
    return value;
  }
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  labelHeader: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  toolbar: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  toolbarBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toolbarBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
  },
  italicText: {
    fontStyle: 'italic',
    fontWeight: '400',
  },
  toolbarBtnTextActive: {
    color: '#FFFFFF',
  },
  activeTag: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    marginLeft: Spacing.sm,
  },
  activeTagText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Radius.md,
    backgroundColor: '#FFFFFF',
    minHeight: 96,
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 80,
  },
  previewBox: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '600',
  },
  previewText: {
    fontSize: 14,
    color: '#0F172A',
  },
  previewPlaceholder: {
    color: '#9CA3AF',
  },
});