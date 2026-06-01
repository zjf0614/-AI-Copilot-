// Organization structure types: departments, teams, virtual groups

export interface Department {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  parentId: string | null;
  headUserId: string | null;
  headUserName?: string | null;
  sortOrder: number;
  isActive: boolean;
  memberCount?: number;
  children?: Department[];
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentTree extends Department {
  children: DepartmentTree[];
}

export interface Team {
  id: string;
  workspaceId: string;
  departmentId: string | null;
  departmentName?: string | null;
  name: string;
  description: string | null;
  leadUserId: string | null;
  leadUserName?: string | null;
  isActive: boolean;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VirtualGroup {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  rule: VirtualGroupRule;
  isActive: boolean;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VirtualGroupRule {
  operator: 'AND' | 'OR' | 'NOT';
  conditions: (VirtualGroupRule | AttributeRule)[];
}

export interface AttributeRule {
  attribute: string;
  operator: 'eq' | 'neq' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'gt' | 'lt' | 'gte' | 'lte' | 'regex';
  value: string | number | boolean | string[];
}

export interface OrgChart {
  departments: DepartmentTree[];
  unassignedUsers: OrgMember[];
}

export interface OrgMember {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
}

export interface Membership {
  userId: string;
  entityId: string;
  entityType: 'department' | 'team' | 'virtual_group';
  role?: string;
  isPrimary?: boolean;
  addedManually?: boolean;
  createdAt: string;
}

export interface CreateDepartmentInput {
  name: string;
  description?: string;
  parentId?: string;
  headUserId?: string;
  sortOrder?: number;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  departmentId?: string;
  leadUserId?: string;
}

export interface CreateVirtualGroupInput {
  name: string;
  description?: string;
  rule: VirtualGroupRule;
}

export interface AddMemberInput {
  userId: string;
  role?: string;
  isPrimary?: boolean;
}
