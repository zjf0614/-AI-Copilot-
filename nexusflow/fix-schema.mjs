import { readFileSync, writeFileSync } from 'node:fs';

let schema = readFileSync('e:/nexusflow/packages/database/prisma/schema.prisma', 'utf8');

// Fix single-line enums: convert "enum Name { A B C }" to multi-line
schema = schema.replace(/^enum (\w+) \{ ([^}]+) \}/gm, (match, name, values) => {
  const members = values.trim().split(/\s+/);
  return `enum ${name} {\n  ${members.join('\n  ')}\n}`;
});

// Fix single-line models by expanding each model field to its own line
// Pattern: model Name { field1; field2; ... }
schema = schema.replace(/^model (\w+) \{ (.+) \}$/gm, (match, name, body) => {
  // Split on semicolons that are followed by whitespace+next field or end
  const fields = body.split(/;(?:\s*(?=\w|\/\/|@@|$))/).map(f => f.trim()).filter(Boolean);
  return `model ${name} {\n  ${fields.join('\n  ')}\n}`;
});

writeFileSync('e:/nexusflow/packages/database/prisma/schema.prisma', schema, 'utf8');
console.log('Schema fixed. Lines:', schema.split('\n').length);
