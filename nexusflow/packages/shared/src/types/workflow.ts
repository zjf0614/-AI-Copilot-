// Module E: Workflow Engine type definitions
export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type TriggerType = 'CRON' | 'WEBHOOK' | 'FORM_SUBMIT' | 'MESSAGE_COMMAND';
export interface Workflow { id: string; workspaceId: string; name: string; description: string | null; status: WorkflowStatus; triggerType: TriggerType; triggerConfig: Record<string, unknown>; nodes: WorkflowNode[]; edges: WorkflowEdge[]; version: number; runCount: number; lastRunAt: string | null; createdAt: string; updatedAt: string; }
export interface WorkflowNode { id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown>; }
export interface WorkflowEdge { id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string; condition?: string; }
export interface WorkflowExecution { id: string; workflowId: string; status: string; triggerData: Record<string, unknown>; inputData: Record<string, unknown>; outputData: Record<string, unknown>; nodeResults: object[]; errorMessage: string | null; retryCount: number; startedAt: string | null; completedAt: string | null; createdAt: string; }
export interface ApprovalRequest { id: string; workflowExecutionId: string; nodeId: string; approverId: string; status: string; comment: string | null; decidedAt: string | null; createdAt: string; updatedAt: string; }
export interface CreateWorkflowInput { name: string; description?: string; triggerType: TriggerType; triggerConfig?: Record<string, unknown>; nodes?: WorkflowNode[]; edges?: WorkflowEdge[]; }
export interface UpdateWorkflowInput { name?: string; description?: string | null; status?: WorkflowStatus; triggerConfig?: Record<string, unknown>; nodes?: WorkflowNode[]; edges?: WorkflowEdge[]; }
