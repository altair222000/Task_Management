const jwt = require('jsonwebtoken');
const { generateToken, getUserIdFromToken } = require('../../config/jwtProvider');
afterEach(() => jest.restoreAllMocks());

test('BE-JWT-01 round-trips a user identifier through a signed JWT', () => {
  expect(getUserIdFromToken(generateToken('user-123'))).toBe('user-123');
});
test('BE-JWT-02 sets a 48-hour expiration', () => {
  const payload = jwt.decode(generateToken('user-123'));
  expect(payload.exp - payload.iat).toBe(48 * 60 * 60);
});
test('BE-JWT-03 rejects a malformed token', () => {
  expect(() => getUserIdFromToken('not.a.valid-token')).toThrow();
});
test('BE-JWT-04 rejects a token signed by another secret', () => {
  const token = jwt.sign({ userId: 'u1' }, 'another-test-secret');
  expect(() => getUserIdFromToken(token)).toThrow('invalid signature');
});
test('BE-JWT-05 rejects an expired token without waiting for real time', () => {
  const token = jwt.sign({ userId: 'u1', exp: 1 }, process.env.JWT_SECRET);
  expect(() => getUserIdFromToken(token)).toThrow('jwt expired');
});
test('BE-JWT-06 delegates signing with only the intended payload and lifetime', () => {
  const sign = jest.spyOn(jwt, 'sign').mockReturnValue('stubbed-token');
  expect(generateToken('u1')).toBe('stubbed-token');
  expect(sign).toHaveBeenCalledWith({ userId: 'u1' }, process.env.JWT_SECRET, { expiresIn: '48h' });
});
