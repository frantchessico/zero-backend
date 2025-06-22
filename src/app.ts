import express from "express"
import cors from "cors"
import morgan from "morgan"

import { logger } from "./utils/logger"
import connectDatabase from "./config/database"
import user from './routes/user.routes'

const app = express()

// Connect to MongoDB
connectDatabase()

// Middlewares
app.use(cors())
app.use(morgan("dev"))
// app.use(json({ limit: "50mb" }))

app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
  limit: "50mb"
}));


// Routes
app.use("/api", user)



// Error handling
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err.stack);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

export default app