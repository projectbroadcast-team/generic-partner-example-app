const users = [
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

function findById (userId) {
  return users.find(({ id }) => userId === id)
}

function all () {
  return users
}

module.exports = {
  all,
  findById
}
