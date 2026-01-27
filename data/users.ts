/**
 * Local user storage for testing
 *
 * Uses lowdb for simple JSON file persistence.
 * The users.json file is gitignored - app starts with default test users.
 */

import { JSONFileSyncPreset } from 'lowdb/node'
import { randomUUID } from 'crypto'

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  apiKey?: string
  lastLoginAt?: number
}

interface UsersData {
  users: User[]
}

const defaultData: UsersData = {
  users: [
    {
      id: 'abc-123',
      firstName: 'Test-1',
      lastName: 'User',
      email: 'test1@test.pri',
    },
    {
      id: 'def-456',
      firstName: 'Test-2',
      lastName: 'User',
      email: 'test2@test.pri',
    },
    {
      id: 'ghi-789',
      firstName: 'Test-3',
      lastName: 'User',
      email: 'test3@test.pri',
    },
    {
      id: 'jkl-012',
      firstName: 'Test-4',
      lastName: 'User',
      email: 'test4@test.pri',
    },
    {
      id: 'fds-948',
      firstName: 'Test-5',
      lastName: 'User',
      email: 'test5@test.pri',
    },
  ],
}

export const db = JSONFileSyncPreset<UsersData>('data/users.json', defaultData)

/**
 * Get all users
 */
export function all(): User[] {
  return db.data.users
}

/**
 * Find a user by ID
 */
export function findById(userId: string): User | undefined {
  return db.data.users.find(({ id }) => userId === id)
}

/**
 * Update a user's fields
 */
export function updateUser(userId: string, updates: Partial<Omit<User, 'id'>>): void {
  const user = findById(userId)
  if (user) {
    Object.assign(user, updates)
    db.write()
  }
}

/**
 * Create a new user
 */
export function create(userData: Omit<User, 'id'>): User {
  const newUser: User = {
    id: randomUUID(),
    ...userData,
  }
  db.data.users.push(newUser)
  db.write()
  return newUser
}

/**
 * Delete a user by ID
 */
export function remove(userId: string): boolean {
  const index = db.data.users.findIndex((u) => u.id === userId)
  if (index === -1) return false
  db.data.users.splice(index, 1)
  db.write()
  return true
}
