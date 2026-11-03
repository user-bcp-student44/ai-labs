AMBITO
Workspace ai-labs abierto en su raíz. Lee código solo en api/.
Todas las rutas parten de la raíz. Lee README.md, RETO.md y
docs/ generales. Este pedido es de solo lectura; no escribas archivos.
Git se ejecuta desde la raíz; las pruebas propuestas usan cwd api/.
No leas ni modifiques código de auth/ ni web/. Usa IDs H-API-NN y componente api.

CONTEXTO
La API usa FastAPI y SQLite. Revisa api/app/main.py y las pruebas de
api/tests/. Lee README.md, RETO.md y docs/ENDPOINTS.md si existe.
Localiza el recorrido desde los parámetros o campos recibidos por HTTP
hasta las consultas SQL. No des por cierto que los casos de RETO.md
están confirmados.

La API expone, entre otras, estas operaciones:
- GET /api/tasks: lista tareas y acepta owner como filtro.
- POST /api/tasks: crea una tarea.
- GET /api/summary: resume las tareas de un owner.
- POST /api/requirements: recibe un archivo.
- GET /api/backend-health: consulta el servicio de autenticación.

OBJETIVO
Determinar si entradas de /api/tasks y /api/summary llegan concatenadas
a consultas SQL. Identificar qué consultas están parametrizadas y cuáles
no. No amplíes el análisis a otros componentes.

RESTRICCIONES
No edites código ni ejecutes ataques contra servicios remotos. Usa solo
código y datos ficticios locales. No ejecutes pruebas: propónlas y aclara
que no se ejecutaron. Si falta un archivo o no puedes comprobar algo,
dilo. Conserva los contratos existentes de la API. No leas auth/ ni web/.

CRITERIOS DE ACEPTACION
- Sigue el flujo desde cada entrada HTTP hasta la consulta SQL, citando
  archivo y línea.
- Distingue claramente entre concatenación, parametrización y casos no
  comprobados.
- Considera como entradas el parámetro owner de GET /api/tasks y
  GET /api/summary, y los campos recibidos por POST /api/tasks.
- Propón pruebas locales para comportamiento válido, entrada inválida y
  un valor de entrada que contenga una comilla simple. Indica el resultado
  esperado según el código y el contrato observado, sin afirmar que se probó.
- Anota las pruebas existentes relevantes y qué escenarios no cubren.

FORMATO DE RESPUESTA
Tabla: afirmación | evidencia archivo:línea | comprobado o hipótesis |
prueba propuesta.

Termina con preguntas abiertas y comandos no ejecutados.