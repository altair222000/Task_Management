// Comprueba que los datos inválidos no lleguen a MongoDB.
jest.mock("../../models/user", () => {
  const User = jest.fn();
  User.findOne = jest.fn();
  User.findById = jest.fn();
  return User;
});

const User = require("../../models/user");
const { registerUser, loginUser } = require("../../controllers/auth");
const { updateUser, updateBoard } = require("../../controllers/user");

const response = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe("Validación contra entradas NoSQL", () => {
  test("registro rechaza un correo con operadores", async () => {
    const res = response();
    await registerUser({ body: { name: "Usuario", email: { $ne: null }, password: "Prueba123!" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test("registro rechaza un nombre que no sea texto", async () => {
    const res = response();
    await registerUser({ body: { name: { $ne: null }, email: "qa@example.com", password: "Prueba123!" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test("inicio de sesión rechaza un correo con operadores", async () => {
    const res = response();
    await loginUser({ body: { email: { $gt: "" }, password: "Prueba123!" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test("inicio de sesión rechaza una contraseña que sea objeto", async () => {
    const res = response();
    await loginUser({ body: { email: "qa@example.com", password: { $ne: null } } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test("actualización de perfil rechaza un correo con operadores", async () => {
    const res = response();
    await updateUser({ user: { id: "abc", email: "qa@example.com" }, body: {
      name: "Usuario", email: { $ne: null }, oldPassword: "Prueba123!", newPassword: "Nueva123!"
    } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findOne).not.toHaveBeenCalled();
    expect(User.findById).not.toHaveBeenCalled();
  });

  test("adición al tablero rechaza un correo con operadores", async () => {
    const res = response();
    await updateBoard({ user: { id: "abc" }, body: { email: { $ne: null } } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("inicio de sesión con datos vacíos devuelve error controlado", async () => {
    const res = response();
    await loginUser({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });
});


describe("Casos adicionales de entradas no válidas", () => {
  const registro = { name: "Usuario", email: "qa@example.com", password: "Prueba123!" };
  const acceso = { email: "qa@example.com", password: "Prueba123!" };
  const perfil = {
    name: "Usuario", email: "qa@example.com",
    oldPassword: "Anterior123!", newPassword: "Nueva123!"
  };
  const authUser = { id: "abc", email: "qa@example.com" };

  test.each([
    ["sin contenido", undefined],
    ["sin nombre", { ...registro, name: undefined }],
    ["nombre vacío", { ...registro, name: "   " }],
    ["correo sin formato", { ...registro, email: "correo-invalido" }],
    ["correo ausente", { ...registro, email: undefined }],
    ["contraseña vacía", { ...registro, password: "" }],
    ["contraseña no textual", { ...registro, password: { $ne: null } }],
  ])("registro: %s", async (_descripcion, body) => {
    const res = response();
    await registerUser({ body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid registration data" });
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test.each([
    ["sin contenido", undefined],
    ["correo ausente", { ...acceso, email: undefined }],
    ["correo sin formato", { ...acceso, email: "correo-invalido" }],
    ["contraseña ausente", { ...acceso, password: undefined }],
    ["contraseña vacía", { ...acceso, password: "" }],
  ])("inicio de sesión: %s", async (_descripcion, body) => {
    const res = response();
    await loginUser({ body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid login data" });
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test.each([
    ["sin contenido", undefined],
    ["nombre no textual", { ...perfil, name: { $ne: null } }],
    ["nombre vacío", { ...perfil, name: "   " }],
    ["correo sin formato", { ...perfil, email: "correo-invalido" }],
    ["correo ausente", { ...perfil, email: undefined }],
    ["contraseña anterior no textual", { ...perfil, oldPassword: { $ne: null } }],
    ["contraseña nueva no textual", { ...perfil, newPassword: { $ne: null } }],
    ["contraseña nueva vacía", { ...perfil, newPassword: "" }],
  ])("actualización de perfil: %s", async (_descripcion, body) => {
    const res = response();
    await updateUser({ user: authUser, body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid profile data" });
    expect(User.findOne).not.toHaveBeenCalled();
    expect(User.findById).not.toHaveBeenCalled();
  });

  test.each([
    ["sin contenido", undefined],
    ["correo ausente", {}],
    ["correo sin formato", { email: "correo-invalido" }],
    ["correo vacío", { email: "" }],
  ])("tablero: %s", async (_descripcion, body) => {
    const res = response();
    await updateBoard({ user: authUser, body }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid email format" });
  });
});
