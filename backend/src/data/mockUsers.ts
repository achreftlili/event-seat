import { User } from '../types';

export const mockUsers: User[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  { id: 3, name: 'Alice Johnson', email: 'alice@example.com' },
];

let nextId = mockUsers.length + 1;

export function getNextId(): number {
  return nextId++;
}
