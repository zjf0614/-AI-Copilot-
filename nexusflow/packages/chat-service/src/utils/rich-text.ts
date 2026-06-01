/**
 * 富文本工具：解析提及（@mention）、提取链接、块转纯文本、构建消息内容
 *
 * ## 数据结构
 * 消息内容使用块（Block）模型，灵感来源于 Notion/Slack Block Kit：
 * ```
 * MessageContent {
 *   text: string;          // 纯文本摘要（用于搜索和通知）
 *   blocks: RichTextBlock[]; // 富文本块数组（用于渲染）
 *   mentions: string[];     // 被 @ 提及的用户 ID 列表（用于通知）
 *   links: string[];        // 消息中的链接列表（用于 link unfurl）
 * }
 * ```
 *
 * ## RichTextBlock 类型
 * - `paragraph`：普通文本段落，含内联内容（支持 @mention 和链接）
 * - `code`：代码块，含 language 标记（语法高亮用）
 * - `quote`：引用块，含 children（嵌套回复）
 * - `list` / `list-item`：有序/无序列表
 * - `divider`：分隔线
 * - `image`：图片，url 属性指向 CDN
 *
 * ## @mention 格式
 * 内联提及格式：`@[显示名称](user:uuid)`
 * 示例：`@[Alice](user:550e8400-e29b-41d4-a716-446655440000)`
 */

import type { RichTextBlock, MessageContent } from '@nexusflow/shared';

/**
 * 从富文本块中提取所有被 @ 提及的用户 ID
 *
 * 递归遍历所有块和子块（如引用块中的嵌套内容），
 * 用正则匹配 `@[...](user:uuid)` 格式并提取 UUID。
 * 结果自动去重（同一用户被多次提及只触发一次通知）。
 *
 * @param blocks - 富文本块数组
 * @returns 去重后的用户 UUID 数组
 */
export function extractMentions(blocks: RichTextBlock[]): string[] {
  const mentions: Set<string> = new Set(); // Set 自动去重

  /** 递归遍历块树 */
  const walk = (b: RichTextBlock) => {
    if (b.type === 'paragraph' && b.content) {
      // 匹配格式: @[Name](user:uuid)
      const matches = b.content.match(/@\[([^\]]+)\]\(user:([a-f0-9-]+)\)/g);
      if (matches) {
        matches.forEach(m => {
          // 提取 UUID 部分
          const id = m.match(/user:([a-f0-9-]+)/)?.[1];
          if (id) mentions.add(id);
        });
      }
    }
    // 递归处理子块（引用、列表等有 children 的块）
    if (b.children) b.children.forEach(walk);
  };

  blocks.forEach(walk);
  return [...mentions];
}

/**
 * 从富文本块中提取所有链接 URL
 *
 * 两个来源：
 * - block.url：图片、附件等块的直接链接
 * - block.content：段落文本中的内联链接（http/https URL）
 *
 * 递归遍历子块，结果自动去重。
 *
 * @param blocks - 富文本块数组
 * @returns 去重后的 URL 字符串数组
 */
export function extractLinks(blocks: RichTextBlock[]): string[] {
  const links: Set<string> = new Set();

  const walk = (b: RichTextBlock) => {
    // 来源 1：块的直接 url 属性（如图片链接）
    if (b.url) links.add(b.url);

    // 来源 2：段落文本中的内联链接
    if (b.content) {
      const matches = b.content.match(/https?:\/\/[^\s)]+/g);
      if (matches) matches.forEach(l => links.add(l));
    }

    // 递归处理子块
    if (b.children) b.children.forEach(walk);
  };

  blocks.forEach(walk);
  return [...links];
}

/**
 * 将富文本块数组转换为纯文本
 *
 * 用途：
 * - 生成消息搜索索引
 * - 推送通知的文本摘要
 * - 生成纯文本日志/导出
 *
 * 转换规则：
 * - paragraph → 直接取 content
 * - code → 添加 [language] 标签
 * - 嵌套块 → 递归转换，换行拼接
 * - 空白块 → trim 去除
 *
 * @param blocks - 富文本块数组
 * @returns 纯文本字符串
 */
export function blocksToPlainText(blocks: RichTextBlock[]): string {
  return blocks.map(b => blockToText(b)).join('\n');
}

/**
 * 单个块转纯文本（递归内部函数）
 */
function blockToText(block: RichTextBlock): string {
  let text = block.content ?? '';

  // 代码块：添加语言标记方便识别
  if (block.type === 'code' && block.language) {
    text = `[${block.language}]\n${text}`;
  }

  // 递归处理子块（如列表、引用）
  if (block.children) {
    text += '\n' + block.children.map(blockToText).join('\n');
  }

  return text.trim();
}

/**
 * 构建完整的消息内容对象
 *
 * 输入文本和可选的富文本块，输出结构化的 MessageContent。
 * 自动提取 mentions 和 links，保证数据一致性。
 *
 * @param text - 纯文本版本（用于搜索/通知）
 * @param blocks - 可选，富文本块数组（用于渲染）
 * @returns 结构化的 MessageContent
 */
export function buildMessageContent(text: string, blocks?: RichTextBlock[]): MessageContent {
  return {
    // 文本：优先使用提供的纯文本，否则从 blocks 派生
    text: text || blocksToPlainText(blocks ?? []),
    // 块：使用提供的 blocks，否则创建默认段落块
    blocks: blocks ?? [{ type: 'paragraph', content: text }],
    // 自动提取 mentions 和 links
    mentions: blocks ? extractMentions(blocks) : [],
    links: blocks ? extractLinks(blocks) : [],
  };
}
