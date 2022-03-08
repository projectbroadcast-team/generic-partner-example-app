import { LowSync, JSONFileSync } from 'lowdb'

const defaultData = {
  users: [
    {
      id: 'abc-123',
      firstName: 'Test-1',
      lastName: 'User',
      email: 'test1@test.pri'
    },
    {
      id: 'def-456',
      firstName: 'Test-2',
      lastName: 'User',
      email: 'test2@test.pri'
    }
  ]
}

export const db = new LowSync(new JSONFileSync('users.json'))
db.read()
if (!db.data) {
  db.data = { ...defaultData }
  db.write()
}

export function findById (userId) {
  return db.data.users.find(({ id }) => userId === id)
}

export function updateUser(userId, updates) {
  const user = userId?.id ? userId : findById(userId)
  Object.assign(user, updates)
  db.write()
}

export function all () {
  return db.data.users
}
