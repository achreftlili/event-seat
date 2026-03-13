import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[Error] ${err.message}`, err.stack);

  if (err.message === 'Job timeout') {
    res.status(504).json({ error: 'Gateway Timeout' });
    return;
  }

  res.status(500).json({ error: 'Internal Server Error' });
}
