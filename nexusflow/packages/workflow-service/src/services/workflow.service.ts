import { prisma } from '@nexusflow/database';
import { AppError } from '@nexusflow/shared';
import type { CreateWorkflowInput, UpdateWorkflowInput } from '@nexusflow/shared';
export class WorkflowService {
  async create(workspaceId: string, input: CreateWorkflowInput) { return (prisma as any).workflow.create({ data: { ...input, workspaceId, nodes: input.nodes??[], edges: input.edges??[] } }); }
  async list(workspaceId: string, opts: { page?: number; limit?: number; status?: string }) {
    const page = opts.page??1; const limit = Math.min(100, opts.limit??50);
    const where: any = { workspaceId }; if(opts.status) where.status = opts.status;
    const [data, total] = await Promise.all([(prisma as any).workflow.findMany({ where, skip:(page-1)*limit, take:limit, orderBy:{updatedAt:'desc'} }), (prisma as any).workflow.count({ where })]);
    return { data, total };
  }
  async getById(id: string) { const w = await (prisma as any).workflow.findUnique({ where:{id}, include:{executions:{take:10,orderBy:{createdAt:'desc'}}} }); if(!w) throw AppError.notFound('Workflow', id); return w; }
  async update(id: string, input: UpdateWorkflowInput) { return (prisma as any).workflow.update({ where:{id}, data:input }); }
  async delete(id: string) { return (prisma as any).workflow.delete({ where:{id} }); }
  async publish(id: string) { return (prisma as any).workflow.update({ where:{id}, data:{status:'ACTIVE'} }); }
  async pause(id: string) { return (prisma as any).workflow.update({ where:{id}, data:{status:'PAUSED'} }); }
  async execute(workflowId: string, triggerData?: object) {
    const wf = await (prisma as any).workflow.findUnique({ where:{id:workflowId} });
    if(!wf || wf.status !== 'ACTIVE') throw AppError.forbidden('Workflow is not active');
    const exec = await (prisma as any).workflowExecution.create({ data:{workflowId, triggerData:triggerData??{}, status:'running', startedAt:new Date()} });
    await (prisma as any).workflow.update({ where:{id:workflowId}, data:{runCount:{increment:1}, lastRunAt:new Date()} });
    return exec;
  }
  async listExecutions(workflowId: string) { return (prisma as any).workflowExecution.findMany({ where:{workflowId}, orderBy:{createdAt:'desc'}, take:50 }); }
  async getExecution(id: string) { const e = await (prisma as any).workflowExecution.findUnique({ where:{id}, include:{workflow:true} }); if(!e) throw AppError.notFound('Execution', id); return e; }
  async completeExecution(id: string, outputData?: object) { return (prisma as any).workflowExecution.update({ where:{id}, data:{status:'completed', completedAt:new Date(), outputData:outputData??{}} }); }
  async failExecution(id: string, errorMessage: string) { return (prisma as any).workflowExecution.update({ where:{id}, data:{status:'failed', completedAt:new Date(), errorMessage} }); }
}
export const workflowService = new WorkflowService();
