// Workspace type definitions

export type PlanTier = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  planTier: PlanTier;
  settings: WorkspaceSettings;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSettings {
  mfaRequired?: boolean;
  passwordPolicy?: PasswordPolicy;
  sessionTimeoutMinutes?: number;
  idleTimeoutMinutes?: number;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
  };
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAgeDays: number;
  preventReuse: number;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  mfaRequired: false,
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    maxAgeDays: 90,
    preventReuse: 5,
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
  },
  sessionTimeoutMinutes: 1440,
  idleTimeoutMinutes: 30,
};

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  planTier?: PlanTier;
}

export interface UpdateWorkspaceInput {
  name?: string;
  planTier?: PlanTier;
  settings?: Partial<WorkspaceSettings>;
}

export interface WorkspaceStats {
  userCount: number;
  guestCount: number;
  roleDistribution: Record<string, number>;
  ssoConfigured: boolean;
  activeSince: string;
}
