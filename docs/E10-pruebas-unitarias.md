# E10 Pruebas unitarias

Este repositorio contiene la parte backend del entregable E10 de Task Management.
Los cambios se desarrollan en `develop`. Framework: Jest 29.7.0.
El otro repositorio está en https://github.com/altair222000/Task_Management_frontend/tree/develop.

## Ejecutar

Desde la raíz del repositorio:

```bash
git switch develop
git fetch origin
cd backend
npm ci
npm test
npm run test:ci
```

`npm test` ejecuta solo las pruebas unitarias. `npm run test:ci` reproduce la línea base
sobre el commit original, ejecuta las pruebas con cobertura y comprueba el incremento.
La reconstrucción de la base usa Git y tar. En clones poco profundos, ejecutar
`git fetch --unshallow` antes de medir la base.

Hay 15 pruebas unitarias en este repositorio. El total de ambos es 30
(15 backend y 15 frontend). Las pruebas de instrumentación en `tests/baseline`
no forman parte de ese total.

## Línea base de la sección 2.4

El documento de Fase II declara que el proyecto no incorporaba pruebas automatizadas.
No existía un informe numérico histórico. La línea base de 0% se reconstruye ahora,
de forma reproducible, instrumentando el código del commit identificado en
`coverage-critical.json`, sin ejecutar unidades de aplicación.

`scripts/measure-baseline.cjs` extrae ese commit en un directorio temporal aislado
mediante `git archive`. El resultado no depende del código actual de la aplicación.
`coverage-baseline.json` conserva el commit, la fecha, los denominadores y los hashes
de los archivos. No se presenta esta reconstrucción como un reporte emitido durante E1.

## Módulos críticos de E2

`coverage-critical.json` relaciona los cinco módulos de E2 con archivos completos:
autenticación y acceso, gestión de tareas, estados, miembros y visor público.

La métrica de aceptación es cobertura de líneas:

- Cobertura = líneas cubiertas / líneas instrumentadas × 100.
- Incremento en puntos porcentuales = cobertura actual − cobertura base.
- Cada módulo y cada archivo crítico debe incrementar al menos 20 puntos.
- Cada repositorio debe aprobar al menos 15 pruebas, sin omitir ni dejar pendientes.
- El total del ámbito crítico cuenta una sola vez los archivos compartidos.

Algunos controladores y `Model.jsx` participan en varias funcionalidades.
Los informes por módulo incluyen el archivo completo; no se atribuye un porcentaje
de archivo a una función específica. Los reportes generales de Jest/Vitest reflejan
el ámbito configurado, no la cobertura global de todo el producto.

## Mocks y stubs

El inventario y la justificación están en `docs/E10-dobles.md`.
Los controladores se invocan directamente con dobles de modelos y respuesta, sin
levantar Express. Los componentes y hooks usan un fetch simulado y datos sintéticos.
MongoDB, Railway y credenciales reales no son necesarios para ejecutar E10.

## Pipeline y evidencia

GitHub Actions ejecuta `npm ci` y `npm run test:ci` en cada push a
`develop`, `main`, `release` o `hotfix`, y en pull requests.
El frontend también compila con `npm run build`.
El workflow no despliega la aplicación.

El artefacto de Actions incluye:

- `coverage/baseline` y `coverage/unit`: HTML, LCOV y JSON.
- `reports/unit-tests.json`: casos ejecutados y resultado.
- `reports/critical-coverage.json` y `.md`: comparación por módulo y archivo.
- `coverage-baseline.json` y `coverage-critical.json`: base y alcance versionados.

Abra `coverage/unit/index.html` después de extraer el artefacto.
El resumen del job muestra los incrementos de los cinco módulos.
No se deben subir reportes generados a Git; el workflow los publica como artefactos.

## Alcance y defectos pendientes

Se añadieron pruebas de regresión sobre el comportamiento actual. Esta entrega no
corrige los defectos DEF-01 a DEF-06 del documento. Una respuesta HTTP 200 o una
prueba aprobada no acredita por sí sola autorización por propietario, validación de
miembros registrados, restricciones de transición ni ausencia de otros defectos.
Las pruebas de API y de aceptación corresponden a otros apartados.

Para documentar E10, usar el commit de `develop`, el enlace de la ejecución de Actions,
el número de casos aprobados, la tabla de cobertura por módulo y los ejemplos de mocks.

