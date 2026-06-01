import { prisma, type PrismaTx } from '../client.js';
export class ProjectRepository {
  async findById(id: string, c: PrismaTx = prisma) { return c.project.findUnique({ where: { id }, include: { _count: { select: { tasks: true } } } }); }
  async listByWorkspace(wid: string, opts: { page?: number; limit?: number }, c: PrismaTx = prisma) {
    const page = opts.page ?? 1; const limit = Math.min(100, opts.limit ?? 50);
    const [data, total] = await Promise.all([c.project.findMany({ where: { workspaceId: wid, isDeleted: false }, skip: (page - 1) * limit, take: limit, orderBy: { updatedAt: 'desc' } }), c.project.count({ where: { workspaceId: wid, isDeleted: false } })]);
    return { data, total };
  }
  async create(data: { workspaceId: string; name: string; description?: string; prefix?: string; portfolioId?: string; defaultView?: string }, c: PrismaTx = prisma) { return c.project.create({ data: data as any }); }
  async update(id: string, data: Record<string, unknown>, c: PrismaTx = prisma) { return c.project.update({ where: { id }, data: data as any }); }
  async softDelete(id: string, c: PrismaTx = prisma) { return c.project.update({ where: { id }, data: { isDeleted: true } }); }
}

export class TaskRepository {
  async findById(id: string, c: PrismaTx = prisma) { return c.task.findUnique({ where: { id }, include: { assignee: { select: { id: true, displayName: true } }, children: true, blockers: true, blockedBy: true } }); }
  async listByProject(pid: string, opts: { page?: number; limit?: number; status?: string; assigneeId?: string; sprintId?: string }, c: PrismaTx = prisma) {
    const page = opts.page ?? 1; const limit = Math.min(200, opts.limit ?? 50);
    const where: Record<string, unknown> = { projectId: pid, isDeleted: false };
    if (opts.status) where.status = opts.status; if (opts.assigneeId) where.assigneeId = opts.assigneeId; if (opts.sprintId) where.sprintId = opts.sprintId;
    const [data, total] = await Promise.all([c.task.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { sortOrder: 'asc' }, include: { assignee: { select: { id: true, displayName: true, avatarUrl: true } } } }), c.task.count({ where })]);
    return { data, total };
  }
  async create(data: { workspaceId: string; projectId: string; parentId?: string; sprintId?: string; assigneeId?: string; title: string; description?: string; status?: string; priority?: string; epicLevel?: string; startDate?: Date; dueDate?: Date; estimatedHours?: number }, c: PrismaTx = prisma) { return c.task.create({ data: data as any }); }
  async update(id: string, data: Record<string, unknown>, c: PrismaTx = prisma) { return c.task.update({ where: { id }, data: data as any }); }
  async softDelete(id: string, c: PrismaTx = prisma) { return c.task.update({ where: { id }, data: { isDeleted: true } }); }
}

export class SprintRepository {
  async findById(id: string, c: PrismaTx = prisma) { return c.sprint.findUnique({ where: { id } }); }
  async listByProject(pid: string, c: PrismaTx = prisma) { return c.sprint.findMany({ where: { projectId: pid }, orderBy: { sortOrder: 'asc' }, include: { _count: { select: { tasks: true } } } }); }
  async create(data: { workspaceId: string; projectId: string; name: string; goal?: string; startDate?: Date; endDate?: Date }, c: PrismaTx = prisma) { return c.sprint.create({ data: data as any }); }
  async update(id: string, data: Record<string, unknown>, c: PrismaTx = prisma) { return c.sprint.update({ where: { id }, data: data as any }); }
}

export class TimeEntryRepository {
  async create(data: { taskId: string; userId: string; description?: string; hours: number; date?: Date; isBillable?: boolean }, c: PrismaTx = prisma) { return c.timeEntry.create({ data: data as any }); }
  async listByTask(taskId: string, c: PrismaTx = prisma) { return c.timeEntry.findMany({ where: { taskId }, orderBy: { date: 'desc' }, include: { user: { select: { id: true, displayName: true } } } }); }
  async listByUser(userId: string, c: PrismaTx = prisma) { return c.timeEntry.findMany({ where: { userId }, orderBy: { date: 'desc' } }); }
  async delete(id: string, c: PrismaTx = prisma) { return c.timeEntry.delete({ where: { id } }); }
}

export const projectRepo = new ProjectRepository();
export const taskRepo = new TaskRepository();
export const sprintRepo = new SprintRepository();
export const timeEntryRepo = new TimeEntryRepository();
