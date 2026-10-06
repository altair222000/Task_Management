// Model queries are stubs; controllers are called directly, without Express or HTTP.
jest.mock('../../models/task');
const Task = require('../../models/task');
const c = require('../../controllers/task');
const { response } = require('../helpers.cjs');
const user = { _id: 'owner-1', email: 'owner@example.com' };
const body = { title: 'QA task', priority: 'High Priority', checklist: [{ name: 'Check', isDone: false }], dueDate: '2026-10-10', assign: 'member@example.com' };
const populateQuery = (value) => ({ populate: jest.fn().mockResolvedValue(value) });
beforeEach(() => jest.resetAllMocks());
afterEach(() => jest.useRealTimers());

test('BE-TASK-01 returns a shared task by identifier', async () => {
  const task = { _id: 't1', title: 'Shared' }, res = response();
  Task.findById.mockResolvedValue(task);
  await c.getTask({ params: { id: 't1' } }, res);
  expect(Task.findById).toHaveBeenCalledWith('t1');
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.send).toHaveBeenCalledWith({ message: 'success', data: task });
});
test('BE-TASK-02 represents a nonexistent shared task as null (current contract)', async () => {
  Task.findById.mockResolvedValue(null);
  const res = response();
  await c.getTask({ params: { id: 'missing' } }, res);
  expect(res.send).toHaveBeenCalledWith({ message: 'success', data: null });
});
test('BE-TASK-03 propagates a shared-task lookup failure', async () => {
  Task.findById.mockRejectedValue(new Error('lookup failed'));
  await expect(c.getTask({ params: { id: 't1' } }, response())).rejects.toThrow('lookup failed');
});
test('BE-TASK-04 creates a task with the authenticated owner and supplied assignment', async () => {
  const task = { _id: 't1', ...body, userName: { _id: user._id, name: 'Owner' } };
  const save = jest.fn().mockResolvedValue({ _id: 't1' }), query = populateQuery(task);
  Task.mockImplementation(() => ({ save }));
  Task.findById.mockReturnValue(query);
  const res = response();
  await c.addTask({ body, user }, res);
  expect(Task).toHaveBeenCalledWith({ ...body, userName: user._id });
  expect(save).toHaveBeenCalledTimes(1);
  expect(query.populate).toHaveBeenCalledWith({ path: 'userName', select: 'name' });
  expect(res.send).toHaveBeenCalledWith({ message: 'success', data: task });
});
test('BE-TASK-05 does not query the created task after a failed save', async () => {
  Task.mockImplementation(() => ({ save: jest.fn().mockRejectedValue(new Error('save failed')) }));
  await expect(c.addTask({ body, user }, response())).rejects.toThrow('save failed');
  expect(Task.findById).not.toHaveBeenCalled();
});

test.each([['BE-TASK-06', undefined, 365], ['BE-TASK-07', '7', 7]])('%s groups tasks by category and applies the date filter', async (id, days, expectedDays) => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-06T12:00:00Z'));
  const categories = ['backlog', 'to-do', 'in-progress', 'done'];
  const resultKeys = ['backlog', 'todo', 'inProgress', 'done'];
  const values = categories.map(category => [{ _id: category, category }]);
  const queries = values.map(populateQuery);
  queries.forEach(q => Task.find.mockReturnValueOnce(q));
  const res = response();
  await c.getAllTask({ user, query: days === undefined ? {} : { days } }, res);
  const cutoff = new Date(Date.now() - expectedDays * 86400000);
  categories.forEach((category, i) => {
    expect(Task.find).toHaveBeenNthCalledWith(i + 1, { $or: [
      { $and: [{ userName: user._id }, { category }, { createdAt: { $gte: cutoff } }] },
      { $and: [{ assign: user.email }, { category }, { createdAt: { $gte: cutoff } }] },
    ] });
    expect(queries[i].populate).toHaveBeenCalledWith({ path: 'userName', select: 'name' });
  });
  expect(res.send).toHaveBeenCalledWith({ message: 'success', data: Object.fromEntries(resultKeys.map((key, i) => [key, values[i]])) });
});

test.each([
  ['BE-TASK-08', '', user.email, 'owner-1', true],
  ['BE-TASK-09', 'other@example.com', user.email, 'another-owner', true],
  ['BE-TASK-10', 'other@example.com', user.email, 'owner-1', false],
  ['BE-TASK-11', user.email, 'other@example.com', 'another-owner', false],
  ['BE-TASK-12', '', 'other@example.com', 'owner-1', false],
])('%s updates a task and signals removal from the former assignee board when appropriate', async (id, assign, oldAssign, owner, removal) => {
  Task.findById.mockResolvedValue({ assign: oldAssign, category: 'backlog' });
  const task = { _id: 't1', ...body, assign, userName: { _id: owner } };
  Task.findByIdAndUpdate.mockReturnValue(populateQuery(task));
  const res = response(), updatedBody = { ...body, assign };
  await c.updateTask({ params: { id: 't1' }, body: updatedBody, user }, res);
  expect(Task.findByIdAndUpdate).toHaveBeenCalledWith('t1', updatedBody, { new: true });
  expect(res.send).toHaveBeenCalledWith({ message: 'success', data: task, ...(removal ? { removeAssignCategory: 'backlog' } : {}) });
});

test('BE-TASK-13 deletes a task and returns the removed document', async () => {
  const task = { _id: 't1', category: 'to-do' }, res = response();
  Task.findByIdAndDelete.mockResolvedValue(task);
  await c.deleteTask({ params: { id: 't1' }, user }, res);
  expect(Task.findByIdAndDelete).toHaveBeenCalledWith('t1');
  expect(res.send).toHaveBeenCalledWith({ message: 'success', data: task });
});
test('BE-TASK-14 propagates a failed deletion', async () => {
  Task.findByIdAndDelete.mockRejectedValue(new Error('delete failed'));
  await expect(c.deleteTask({ params: { id: 't1' }, user }, response())).rejects.toThrow('delete failed');
});
test.each(['backlog', 'to-do', 'in-progress', 'done'])('BE-STATE-%s updates only the category field', async category => {
  const task = { _id: 't1', category }, query = populateQuery(task), res = response();
  Task.findByIdAndUpdate.mockReturnValue(query);
  await c.updateCategory({ params: { id: 't1' }, body: { category }, user }, res);
  expect(Task.findByIdAndUpdate).toHaveBeenCalledWith('t1', { category }, { new: true });
  expect(query.populate).toHaveBeenCalledWith({ path: 'userName', select: 'name' });
  expect(res.send).toHaveBeenCalledWith({ message: 'success', data: task });
});
