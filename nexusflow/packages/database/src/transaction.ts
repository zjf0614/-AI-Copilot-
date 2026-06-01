// Transaction helper for Prisma interactive transactions

import { prisma, type PrismaTx } from './client.js';

export async function tx<T>(
  fn: (tx: PrismaTx) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(fn);
}
