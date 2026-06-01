/**
 * 模块 C：文档 & Wiki 类型定义
 *
 * ## 文档类型
 * - **PAGE**：普通文档页（支持嵌套层级）
 * - **WIKI**：Wiki 页（知识库风格）
 * - **TEMPLATE**：文档模板（可变量替换）
 *
 * ## 块编辑器 (Block Editor)
 * 文档基于块（Block）模型，类似 Notion。
 * 支持：段落、标题、列表、代码、引用、图片、视频、表格、标注、分隔线、嵌入、公式、折叠
 *
 * ## 版本管理
 * 每次编辑创建新版本（DocumentVersion），支持版本回滚和差异对比。
 *
 * ## 反向链接 (Backlink)
 * 自动追踪文档之间的引用关系，形成知识图谱。
 */

export type DocumentType = 'PAGE' | 'WIKI' | 'TEMPLATE';

/** 文档块 — 块编辑器的基本单元 */
export interface DocumentBlock {
  id: string;
  type: 'paragraph' | 'heading' | 'list' | 'code' | 'quote' | 'image' | 'video' | 'table' | 'callout' | 'divider' | 'embed' | 'equation' | 'toggle';
  props?: Record<string, unknown>;
  content?: string;
  children?: DocumentBlock[];
}

export interface Document {
  id: string;
  workspaceId: string;
  title: string;
  /** URL 友好的唯一标识 */
  slug: string;
  documentType: DocumentType;
  /** 父文档 ID（树形嵌套） */
  parentId: string | null;
  createdBy: string;
  lastEditedBy: string | null;
  content: Record<string, unknown>;
  blocks: DocumentBlock[];
  icon: string | null;
  coverUrl: string | null;
  isPublished: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  sortOrder: number;
  settings: DocumentSettings;
  children?: Document[];
  versionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSettings {
  fullWidth?: boolean;
  smallText?: boolean;
  showTableOfContents?: boolean;
  allowComments?: boolean;
  lockedBy?: string;
}

/** 文档版本 — 每次编辑自动创建 */
export interface DocumentVersion {
  id: string;
  documentId: string;
  /** 版本号（从 1 开始递增） */
  version: number;
  editorId: string;
  blocks: DocumentBlock[];
  content: Record<string, unknown>;
  changeLog: string | null;
  editor?: { id: string; displayName: string };
  createdAt: string;
}

/** 文档模板 — 支持变量替换 */
export interface DocumentTemplate {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  sourceDocId: string | null;
  blocks: DocumentBlock[];
  content: Record<string, unknown>;
  variables: TemplateVariable[];
  category: string | null;
  isPublic: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** 模板变量 — 使用模板时可替换的占位符 */
export interface TemplateVariable {
  name: string;
  type: 'text' | 'date' | 'user' | 'number' | 'url';
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}

/** 文档反向链接 — 其他文档引用本文档的记录 */
export interface DocumentBacklink {
  id: string;
  sourceDocId: string;
  targetDocId: string;
  context: string | null;
  sourceDoc?: { id: string; title: string; slug: string };
  createdAt: string;
}

/** 文档评论 */
export interface DocumentComment {
  id: string;
  documentId: string;
  userId: string;
  /** 关联的块 ID（块级评论） */
  blockId: string | null;
  content: string;
  /** 父评论 ID（嵌套回复） */
  parentId: string | null;
  isResolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  user?: { id: string; displayName: string; avatarUrl: string | null };
  replies?: DocumentComment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocInput {
  title: string;
  slug?: string;
  documentType?: DocumentType;
  parentId?: string;
  icon?: string;
  content?: Record<string, unknown>;
  blocks?: DocumentBlock[];
}

export interface UpdateDocInput {
  title?: string;
  content?: Record<string, unknown>;
  blocks?: DocumentBlock[];
  icon?: string | null;
  coverUrl?: string | null;
  isPublished?: boolean;
  settings?: DocumentSettings;
  sortOrder?: number;
}

export interface CreateVersionInput {
  blocks: DocumentBlock[];
  content?: Record<string, unknown>;
  changeLog?: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  sourceDocId?: string;
  blocks?: DocumentBlock[];
  content?: Record<string, unknown>;
  variables?: TemplateVariable[];
  category?: string;
  isPublic?: boolean;
}

export interface CreateCommentInput {
  blockId?: string;
  content: string;
  parentId?: string;
}

export interface DocSearchResult {
  id: string;
  title: string;
  slug: string;
  documentType: DocumentType;
  snippet: string;
  updatedAt: string;
}
