// Tests for rich-text utilities
import { describe, it, expect } from 'vitest';
import {
  extractMentions,
  extractLinks,
  blocksToPlainText,
  buildMessageContent,
} from './rich-text.js';
import type { RichTextBlock } from '@nexusflow/shared';

describe('extractMentions', () => {
  it('should extract user mentions from paragraph blocks', () => {
    const blocks: RichTextBlock[] = [
      {
        type: 'paragraph',
        content: 'Hello @[Alice](user:550e8400-e29b-41d4-a716-446655440000) and @[Bob](user:660e8400-e29b-41d4-a716-446655440001)',
      },
    ];
    const mentions = extractMentions(blocks);
    expect(mentions).toHaveLength(2);
    expect(mentions).toContain('550e8400-e29b-41d4-a716-446655440000');
    expect(mentions).toContain('660e8400-e29b-41d4-a716-446655440001');
  });

  it('should deduplicate mentions', () => {
    const blocks: RichTextBlock[] = [
      {
        type: 'paragraph',
        content: '@[Alice](user:550e8400-e29b-41d4-a716-446655440000) and @[Alice](user:550e8400-e29b-41d4-a716-446655440000) again',
      },
    ];
    const mentions = extractMentions(blocks);
    expect(mentions).toHaveLength(1);
  });

  it('should extract mentions from nested children', () => {
    const blocks: RichTextBlock[] = [
      {
        type: 'quote',
        children: [
          {
            type: 'paragraph',
            content: 'Replying to @[Charlie](user:770e8400-e29b-41d4-a716-446655440002)',
          },
        ],
      },
    ];
    const mentions = extractMentions(blocks);
    expect(mentions).toContain('770e8400-e29b-41d4-a716-446655440002');
  });

  it('should return empty array when no mentions', () => {
    const blocks: RichTextBlock[] = [
      { type: 'paragraph', content: 'No mentions here' },
    ];
    expect(extractMentions(blocks)).toEqual([]);
  });

  it('should handle empty blocks array', () => {
    expect(extractMentions([])).toEqual([]);
  });

  it('should handle blocks without content', () => {
    const blocks: RichTextBlock[] = [{ type: 'divider' }];
    expect(extractMentions(blocks)).toEqual([]);
  });
});

describe('extractLinks', () => {
  it('should extract URLs from block content', () => {
    const blocks: RichTextBlock[] = [
      {
        type: 'paragraph',
        content: 'Check out https://example.com and https://test.org/page',
      },
    ];
    const links = extractLinks(blocks);
    expect(links).toContain('https://example.com');
    expect(links).toContain('https://test.org/page');
  });

  it('should extract URLs from block.url property', () => {
    const blocks: RichTextBlock[] = [
      {
        type: 'image',
        url: 'https://cdn.example.com/image.png',
      },
    ];
    const links = extractLinks(blocks);
    expect(links).toContain('https://cdn.example.com/image.png');
  });

  it('should deduplicate links', () => {
    const blocks: RichTextBlock[] = [
      {
        type: 'paragraph',
        content: 'https://example.com and https://example.com again',
      },
    ];
    const links = extractLinks(blocks);
    expect(links).toHaveLength(1);
  });

  it('should extract links from nested children', () => {
    const blocks: RichTextBlock[] = [
      {
        type: 'quote',
        children: [
          {
            type: 'paragraph',
            content: 'See https://docs.example.com',
          },
        ],
      },
    ];
    const links = extractLinks(blocks);
    expect(links).toContain('https://docs.example.com');
  });

  it('should return empty array when no links', () => {
    const blocks: RichTextBlock[] = [
      { type: 'paragraph', content: 'No links here' },
    ];
    expect(extractLinks(blocks)).toEqual([]);
  });

  it('should handle empty blocks array', () => {
    expect(extractLinks([])).toEqual([]);
  });
});

describe('blocksToPlainText', () => {
  it('should convert paragraph blocks to text', () => {
    const blocks: RichTextBlock[] = [
      { type: 'paragraph', content: 'Hello World' },
    ];
    expect(blocksToPlainText(blocks)).toBe('Hello World');
  });

  it('should join multiple blocks with newlines', () => {
    const blocks: RichTextBlock[] = [
      { type: 'paragraph', content: 'Line 1' },
      { type: 'paragraph', content: 'Line 2' },
    ];
    expect(blocksToPlainText(blocks)).toBe('Line 1\nLine 2');
  });

  it('should handle code blocks with language', () => {
    const blocks: RichTextBlock[] = [
      { type: 'code', language: 'typescript', content: 'const x = 1;' },
    ];
    const result = blocksToPlainText(blocks);
    expect(result).toContain('[typescript]');
    expect(result).toContain('const x = 1;');
  });

  it('should handle nested children', () => {
    const blocks: RichTextBlock[] = [
      {
        type: 'list',
        children: [
          { type: 'list-item', content: 'Item 1' },
          { type: 'list-item', content: 'Item 2' },
        ],
      },
    ];
    const result = blocksToPlainText(blocks);
    expect(result).toContain('Item 1');
    expect(result).toContain('Item 2');
  });

  it('should handle empty blocks', () => {
    expect(blocksToPlainText([])).toBe('');
  });

  it('should handle blocks without content', () => {
    const blocks: RichTextBlock[] = [{ type: 'divider' }];
    expect(blocksToPlainText(blocks)).toBe('');
  });
});

describe('buildMessageContent', () => {
  it('should build content from text string', () => {
    const content = buildMessageContent('Hello World');
    expect(content.text).toBe('Hello World');
    expect(content.blocks).toEqual([{ type: 'paragraph', content: 'Hello World' }]);
    expect(content.mentions).toEqual([]);
    expect(content.links).toEqual([]);
  });

  it('should build content from blocks', () => {
    const blocks: RichTextBlock[] = [
      {
        type: 'paragraph',
        content: 'Hello @[Alice](user:550e8400-e29b-41d4-a716-446655440000)',
      },
    ];
    const content = buildMessageContent('Hello Alice', blocks);
    expect(content.text).toBe('Hello Alice');
    expect(content.blocks).toBe(blocks);
    expect(content.mentions).toContain('550e8400-e29b-41d4-a716-446655440000');
  });

  it('should extract links from blocks', () => {
    const blocks: RichTextBlock[] = [
      {
        type: 'paragraph',
        content: 'See https://example.com',
      },
    ];
    const content = buildMessageContent('See link', blocks);
    expect(content.links).toContain('https://example.com');
  });

  it('should derive text from blocks when text is empty', () => {
    const blocks: RichTextBlock[] = [
      { type: 'paragraph', content: 'Derived text' },
    ];
    const content = buildMessageContent('', blocks);
    expect(content.text).toBe('Derived text');
  });

  it('should handle empty blocks for text derivation', () => {
    const content = buildMessageContent('No blocks');
    expect(content.text).toBe('No blocks');
    expect(content.blocks).toEqual([{ type: 'paragraph', content: 'No blocks' }]);
    expect(content.mentions).toEqual([]);
    expect(content.links).toEqual([]);
  });
});
