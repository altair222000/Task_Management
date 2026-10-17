# E11 - Pruebas de API

La colección `task-management.postman_collection.json` contiene 20 solicitudes para la API del proyecto. Cada solicitud valida el estado HTTP, el tipo de contenido JSON, el esquema de respuesta y los datos esperados.

## Flujo de negocio cubierto

La colección ejecuta las solicitudes en orden: registra un usuario único, valida inicio de sesión, consulta el perfil, crea una tarea, consulta el tablero y la analítica, cambia su categoría, actualiza sus datos, vuelve a consultarla y finalmente la elimina.

También comprueba errores esperados: correo duplicado, usuario inexistente, contraseña incorrecta, acceso sin token y ruta no válida.

## Ejecutar localmente

Se necesita Node.js 18.17.1, MongoDB y Newman 6.2.3. Use una base de datos aislada para estas pruebas.

1. Inicie MongoDB local.
2. En una terminal, desde `backend`, configure las variables y arranque la API:

```powershell
$env:MONGODB_URI="mongodb://127.0.0.1:27017/task_management_e11"
$env:MONGODB_DB_NAME="task_management_e11"
$env:JWT_SECRET="e11-local-only-secret"
$env:PORT="3000"
npm start
```

3. En otra terminal, desde `backend`, ejecute la colección:

```powershell
npx --yes newman@6.2.3 run tests/api/task-management.postman_collection.json --env-var "baseUrl=http://127.0.0.1:3000" --reporters cli,json --reporter-json-export reports/api-tests.json
```

La colección genera un correo y títulos únicos por ejecución. Elimina la tarea creada, pero la API no cuenta con una ruta para borrar el usuario de prueba; por ello, use una base local desechable o de pruebas. No configure el `baseUrl` de producción para esta colección, porque las solicitudes registran cuentas y modifican datos.

## Ejecución en GitHub Actions

El workflow `.github/workflows/api-tests.yml` crea un servicio MongoDB temporal, inicia la API con una base `task_management_e11` independiente y ejecuta Newman. Se activa al enviar cambios a `develop`, al abrir/actualizar un PR dirigido a `develop` o mediante ejecución manual. El reporte JSON se publica como artefacto del workflow.
