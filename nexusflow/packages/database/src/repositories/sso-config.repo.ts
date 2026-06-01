import { prisma, type PrismaTx } from '../client.js';
import type { SsoProviderType } from '@nexusflow/shared';

export class SsoConfigRepository {
  async findById(id: string, client: PrismaTx = prisma) {
    return client.ssoConfig.findUnique({ where: { id } });
  }

  async findByWorkspace(workspaceId: string, client: PrismaTx = prisma) {
    return client.ssoConfig.findMany({ where: { workspaceId } });
  }

  async findByWorkspaceAndProvider(workspaceId: string, provider: SsoProviderType, client: PrismaTx = prisma) {
    return client.ssoConfig.findFirst({ where: { workspaceId, provider } });
  }

  async findByDomain(domain: string, client: PrismaTx = prisma) {
    return client.ssoConfig.findFirst({ where: { domain, isEnabled: true } });
  }

  async create(data: {
    workspaceId: string;
    provider: SsoProviderType;
    isEnabled?: boolean;
    domain?: string;
    configEncrypted: string;
    metadataUrl?: string;
  }, client: PrismaTx = prisma) {
    return client.ssoConfig.create({ data });
  }

  async update(id: string, data: Record<string, unknown>, client: PrismaTx = prisma) {
    return client.ssoConfig.update({ where: { id }, data });
  }

  async remove(id: string, client: PrismaTx = prisma) {
    return client.ssoConfig.delete({ where: { id } });
  }
}

export const ssoConfigRepo = new SsoConfigRepository();
