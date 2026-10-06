// Real schema validation, entirely in memory. No mongoose.connect or MongoDB server.
const mongoose = require('mongoose');
const Task = require('../../models/task');
const User = require('../../models/user');
const owner = new mongoose.Types.ObjectId();
const valid = { title: 'Valid task', priority: 'High Priority', userName: owner, checklist: [{ name: 'Check' }] };

test('BE-SCHEMA-01 defaults tasks to to-do and incomplete checklist entries', () => {
  const task = new Task(valid);
  expect(task.validateSync()).toBeUndefined();
  expect(task.category).toBe('to-do');
  expect(task.checklist[0].isDone).toBe(false);
});
test.each(['title', 'priority', 'userName'])('BE-SCHEMA-required-%s rejects a missing required task field', field => {
  const data = { ...valid }; delete data[field];
  expect(new Task(data).validateSync().errors[field]).toBeDefined();
});
test('BE-SCHEMA-05 trims task and checklist text', () => {
  const task = new Task({ ...valid, title: '  Task  ', checklist: [{ name: '  Check  ' }] });
  expect(task.title).toBe('Task');
  expect(task.checklist[0].name).toBe('Check');
});
test('BE-SCHEMA-06 rejects an empty checklist name', () => {
  expect(new Task({ ...valid, checklist: [{ name: '' }] }).validateSync().errors['checklist.0.name']).toBeDefined();
});
test('BE-SCHEMA-07 casts a valid due date', () => {
  const task = new Task({ ...valid, dueDate: '2026-10-10' });
  expect(task.validateSync()).toBeUndefined();
  expect(task.dueDate.toISOString()).toBe('2026-10-10T00:00:00.000Z');
});
test('BE-SCHEMA-08 rejects an invalid due date', () => {
  expect(new Task({ ...valid, dueDate: 'not-a-date' }).validateSync().errors.dueDate.name).toBe('CastError');
});
test('BE-SCHEMA-09 initializes a valid user with an empty board', () => {
  const user = new User({ name: 'Luis', email: 'qa@example.com', password: 'hash' });
  expect(user.validateSync()).toBeUndefined();
  expect(user.board).toEqual([]);
});
test.each(['name', 'email', 'password'])('BE-SCHEMA-user-%s rejects a missing required user field', field => {
  const data = { name: 'Luis', email: 'qa@example.com', password: 'hash' }; delete data[field];
  expect(new User(data).validateSync().errors[field]).toBeDefined();
});
