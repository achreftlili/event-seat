import { JobQueue } from './jobQueue';

describe('JobQueue', () => {
  describe('basic enqueue', () => {
    it('processes a task and returns its result', async () => {
      const queue = new JobQueue<string>(5, 5000);
      const result = await queue.enqueue('job1', () => Promise.resolve('done'));
      expect(result).toBe('done');
    });

    it('processes multiple tasks in order', async () => {
      const queue = new JobQueue<number>(2, 5000);
      const order: number[] = [];
      const task = (n: number) => () =>
        new Promise<number>((res) =>
          setTimeout(() => {
            order.push(n);
            res(n);
          }, 10)
        );

      const results = await Promise.all([
        queue.enqueue('a', task(1)),
        queue.enqueue('b', task(2)),
        queue.enqueue('c', task(3)),
      ]);

      expect(results).toEqual([1, 2, 3]);
    });
  });

  describe('deduplication', () => {
    it('returns the same promise for duplicate job IDs', async () => {
      const queue = new JobQueue<string>(5, 5000);
      let callCount = 0;
      const task = () => {
        callCount++;
        return new Promise<string>((res) => setTimeout(() => res('result'), 50));
      };

      const [r1, r2] = await Promise.all([
        queue.enqueue('same-id', task),
        queue.enqueue('same-id', task),
      ]);

      expect(r1).toBe('result');
      expect(r2).toBe('result');
      // The task should only execute once due to deduplication
      expect(callCount).toBe(1);
    });
  });

  describe('concurrency limit', () => {
    it('does not exceed max concurrency', async () => {
      const queue = new JobQueue<void>(2, 5000);
      let concurrent = 0;
      let maxConcurrent = 0;

      const task = (id: string) => () =>
        new Promise<void>((res) => {
          concurrent++;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          setTimeout(() => {
            concurrent--;
            res();
          }, 30);
        });

      await Promise.all([
        queue.enqueue('a', task('a')),
        queue.enqueue('b', task('b')),
        queue.enqueue('c', task('c')),
        queue.enqueue('d', task('d')),
      ]);

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('timeout', () => {
    it('rejects when a task exceeds the timeout', async () => {
      const queue = new JobQueue<string>(5, 50); // 50ms timeout
      const slowTask = () =>
        new Promise<string>((res) => setTimeout(() => res('late'), 200));

      await expect(queue.enqueue('slow', slowTask)).rejects.toThrow('Job timeout');
    });
  });

  describe('error isolation', () => {
    it('one failed job does not affect others', async () => {
      const queue = new JobQueue<string>(5, 5000);

      const good = queue.enqueue('good', () => Promise.resolve('ok'));
      const bad = queue.enqueue('bad', () => Promise.reject(new Error('fail')));
      const also_good = queue.enqueue('also-good', () => Promise.resolve('also ok'));

      expect(await good).toBe('ok');
      await expect(bad).rejects.toThrow('fail');
      expect(await also_good).toBe('also ok');
    });
  });

  describe('properties', () => {
    it('reports queue length and active count', () => {
      const queue = new JobQueue<string>(1, 5000);
      expect(queue.queueLength).toBe(0);
      expect(queue.activeCount).toBe(0);
    });
  });
});
