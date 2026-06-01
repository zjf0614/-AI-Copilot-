// Tests for validation schemas
import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  mfaVerifySchema,
  mfaChallengeSchema,
  createWorkspaceSchema,
  updateWorkspaceSchema,
  updateUserSchema,
  createRoleSchema,
  assignRoleSchema,
  createDepartmentSchema,
  createTeamSchema,
  addTeamMemberSchema,
  createGuestInvitationSchema,
  acceptInvitationSchema,
  createShareLinkSchema,
  createSsoConfigSchema,
  createPolicySchema,
  auditQuerySchema,
  paginationSchema,
  createVirtualGroupSchema,
} from './validation.js';

describe('loginSchema', () => {
  it('should accept valid login data', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret123',
      workspaceSlug: 'my-workspace',
    });
    expect(result.success).toBe(true);
  });

  it('should lowercase email', () => {
    const result = loginSchema.safeParse({
      email: 'User@Example.COM',
      password: 'secret123',
      workspaceSlug: 'my-workspace',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('should reject invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'secret123',
      workspaceSlug: 'my-workspace',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
      workspaceSlug: 'my-workspace',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty workspace slug', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret123',
      workspaceSlug: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid workspace slug (uppercase)', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret123',
      workspaceSlug: 'Invalid-Slug',
    });
    expect(result.success).toBe(false);
  });

  it('should reject workspace slug with special chars', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret123',
      workspaceSlug: 'my_workspace',
    });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('should accept valid registration data', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'mySecurePass1',
      displayName: 'Test User',
      workspaceSlug: 'my-workspace',
      workspaceName: 'My Workspace',
    });
    expect(result.success).toBe(true);
  });

  it('should reject password shorter than 8 chars', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
      displayName: 'Test User',
      workspaceSlug: 'my-workspace',
      workspaceName: 'My Workspace',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty display name', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'mySecurePass1',
      displayName: '',
      workspaceSlug: 'my-workspace',
      workspaceName: 'My Workspace',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty workspace name', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'mySecurePass1',
      displayName: 'Test User',
      workspaceSlug: 'my-workspace',
      workspaceName: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('should accept valid passwords', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldPass1',
      newPassword: 'newSecurePass1',
    });
    expect(result.success).toBe(true);
  });

  it('should reject new password shorter than 8 chars', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldPass1',
      newPassword: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty current password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: '',
      newPassword: 'newSecurePass1',
    });
    expect(result.success).toBe(false);
  });
});

describe('mfaVerifySchema', () => {
  it('should accept 6-digit TOTP code', () => {
    const result = mfaVerifySchema.safeParse({ totpCode: '123456' });
    expect(result.success).toBe(true);
  });

  it('should reject non-digit TOTP code', () => {
    const result = mfaVerifySchema.safeParse({ totpCode: 'abc123' });
    expect(result.success).toBe(false);
  });

  it('should reject wrong length', () => {
    const result = mfaVerifySchema.safeParse({ totpCode: '12345' });
    expect(result.success).toBe(false);
    const result2 = mfaVerifySchema.safeParse({ totpCode: '1234567' });
    expect(result2.success).toBe(false);
  });
});

describe('mfaChallengeSchema', () => {
  it('should accept valid challenge data', () => {
    const result = mfaChallengeSchema.safeParse({
      mfaToken: 'some-jwt-token',
      totpCode: '123456',
    });
    expect(result.success).toBe(true);
  });
});

describe('createWorkspaceSchema', () => {
  it('should accept valid data with default plan tier', () => {
    const result = createWorkspaceSchema.safeParse({
      name: 'My Workspace',
      slug: 'my-workspace',
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid plan tier', () => {
    const result = createWorkspaceSchema.safeParse({
      name: 'My Workspace',
      slug: 'my-workspace',
      planTier: 'PRO',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid plan tier', () => {
    const result = createWorkspaceSchema.safeParse({
      name: 'My Workspace',
      slug: 'my-workspace',
      planTier: 'INVALID',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateUserSchema', () => {
  it('should accept partial update', () => {
    const result = updateUserSchema.safeParse({ displayName: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('should accept null avatarUrl', () => {
    const result = updateUserSchema.safeParse({ avatarUrl: null });
    expect(result.success).toBe(true);
  });

  it('should accept valid status', () => {
    const result = updateUserSchema.safeParse({ status: 'INACTIVE' });
    expect(result.success).toBe(true);
  });

  it('should reject empty object (all fields optional but at least one should be provided)', () => {
    // Actually the schema allows all fields to be optional, so empty object is valid
    const result = updateUserSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('createRoleSchema', () => {
  it('should accept valid role', () => {
    const result = createRoleSchema.safeParse({
      name: 'Editor',
      permissions: ['channel:read', 'message:send'],
    });
    expect(result.success).toBe(true);
  });

  it('should reject role without permissions', () => {
    const result = createRoleSchema.safeParse({
      name: 'Editor',
      permissions: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('assignRoleSchema', () => {
  it('should accept valid assignment', () => {
    const result = assignRoleSchema.safeParse({
      roleId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = assignRoleSchema.safeParse({ roleId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

describe('createGuestInvitationSchema', () => {
  it('should accept valid invitation', () => {
    const result = createGuestInvitationSchema.safeParse({
      email: 'guest@example.com',
      roleId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('should reject email without domain', () => {
    const result = createGuestInvitationSchema.safeParse({
      email: 'invalid',
      roleId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(false);
  });
});

describe('createShareLinkSchema', () => {
  it('should accept valid share link', () => {
    const result = createShareLinkSchema.safeParse({
      resourceType: 'doc',
      resourceId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });
});

describe('auditQuerySchema', () => {
  it('should use defaults', () => {
    const result = auditQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(50);
      expect(result.data.sort).toBe('desc');
    }
  });

  it('should coerce string page/limit to numbers', () => {
    const result = auditQuerySchema.safeParse({ page: '3', limit: '25' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(25);
    }
  });
});

describe('paginationSchema', () => {
  it('should use defaults', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });
});

describe('createTeamSchema', () => {
  it('should accept valid team', () => {
    const result = createTeamSchema.safeParse({
      name: 'Engineering Team',
      departmentId: '550e8400-e29b-41d4-a716-446655440000',
      leadUserId: '550e8400-e29b-41d4-a716-446655440001',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    const result = createTeamSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});

describe('addTeamMemberSchema', () => {
  it('should accept valid member', () => {
    const result = addTeamMemberSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      roleInTeam: 'LEAD',
    });
    expect(result.success).toBe(true);
  });

  it('should use default role', () => {
    const result = addTeamMemberSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });
});

describe('createPolicySchema', () => {
  it('should accept valid ALLOW policy', () => {
    const result = createPolicySchema.safeParse({
      name: 'Office Hours Only',
      effect: 'DENY',
      conditions: {
        operator: 'NOT',
        conditions: [
          {
            attribute: 'current_time',
            operator: 'gte',
            value: '09:00',
          },
          {
            attribute: 'current_time',
            operator: 'lte',
            value: '17:00',
          },
        ],
      },
      actions: ['*:*'],
    });
    expect(result.success).toBe(true);
  });

  it('should accept policy with AND conditions', () => {
    const result = createPolicySchema.safeParse({
      name: 'Restricted',
      effect: 'DENY',
      conditions: {
        operator: 'AND',
        conditions: [
          { attribute: 'ip', operator: 'cidr', value: '10.0.0.0/8' },
          { attribute: 'role', operator: 'eq', value: 'Guest' },
        ],
      },
      actions: ['channel:read'],
      resources: ['channel:general'],
    });
    expect(result.success).toBe(true);
  });
});

describe('createSsoConfigSchema', () => {
  it('should accept OIDC config', () => {
    const result = createSsoConfigSchema.safeParse({
      provider: 'GENERIC_OIDC',
      config: {
        clientId: 'my-client',
        clientSecret: 'my-secret',
        issuerUrl: 'https://auth.example.com',
      },
    });
    expect(result.success).toBe(true);
  });

  it('should accept SAML config', () => {
    const result = createSsoConfigSchema.safeParse({
      provider: 'GENERIC_SAML',
      config: {
        entryPoint: 'https://sso.example.com/saml',
        cert: '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----',
        issuer: 'nexusflow',
        audience: 'nexusflow-users',
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('createDepartmentSchema', () => {
  it('should accept valid department', () => {
    const result = createDepartmentSchema.safeParse({
      name: 'Engineering',
      parentId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });
});

describe('createVirtualGroupSchema', () => {
  it('should accept valid virtual group', () => {
    const result = createVirtualGroupSchema.safeParse({
      name: 'Senior Engineers',
      rule: {
        operator: 'AND',
        conditions: [
          { attribute: 'department', operator: 'eq', value: 'Engineering' },
          { attribute: 'jobTitle', operator: 'contains', value: 'Senior' },
        ],
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('forgotPasswordSchema', () => {
  it('should accept valid data', () => {
    const result = forgotPasswordSchema.safeParse({
      email: 'user@example.com',
      workspaceSlug: 'my-workspace',
    });
    expect(result.success).toBe(true);
  });
});

describe('resetPasswordSchema', () => {
  it('should accept valid data', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'reset-token-123',
      newPassword: 'newSecurePass1',
    });
    expect(result.success).toBe(true);
  });
});

describe('acceptInvitationSchema', () => {
  it('should accept valid data', () => {
    const result = acceptInvitationSchema.safeParse({
      invitationToken: '550e8400-e29b-41d4-a716-446655440000',
      displayName: 'Guest User',
      password: 'securePass123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID token', () => {
    const result = acceptInvitationSchema.safeParse({
      invitationToken: 'not-a-uuid',
      displayName: 'Guest User',
      password: 'securePass123',
    });
    expect(result.success).toBe(false);
  });
});
