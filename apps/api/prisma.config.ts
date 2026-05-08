import 'dotenv/config';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

import { config as loadDotenv } from 'dotenv';
loadDotenv({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
