import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import usersRouter from './routes/users';
import cacheRouter from './routes/cache';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { getCacheStats } from './services/userService';
import { setupWebSocket } from './services/seatService';

const app = express();
const PORT = parseInt(process.env.API_PORT || '3000', 10);

app.use(cors());
app.use(express.json());

// Health check (no rate limiting)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply rate limiter to all /api routes except health
app.use('/api', rateLimiter);

// Routes
app.use('/api/users', usersRouter);
app.use('/api/cache', cacheRouter);
app.get('/api/cache-status', (_req, res) => {
  res.json(getCacheStats());
});

// Error handler
app.use(errorHandler);

// Create HTTP server and attach WebSocket
const server = createServer(app);
setupWebSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend API + WebSocket running on port ${PORT}`);
});

export default app;
