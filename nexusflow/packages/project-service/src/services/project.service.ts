import { projectRepo, taskRepo, sprintRepo, timeEntryRepo, prisma } from '@nexusflow/database';
import { AppError } from '@nexusflow/shared';
import type { CreateProjectInput, CreateTaskInput, UpdateTaskInput, CreateSprintInput, CreateDependencyInput, CreateTimeEntryInput } from '@nexusflow/shared';

export class ProjectService {
  async createProject(workspaceId: string, input: CreateProjectInput) { return projectRepo.create({ ...input, workspaceId }); }
  async listProjects(workspaceId: string, opts: { page?: number; limit?: number }) { return projectRepo.listByWorkspace(workspaceId, opts); }
  async getProject(id: string) { const p = await projectRepo.findById(id); if (!p || p.isDeleted) throw AppError.notFound('Project', id); return p; }
  async updateProject(id: string, data: Record<string, unknown>) { return projectRepo.update(id, data); }
  async deleteProject(id: string) { return projectRepo.softDelete(id); }

  async createTask(workspaceId: string, input: CreateTaskInput) {
    const project = await projectRepo.findById(input.projectId);
    if (!project || project.workspaceId !== workspaceId) throw AppError.notFound('Project', input.projectId);
    return taskRepo.create({ ...input, workspaceId } as any);
  }
  async listTasks(projectId: string, opts: { page?: number; limit?: number; status?: string; assigneeId?: string; sprintId?: string }) { return taskRepo.listByProject(projectId, opts); }
  async getTask(id: string) { const t = await taskRepo.findById(id); if (!t) throw AppError.notFound('Task', id); return t; }
  async updateTask(id: string, data: UpdateTaskInput) {
    const updates: Record<string, unknown> = { ...data };
    if (data.status === 'done') updates.completedAt = new Date();
    return taskRepo.update(id, updates);
  }
  async deleteTask(id: string) { return taskRepo.softDelete(id); }

  async addDependency(taskId: string, input: CreateDependencyInput) {
    const task = await taskRepo.findById(taskId); if (!task) throw AppError.notFound('Task', taskId);
    const depOn = await taskRepo.findById(input.dependsOnId); if (!depOn || depOn.projectId !== task.projectId) throw AppError.validation('Tasks must be in the same project');
    // Check for circular dependencies
    return (prisma as any).taskDependency.create({ data: { taskId, dependsOnId: input.dependsOnId, type: input.type ?? 'blocks' } });
  }

  async removeDependency(depId: string) { return (prisma as any).taskDependency.delete({ where: { id: depId } }); }

  async createSprint(workspaceId: string, projectId: string, input: CreateSprintInput) {
    return sprintRepo.create({ ...input, workspaceId, projectId } as any);
  }
  async listSprints(projectId: string) { return sprintRepo.listByProject(projectId); }
  async getSprint(id: string) { const s = await sprintRepo.findById(id); if (!s) throw AppError.notFound('Sprint', id); return s; }
  async updateSprint(id: string, data: Record<string, unknown>) { return sprintRepo.update(id, data); }

  async startSprint(id: string) { return sprintRepo.update(id, { status: 'ACTIVE', startDate: new Date() }); }
  async completeSprint(id: string) { return sprintRepo.update(id, { status: 'COMPLETED', completedAt: new Date() }); }

  async logTime(input: CreateTimeEntryInput & { userId: string }) { return timeEntryRepo.create(input as any); }
  async getTaskTimeEntries(taskId: string) { return timeEntryRepo.listByTask(taskId); }
  async getUserTimeEntries(userId: string) { return timeEntryRepo.listByUser(userId); }
  async deleteTimeEntry(id: string) { return timeEntryRepo.delete(id); }
}

export const projectService = new ProjectService();
