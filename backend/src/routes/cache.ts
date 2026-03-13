import { Router, Request, Response } from 'express';
import { clearCache, getCacheStats } from '../services/userService';

const router = Router();

router.delete('/', (_req: Request, res: Response) => {
  clearCache();
  res.status(204).send();
});

router.get('/status', (_req: Request, res: Response) => {
  res.json(getCacheStats());
});

export default router;
