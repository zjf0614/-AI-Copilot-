/**
 * 模块 D：项目 & 任务 类型定义
 *
 * ## 项目层级
 * ```
 * Portfolio (项目组合)
 *   └── Project (项目) — 支持多种视图（列表/看板/甘特/日历/时间线）
 *        └── Sprint (冲刺) — 时间盒式的迭代周期
 *             └── Task (任务) — 可嵌套父子关系，支持自定义字段
 *                  └── TimeEntry (工时记录)
 * ```
 *
 * ## 任务依赖
 * TaskDependency 定义任务之间的阻塞关系。
 * 类型: blocks（阻塞）/ depends_on（依赖）/ relates_to（关联）
 */

export type ProjectViewType = 'LIST' | 'KANBAN' | 'GANTT' | 'CALENDAR' | 'TIMELINE';
export type TaskPriority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED';

export interface Project {
  id: string; workspaceId: string; name: string;
  description: string | null;
  /** 任务编号前缀（如 'PROJ' → 任务编号 PROJ-42） */
  prefix: string | null;
  leadId: string | null;
  /** 所属项目组合 */
  portfolioId: string | null;
  defaultView: ProjectViewType;
  isArchived: boolean; isDeleted: boolean;
  settings: Record<string, unknown>;
  createdAt: string; updatedAt: string;
}

export interface Task {
  id: string; workspaceId: string; projectId: string;
  /** 父任务 ID（子任务层级） */
  parentId: string | null;
  sprintId: string | null; assigneeId: string | null;
  title: string; description: string | null;
  status: string; priority: TaskPriority;
  /** Epic 级别（epic/story/task/bug） */
  epicLevel: string;
  startDate: string | null; dueDate: string | null;
  completedAt: string | null;
  estimatedHours: number | null;
  /** 在看板/列表中的排序位置 */
  sortOrder: number;
  isDeleted: boolean;
  metadata: Record<string, unknown>;
  createdAt: string; updatedAt: string;
}

export interface Sprint {
  id: string; workspaceId: string; projectId: string;
  name: string; goal: string | null;
  status: SprintStatus;
  startDate: string | null; endDate: string | null;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string; updatedAt: string;
}

export interface TimeEntry {
  id: string; taskId: string; userId: string;
  description: string | null;
  hours: number; date: string;
  /** 是否计费工时 */
  isBillable: boolean;
  createdAt: string; updatedAt: string;
}

/** 任务依赖关系 */
export interface TaskDependency {
  id: string; taskId: string; dependsOnId: string;
  type: string; // blocks / depends_on / relates_to
  createdAt: string;
}

/** 项目组合 — 多个项目的集合 */
export interface Portfolio {
  id: string; workspaceId: string; name: string;
  description: string | null; leadId: string | null;
  isDeleted: boolean;
  createdAt: string; updatedAt: string;
}

/** 自定义字段 — 扩展任务属性 */
export interface CustomField {
  id: string; workspaceId: string; name: string;
  fieldType: string; // text/number/date/select/multi_select/user
  options: string[];
  isActive: boolean;
  createdAt: string; updatedAt: string;
}

/** 自动化规则 */
export interface AutomationRule {
  id: string; workspaceId: string; projectId: string | null;
  name: string;
  trigger: object; conditions: object[]; actions: object;
  isEnabled: boolean; runCount: number;
  lastRunAt: string | null;
  createdAt: string; updatedAt: string;
}

export interface CreateProjectInput { name: string; description?: string; prefix?: string; portfolioId?: string; defaultView?: ProjectViewType; }
export interface CreateTaskInput { projectId: string; parentId?: string; sprintId?: string; assigneeId?: string; title: string; description?: string; status?: string; priority?: TaskPriority; epicLevel?: string; startDate?: string; dueDate?: string; estimatedHours?: number; }
export interface UpdateTaskInput { title?: string; description?: string | null; status?: string; priority?: TaskPriority; assigneeId?: string | null; sprintId?: string | null; estimatedHours?: number | null; dueDate?: string | null; startDate?: string | null; }
export interface CreateSprintInput { name: string; goal?: string; startDate?: string; endDate?: string; }
export interface CreateDependencyInput { dependsOnId: string; type?: string; }
export interface CreateTimeEntryInput { taskId: string; description?: string; hours: number; date?: string; isBillable?: boolean; }
