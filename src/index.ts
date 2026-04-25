import 'dotenv/config';
import { createServer } from 'http';
import app from "./app";
import { logger } from "./utils/logger";
import { trackingGateway } from './realtime/tracking.gateway';

// Obtém a porta dos argumentos de linha de comando ou do .env
const args = process.argv.slice(2);
const portArgIndex = args.indexOf("--port");
const port = portArgIndex !== -1 ? args[portArgIndex + 1] : process.env.PORT || 4203;

async function bootstrap() {
  const server = createServer(app);
  await trackingGateway.initialize(server);

  server.listen(port, () => {
    logger.info(`Server running on port ${port}`);
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to bootstrap server', error);
  process.exit(1);
});
