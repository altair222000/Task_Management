jest.mock('../../models/task');
const Task = require('../../models/task');
const { getAnalytics } = require('../../controllers/analytics');
const { response } = require('../helpers.cjs');
beforeEach(() => jest.resetAllMocks());
test('BE-ANALYTICS-01 returns all eight counters scoped to owner or assignee', async () => {
  const user = { _id: 'u1', email: 'owner@example.com' };
  const keys = ['backlog', 'todo', 'inProgress', 'done', 'high', 'moderate', 'low', 'dueDate'];
  const values = [1, 2, 3, 4, 5, 6, 7, 8];
  values.forEach(value => Task.find.mockReturnValueOnce({ countDocuments: jest.fn().mockResolvedValue(value) }));
  const res = response();
  await getAnalytics({ user }, res);
  expect(Task.find).toHaveBeenCalledTimes(8);
  for (const [query] of Task.find.mock.calls) {
    expect(query.$or[0].$and[0]).toEqual({ userName: 'u1' });
    expect(query.$or[1].$and[0]).toEqual({ assign: user.email });
  }
  const criteria = [{ category: 'backlog' }, { category: 'to-do' }, { category: 'in-progress' }, { category: 'done' }, { priority: 'High Priority' }, { priority: 'Moderate Priority' }, { priority: 'Low Priority' }, { dueDate: { $ne: '' } }];
  criteria.forEach((criterion, i) => {
    expect(Task.find.mock.calls[i][0].$or[0].$and[1]).toEqual(criterion);
    expect(Task.find.mock.calls[i][0].$or[1].$and[1]).toEqual(criterion);
  });
  expect(res.send).toHaveBeenCalledWith({ message: 'success', data: Object.fromEntries(keys.map((k, i) => [k, values[i]])) });
});
test('BE-ANALYTICS-02 propagates a failed counter query', async () => {
  Task.find.mockReturnValue({ countDocuments: jest.fn().mockRejectedValue(new Error('query failed')) });
  await expect(getAnalytics({ user: { _id: 'u1', email: 'qa@example.com' } }, response())).rejects.toThrow('query failed');
});
