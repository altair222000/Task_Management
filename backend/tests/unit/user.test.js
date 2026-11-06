jest.mock('../../models/user');
jest.mock('bcryptjs');
const User = require('../../models/user');
const bcrypt = require('bcryptjs');
const c = require('../../controllers/user');
const { response } = require('../helpers.cjs');
const authUser = { id: 'u1', _id: 'u1', email: 'owner@example.com' };
beforeEach(() => jest.resetAllMocks());

test('BE-MEMBER-02 appends the requested email to the authenticated board', async () => {
  const email = 'member@example.com';
  User.findByIdAndUpdate.mockResolvedValue({ ...authUser, board: [email], password: 'hash' });
  const res = response();
  await c.updateBoard({ user: authUser, body: { email } }, res);
  expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', { $push: { board: email } }, { new: true });
  expect(res.json).toHaveBeenCalledWith({ message: 'success', data: { ...authUser, board: [email], password: null }, email });
});


describe('Validaciones de perfil y miembros', () => {
  test('BE-USER-01 consulta el perfil autenticado', async () => {
    const res = response();
    await c.getAuthUser({ user: authUser }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: authUser });
  });

  test('BE-USER-02 devuelve 404 cuando falta el usuario', async () => {
    const res = response();
    await c.getAuthUser({}, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User Not Found' });
  });

  test('BE-USER-03 consulta usuarios sin contraseñas y los ordena', async () => {
    const usuarios = [{ _id: 'u2', email: 'miembro@example.com' }];
    const sort = jest.fn().mockResolvedValue(usuarios);
    const select = jest.fn().mockReturnValue({ sort });
    User.find.mockReturnValue({ select });
    const res = response();

    await c.getAllUsers({ user: authUser }, res);

    expect(User.find).toHaveBeenCalledWith({ _id: { $ne: authUser._id } });
    expect(select).toHaveBeenCalledWith('-password');
    expect(sort).toHaveBeenCalledWith({ _id: -1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ data: usuarios });
  });

  test('BE-USER-04 actualiza el perfil conservando el correo', async () => {
    User.findById.mockResolvedValue({ password: 'hash-anterior' });
    bcrypt.compareSync.mockReturnValue(true);
    bcrypt.hashSync.mockReturnValue('hash-nuevo');
    User.findByIdAndUpdate.mockResolvedValue({ ...authUser, name: 'Usuario nuevo', password: 'hash-nuevo' });
    const res = response();
    const body = {
      name: 'Usuario nuevo', email: authUser.email,
      oldPassword: 'Anterior123!', newPassword: 'Nuevo123!',
    };

    await c.updateUser({ user: authUser, body }, res);

    expect(User.findOne).not.toHaveBeenCalled();
    expect(bcrypt.compareSync).toHaveBeenCalledWith('Anterior123!', 'hash-anterior');
    expect(bcrypt.hashSync).toHaveBeenCalledWith('Nuevo123!', 8);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', {
      name: 'Usuario nuevo', email: authUser.email, password: 'hash-nuevo',
    }, { new: true });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'success',
      data: { ...authUser, name: 'Usuario nuevo', password: null },
    });
  });

  test('BE-USER-05 cambia el correo cuando está disponible', async () => {
    const email = 'nuevo@example.com';
    User.findOne.mockResolvedValue(null);
    User.findById.mockResolvedValue({ password: 'hash-anterior' });
    bcrypt.compareSync.mockReturnValue(true);
    bcrypt.hashSync.mockReturnValue('hash-nuevo');
    User.findByIdAndUpdate.mockResolvedValue({ ...authUser, email, password: 'hash-nuevo' });
    const res = response();

    await c.updateUser({
      user: authUser,
      body: { name: 'Luis', email, oldPassword: 'Anterior123!', newPassword: 'Nuevo123!' },
    }, res);

    expect(User.findOne).toHaveBeenCalledWith({ email });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'success', data: { ...authUser, email, password: null },
    });
  });

  test('BE-USER-06 rechaza un correo ya utilizado', async () => {
    User.findOne.mockResolvedValue({ id: 'otro-usuario' });
    const res = response();

    await c.updateUser({
      user: authUser,
      body: {
        name: 'Luis', email: 'registrado@example.com',
        oldPassword: 'Anterior123!', newPassword: 'Nuevo123!',
      },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email Already Used' });
    expect(User.findById).not.toHaveBeenCalled();
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('BE-USER-07 rechaza una contraseña anterior incorrecta', async () => {
    User.findById.mockResolvedValue({ password: 'hash-anterior' });
    bcrypt.compareSync.mockReturnValue(false);
    const res = response();

    await c.updateUser({
      user: authUser,
      body: {
        name: 'Luis', email: authUser.email,
        oldPassword: 'incorrecta', newPassword: 'Nuevo123!',
      },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Password is incorrect' });
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
