// Database seed script — creates demo workspace, roles, and admin user

import { PrismaClient } from '@prisma/client';
import { DEFAULT_ROLES } from '@nexusflow/shared';
import crypto from 'node:crypto';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Corp',
      slug: 'demo',
      planTier: 'ENTERPRISE',
      settings: {
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
      },
    },
  });
  console.log(`  ✅ Workspace: ${workspace.name} (${workspace.slug})`);

  // Seed default roles
  const roleIds: Record<string, string> = {};
  for (const [key, roleDef] of Object.entries(DEFAULT_ROLES)) {
    const role = await prisma.role.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name: roleDef.name } },
      update: {},
      create: {
        workspaceId: workspace.id,
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
        permissions: roleDef.permissions,
        priority: roleDef.priority,
      },
    });
    roleIds[key] = role.id;
    console.log(`  ✅ Role: ${role.name} (priority: ${role.priority})`);
  }

  // Create demo admin user
  const adminEmail = 'admin@demo.com';
  const existingAdmin = await prisma.user.findFirst({
    where: { workspaceId: workspace.id, email: adminEmail },
  });

  if (!existingAdmin) {
    const adminUser = await prisma.user.create({
      data: {
        workspaceId: workspace.id,
        email: adminEmail,
        emailVerified: true,
        passwordHash: await argon2.hash('Admin123!', { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 }),
        displayName: 'Demo Admin',
        status: 'ACTIVE',
        jobTitle: 'System Administrator',
        location: 'US-East',
      },
    });

    // Assign Owner role
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: roleIds.OWNER!,
        scopeType: 'WORKSPACE',
        scopeId: workspace.id,
        assignedBy: adminUser.id,
      },
    });
    console.log(`  ✅ Admin user: ${adminUser.email} (Owner)`);

    // Create a demo member
    const memberUser = await prisma.user.create({
      data: {
        workspaceId: workspace.id,
        email: 'member@demo.com',
        emailVerified: true,
        passwordHash: await argon2.hash('Admin123!', { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 }),
        displayName: 'Demo Member',
        status: 'ACTIVE',
        jobTitle: 'Software Engineer',
        location: 'US-West',
      },
    });

    await prisma.userRole.create({
      data: {
        userId: memberUser.id,
        roleId: roleIds.MEMBER!,
        scopeType: 'WORKSPACE',
        scopeId: workspace.id,
        assignedBy: adminUser.id,
      },
    });
    console.log(`  ✅ Member user: ${memberUser.email} (Member)`);

    // Create demo departments
    const engDept = await prisma.department.create({
      data: {
        workspaceId: workspace.id,
        name: 'Engineering',
        description: 'Software engineering department',
        sortOrder: 1,
      },
    });
    console.log(`  ✅ Department: ${engDept.name}`);

    const designDept = await prisma.department.create({
      data: {
        workspaceId: workspace.id,
        name: 'Design',
        description: 'UX and visual design',
        sortOrder: 2,
      },
    });

    // Add admin to engineering
    await prisma.departmentMembership.create({
      data: { userId: adminUser.id, departmentId: engDept.id, isPrimary: true },
    });

    // Create a demo team
    const frontendTeam = await prisma.team.create({
      data: {
        workspaceId: workspace.id,
        departmentId: engDept.id,
        name: 'Frontend',
        description: 'Frontend application team',
        leadUserId: adminUser.id,
      },
    });
    console.log(`  ✅ Team: ${frontendTeam.name}`);

    // Add member to frontend team
    await prisma.teamMembership.create({
      data: { userId: memberUser.id, teamId: frontendTeam.id, roleInTeam: 'MEMBER' },
    });

    // Create demo virtual group
    const seniorGroup = await prisma.virtualGroup.create({
      data: {
        workspaceId: workspace.id,
        name: 'Senior Engineers',
        description: 'All senior-level engineers',
        rule: {
          operator: 'AND',
          conditions: [
            { attribute: 'user.job_title', operator: 'contains', value: 'Senior' },
            { attribute: 'user.department_id', operator: 'eq', value: engDept.id },
          ],
        },
      },
    });
    console.log(`  ✅ Virtual Group: ${seniorGroup.name}`);
  } else {
    console.log('  ⏭️  Demo data already exists, skipping...');
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('   Login: admin@demo.com / Admin123! (workspace: demo)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
