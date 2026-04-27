import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/storage/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: ':memory:',
  },
});
