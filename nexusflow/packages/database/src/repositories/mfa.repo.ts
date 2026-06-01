import { prisma, type PrismaTx } from '../client.js';

export class MfaRepository {
  async findByUser(userId: string, client: PrismaTx = prisma) {
    return client.mfaConfig.findUnique({ where: { userId } });
  }

  async create(data: {
    userId: string;
    mfaType: string;
    secretEncrypted: string;
  }, client: PrismaTx = prisma) {
    return client.mfaConfig.create({ data: data as any });
  }

  async verify(id: string, client: PrismaTx = prisma) {
    return client.mfaConfig.update({
      where: { id },
      data: { isVerified: true },
    });
  }

  async updateBackupCodes(id: string, backupCodesHash: string[], client: PrismaTx = prisma) {
    return client.mfaConfig.update({
      where: { id },
      data: { backupCodesHash },
    });
  }

  async removeCode(id: string, backupCodesHash: string[], client: PrismaTx = prisma) {
    return client.mfaConfig.update({
      where: { id },
      data: { backupCodesHash },
    });
  }

  async disable(id: string, client: PrismaTx = prisma) {
    return client.mfaConfig.delete({ where: { id } });
  }

  async isEnrolled(userId: string, client: PrismaTx = prisma): Promise<boolean> {
    const config = await client.mfaConfig.findUnique({
      where: { userId },
      select: { isVerified: true },
    });
    return config?.isVerified ?? false;
  }
}

export const mfaRepo = new MfaRepository();
