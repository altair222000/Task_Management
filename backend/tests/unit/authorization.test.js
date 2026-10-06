jest.mock('../../models/user');
jest.mock('../../config/jwtProvider');
const User = require('../../models/user');
const { getUserIdFromToken } = require('../../config/jwtProvider');
const { authorization } = require('../../middlewares/authorization');
const wrapAsync = require('../../middlewares/wrapAsync');
const { response, flush } = require('../helpers.cjs');

beforeEach(() => jest.resetAllMocks());

test('BE-ACCESS-01 rejects a missing Authorization header', async () => {
  const res = response(), next = jest.fn();
  authorization({ headers: {} }, res, next);
  await flush();
  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.send).toHaveBeenCalledWith({ message: 'Token not found' });
  expect(next).not.toHaveBeenCalled();
  expect(User.findById).not.toHaveBeenCalled();
});

test('BE-ACCESS-02 rejects a header without a token', async () => {
  const res = response(), next = jest.fn();
  authorization({ headers: { authorization: 'Bearer' } }, res, next);
  await flush();
  expect(res.send).toHaveBeenCalledWith({ message: 'Token not found' });
  expect(getUserIdFromToken).not.toHaveBeenCalled();
});

test('BE-ACCESS-03 attaches the user excluding its password', async () => {
  const user = { _id: 'u1', email: 'qa@example.com' };
  const select = jest.fn().mockResolvedValue(user);
  User.findById.mockReturnValue({ select });
  getUserIdFromToken.mockReturnValue('u1');
  const req = { headers: { authorization: 'Bearer token-1' } }, next = jest.fn(), res = response();
  authorization(req, res, next);
  await flush();
  expect(getUserIdFromToken).toHaveBeenCalledWith('token-1');
  expect(User.findById).toHaveBeenCalledWith('u1');
  expect(select).toHaveBeenCalledWith('-password');
  expect(req.user).toEqual(user);
  expect(next).toHaveBeenCalledWith();
  expect(res.send).not.toHaveBeenCalled();
});

test('BE-ACCESS-04 rejects a token whose decoded payload lacks userId', async () => {
  getUserIdFromToken.mockReturnValue(undefined);
  const res = response(), next = jest.fn();
  authorization({ headers: { authorization: 'Bearer token' } }, res, next);
  await flush();
  expect(res.status).toHaveBeenCalledWith(404);
  expect(res.send).toHaveBeenCalledWith({ message: 'Something went wrong' });
  expect(next).not.toHaveBeenCalled();
});

test('BE-ACCESS-05 forwards a token verification failure to error handling', async () => {
  const error = new Error('expired token');
  getUserIdFromToken.mockImplementation(() => { throw error; });
  const res = response(), next = jest.fn();
  authorization({ headers: { authorization: 'Bearer expired' } }, res, next);
  await flush();
  expect(next).toHaveBeenCalledWith(error);
  expect(User.findById).not.toHaveBeenCalled();
});

test('BE-ACCESS-06 forwards a user lookup failure to error handling', async () => {
  const error = new Error('lookup failed');
  getUserIdFromToken.mockReturnValue('u1');
  User.findById.mockReturnValue({ select: jest.fn().mockRejectedValue(error) });
  const next = jest.fn();
  authorization({ headers: { authorization: 'Bearer token' } }, response(), next);
  await flush();
  expect(next).toHaveBeenCalledWith(error);
});

test('BE-ASYNC-01 passes the same request, response and next to the unit', async () => {
  const fn = jest.fn().mockResolvedValue(undefined), req = {}, res = response(), next = jest.fn();
  wrapAsync(fn)(req, res, next);
  await flush();
  expect(fn).toHaveBeenCalledWith(req, res, next);
  expect(next).not.toHaveBeenCalled();
});

test('BE-ASYNC-02 forwards a rejected asynchronous operation exactly once', async () => {
  const error = new Error('unit failed'), next = jest.fn();
  wrapAsync(jest.fn().mockRejectedValue(error))({}, response(), next);
  await flush();
  expect(next).toHaveBeenCalledTimes(1);
  expect(next).toHaveBeenCalledWith(error);
});
