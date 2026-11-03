# Prompt de evaluación del skill

Copia el bloque siguiente en el chat del agente. Usa el skill `unit-tests-from-acceptance-criteria` sobre código ya creado (`auth/`, `AuthResource.login`).

````text
Usa el skill unit-tests-from-acceptance-criteria con estos datos:

## Story ID and title
H-AUTH-01 - Iniciar sesión con usuario y contraseña

## User story
Como usuario, quiero iniciar sesión con mi usuario y contraseña
para obtener un token y acceder a la aplicación.

## Acceptance criteria
1. Dado un request nulo, cuando se llama a login, entonces responde 400 con mensaje "Request is null".
2. Dado un username nulo o en blanco, cuando se llama a login, entonces responde 400 con mensaje "Username is required".
3. Dado un password nulo o en blanco, cuando se llama a login, entonces responde 400 con mensaje "Password is required".
4. Dadas credenciales que no existen en la base de datos, cuando se llama a login, entonces responde 401.
5. Dadas credenciales válidas, cuando se llama a login, entonces responde 200 con "token", "expiresIn" igual a 3600 y "user" con username, displayName y role.
6. Dado un displayName con HTML (ej. "<b>Ana</b>"), cuando el login es exitoso, entonces el displayName se devuelve escapado.
7. Dado un error inesperado en la base de datos, cuando se llama a login, entonces responde 500 con "message" y "exception".

## Feature state
already-created

## Language and test framework
Java 17 / JUnit 5 con Mockito

## Target code
auth/src/main/java/com/bcp/workshop/auth/AuthResource.java -> método login(LoginRequest)

## Test conventions (optional)
Pruebas en auth/src/test/java/com/bcp/workshop/auth/. No modificar código de producción.

## Dependencies to mock
LegacyDatabase (findByCredentials). No usar base de datos real.

## Coverage target (optional)
85% del código modificado.
````

## Qué revisar en la respuesta

- [ ] Incluye las 7 secciones de Output (Summary, Matriz, Pruebas, Mocks, Cobertura, Comando, Preguntas abiertas).
- [ ] Los 7 CA aparecen en la matriz, cada uno con al menos una prueba que referencia `CA-N`.
- [ ] Hay caso feliz, negativo y borde (CA-2 y CA-3: `null`, `""` y `"   "`).
- [ ] `LegacyDatabase` está mockeada; no hay BD, red ni archivos reales.
- [ ] No modifica código de producción ni usa `@Disabled`.
- [ ] No inventa requisitos. Debería señalar en Preguntas abiertas, por ejemplo: el campo `"debug"` de la respuesta no tiene CA, `LegacyTokenUtil.create` es estático y difícil de aislar, y el mensaje 401 incluye el username (posible fuga de información).
- [ ] No incluye secretos ni credenciales reales (solo datos ficticios).
