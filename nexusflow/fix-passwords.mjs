import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://nexusflow:nexusflow@localhost:5432/nexusflow'
});

const hash = await argon2.hash('Admin123!', {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
});

console.log('New hash:', hash.substring(0, 40) + '...');

const users = await prisma.user.findMany({ select: { id: true, email: true } });
console.log(`Found ${users.length} users`);

for (const u of users) {
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: hash } });
  console.log('Updated:', u.email);
}

await prisma.$disconnect();
console.log('Done! Try: admin@demo.com / Admin123! / demo');
