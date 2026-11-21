import { createApp } from './src/app.js';
import { config } from './src/config/index.js';
import { pingDatabase, closePool } from './src/config/db.js';
import { initDatabaseExtensions } from './src/services/dbInitService.js';

const app = createApp();

async function bootstrap() {
  try {
    const ok = await pingDatabase();
    if (!ok) throw new Error('Database did not respond to a ping');
    console.log(`[db] connected to ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database}`);
    await initDatabaseExtensions();
  } catch (error) {
    console.error(`[db] connection failed: ${error.message}`);
    console.error('[db] run "npm run db:setup" to create the schema and seed data');
  }

  const server = app.listen(config.port, config.host, () => {
    console.log(`[web] Ancestral Abode listening on http://localhost:${config.port} (${config.env})`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[web] ${signal} received — closing gracefully`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap();
