jest.mock('../../models/user');
jest.mock('bcryptjs');
const User = require('../../models/user');
const bcrypt = require('bcryptjs');
const c = require('../../controllers/user');
const { response } = require('../helpers.cjs');
const authUser = { id: 'u1', _id: 'u1', email: 'owner@example.com' };
beforeEach(() => jest.resetAllMocks());

test('BE-USER-01 returns the authenticated profile', async () => {
  const res = response();
  await c.getAuthUser({ user: authUser }, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ data: authUser });
});
test('BE-USER-02 rejects a missing authenticated profile', async () => {
  const res = response();
  await c.getAuthUser({}, res);
  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.json).toHaveBeenCalledWith({ message: 'User Not Found' });
});
test('BE-USER-03 rejects a new email already used by another account', async () => {
  User.findOne.mockResolvedValue({ _id: 'u2' });
  const res = response();
  await c.updateUser({ user: authUser, body: { email: 'taken@example.com' } }, res);
  expect(res.json).toHaveBeenCalledWith({ message: 'Email Already Used' });
  expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
});
test.each([['BE-USER-04', authUser.email], ['BE-USER-05', 'new@example.com']])('%s hashes the new password and updates an available profile', async (id, email) => {
  User.findOne.mockResolvedValue(null);
  User.findById.mockResolvedValue({ password: 'old-hash' });
  bcrypt.compareSync.mockReturnValue(true);
  bcrypt.hashSync.mockReturnValue('new-hash');
  const updated = { name: 'New Name', email, password: 'new-hash' };
  User.findByIdAndUpdate.mockResolvedValue(updated);
  const body = { name: 'New Name', email, oldPassword: 'Old123!', newPassword: 'New123!' }, res = response();
  await c.updateUser({ user: authUser, body }, res);
  expect(bcrypt.compareSync).toHaveBeenCalledWith('Old123!', 'old-hash');
  expect(bcrypt.hashSync).toHaveBeenCalledWith('New123!', 8);
  expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', { name: 'New Name', email, password: 'new-hash' }, { new: true });
  expect(res.json).toHaveBeenCalledWith({ message: 'success', data: { name: 'New Name', email, password: null } });
  if (email === authUser.email) expect(User.findOne).not.toHaveBeenCalled();
});
test('BE-USER-06 rejects an incorrect current password', async () => {
  User.findById.mockResolvedValue({ password: 'hash' });
  bcrypt.compareSync.mockReturnValue(false);
  const res = response();
  await c.updateUser({ user: authUser, body: { email: authUser.email, oldPassword: 'wrong' } }, res);
  expect(res.json).toHaveBeenCalledWith({ message: 'Password is incorrect' });
  expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  expect(bcrypt.hashSync).not.toHaveBeenCalled();
});
test('BE-MEMBER-01 lists other users excluding passwords and sorting by descending id', async () => {
  const users = [{ _id: 'u2', email: 'member@example.com' }];
  const sort = jest.fn().mockResolvedValue(users), select = jest.fn().mockReturnValue({ sort });
  User.find.mockReturnValue({ select });
  const res = response();
  await c.getAllUsers({ user: authUser }, res);
  expect(User.find).toHaveBeenCalledWith({ _id: { $ne: 'u1' } });
  expect(select).toHaveBeenCalledWith('-password');
  expect(sort).toHaveBeenCalledWith({ _id: -1 });
  expect(res.send).toHaveBeenCalledWith({ data: users });
});
test('BE-MEMBER-02 appends the requested email to the authenticated board', async () => {
  const email = 'member@example.com';
  User.findByIdAndUpdate.mockResolvedValue({ ...authUser, board: [email], password: 'hash' });
  const res = response();
  await c.updateBoard({ user: authUser, body: { email } }, res);
  expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', { $push: { board: email } }, { new: true });
  expect(res.json).toHaveBeenCalledWith({ message: 'success', data: { ...authUser, board: [email], password: null }, email });
});
test('BE-MEMBER-03 propagates a board write failure', async () => {
  User.findByIdAndUpdate.mockRejectedValue(new Error('board write failed'));
  const res = response();
  await expect(c.updateBoard({ user: authUser, body: { email: 'member@example.com' } }, res)).rejects.toThrow('board write failed');
  expect(res.json).not.toHaveBeenCalled();
});
