import 'dotenv/config';
import app from "./app";
import { logger } from "./utils/logger";

// Obtém a porta dos argumentos de linha de comando ou do .env
const args = process.argv.slice(2);
const portArgIndex = args.indexOf("--port");
const port = portArgIndex !== -1 ? args[portArgIndex + 1] : process.env.PORT || 4203;

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
