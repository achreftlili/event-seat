import { Router, Request, Response, NextFunction } from 'express';
import { getUserById, createUser } from '../services/userService';

const router = Router();

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const user = await getUserById(id);
    if (!user) {
      res.status(404).json({ error: `User with ID ${id} not found` });
      return;
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.post('/', (req: Request, res: Response) => {
  const { name, email } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  if (!email || typeof email !== 'string' || !email.trim()) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const user = createUser(name.trim(), email.trim());
  res.status(201).json(user);
});

export default router;
