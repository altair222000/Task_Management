# Dobles de prueba y su justificación

Un mock registra llamadas y permite comprobar parámetros. Un stub devuelve un
resultado controlado o provoca un error. Se prueban las unidades reales de la aplicación.

| Caso | Unidad real | Dependencia aislada | Justificación y comprobación |
| --- | --- | --- | --- |
| BE-AUTH-01 | registerUser | Modelo User, bcrypt.hashSync y generateToken | El registro se comprueba sin escribir MongoDB, calcular hashes costosos ni emitir tokens de producción. Se verifican email, hash, guardado y token para el identificador creado. |
| BE-AUTH-02 | registerUser | User.findOne | Un usuario existente permite reproducir la duplicidad sin sembrar una base. Se verifica que no se guarda ni se genera token. |
| BE-ACCESS-03 | authorization | getUserIdFromToken y User.findById().select() | Se prueba el middleware sin acoplar la firma JWT y la consulta de MongoDB. Se verifica la exclusión de contraseña y la llamada a next. |
| BE-TASK-04 | addTask | Constructor Task, save y findById().populate() | La tarea creada y su propietario se controlan en memoria. Se comprueban campos, asignación y respuesta sin depender de MongoDB. |
| BE-MEMBER-02 | updateBoard | User.findByIdAndUpdate | Se verifica el correo y el usuario destinatario de la actualización, sin modificar el tablero real. |
| FE-ADD-01 | useAddTask | fetch, toast y dispatch | La red, Railway y las notificaciones se aíslan. Se comprueban solicitud POST, token sintético y acciones de estado después del éxito. |
| FE-TRANSITION-done | useUpdateCategory | fetch y dispatch | Se controla una transición para verificar inserción en Done y eliminación de To Do, sin consultar una API real. |
| FE-PUBLIC-01 | useGetTask | fetch y callback de estado | Se comprueba la consulta pública y la ausencia de Authorization, sin requerir una tarea en Railway. |
| FE-PUBLIC-CARD-01 | TaskCardPublic | useGetTask | Se prueba exclusivamente la representación del componente con una tarea controlada. El hook se prueba por separado. |
| FE-LOGIN-03 | Register_Login | fetch y toast | Se prueba el formulario con una respuesta de autenticación determinista y un token sintético. |

Los mocks de dependencias no sustituyen la unidad evaluada. En backend se usan
`jest.mock`, `jest.fn` y `jest.spyOn`. En frontend se usan `vi.mock`,
`vi.fn` y `vi.stubGlobal`. Las aserciones evalúan salida y efectos observables.
Los modelos Mongoose también se validan en memoria con `validateSync`, sin conexión.

Estas pruebas no demuestran restricciones todavía ausentes, como el rechazo de un
miembro no registrado o la validación del propietario en cambios de tareas.
Esos defectos siguen abiertos y requieren pruebas adicionales al implementar su corrección.

