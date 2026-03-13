import { Job, JobStatus } from '../types';

interface QueuedJob<T> extends Job<T> {
  task: () => Promise<T>;
}

export class JobQueue<T> {
  private queue: QueuedJob<T>[] = [];
  private active = 0;
  private maxConcurrency: number;
  private pendingJobs: Map<string, QueuedJob<T>> = new Map();
  private timeoutMs: number;

  constructor(maxConcurrency = 5, timeoutMs = 5000) {
    this.maxConcurrency = maxConcurrency;
    this.timeoutMs = timeoutMs;
  }

  enqueue(id: string, task: () => Promise<T>): Promise<T> {
    const existing = this.pendingJobs.get(id);
    if (existing && existing.status !== 'done' && existing.status !== 'failed') {
      return existing.promise;
    }

    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const job: QueuedJob<T> = { id, promise, resolve, reject, status: 'pending', task };
    this.pendingJobs.set(id, job);
    this.queue.push(job);

    this.processNext();
    return promise;
  }

  private async processNext(): Promise<void> {
    if (this.active >= this.maxConcurrency || this.queue.length === 0) return;

    const job = this.queue.shift();
    if (!job || job.status !== 'pending') return;

    this.active++;
    job.status = 'processing';

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Job timeout')), this.timeoutMs)
    );

    try {
      const result = await Promise.race([job.task(), timeout]);
      job.status = 'done';
      job.resolve(result);
    } catch (err) {
      job.status = 'failed';
      job.reject(err);
    } finally {
      this.active--;
      this.pendingJobs.delete(job.id);
      if (this.queue.length > 0) {
        this.processNext();
      }
    }
  }

  get queueLength(): number {
    return this.queue.length;
  }

  get activeCount(): number {
    return this.active;
  }
}
