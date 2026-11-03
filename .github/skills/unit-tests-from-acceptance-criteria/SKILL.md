---
name: unit-tests-from-acceptance-criteria
description: Genera pruebas unitarias trazables a partir de los criterios de aceptación de una historia de usuario, para validar una funcionalidad a crear o ya creada, en cualquier proyecto, lenguaje o framework de pruebas.
---

# Skill: Acceptance Criteria -> Unit Tests

## 1) Metadata
- **Skill ID:** unit-tests-from-acceptance-criteria
- **Version:** 0.2.0
- **Purpose:** Convertir los criterios de aceptación (CA) de una historia de usuario en pruebas unitarias ejecutables y trazables, que validen la funcionalidad a crear (TDD) o ya creada.
- **Audience (roles):** Desarrollo, QA, Tech Lead
- **When to use:** Antes de implementar una HU (TDD) o para verificar una funcionalidad existente contra sus CA.
- **When NOT to use:** Pruebas de integración/E2E o de rendimiento, o HU sin criterios de aceptación.
- **Sensitive inputs:** No incluyas datos reales de clientes, credenciales, secretos, tokens ni URLs internas no autorizadas; usa datos de prueba ficticios.
- **Expected output:** Markdown con la matriz de trazabilidad CA -> prueba y el código de las pruebas, según la sección Output.

## 2) Inputs
Proporciona la información en este formato:

- **Story ID and title:**
- **User story:** (Como... quiero... para...)
- **Acceptance criteria:** (lista numerada; idealmente Given/When/Then)
- **Feature state:** to-create | already-created
- **Language and test framework:** (ej. Python/pytest, Java/JUnit 5, TypeScript/Jest, C#/xUnit)
- **Target code:** (archivo/clase/función a probar; obligatorio si ya está creada, opcional si es nueva)
- **Test conventions (optional):** (ubicación de pruebas, nombres, estilo de mocks, comando de ejecución)
- **Dependencies to mock:** (repositorios, servicios externos, reloj, base de datos, filesystem)
- **Coverage target (optional):** (si no se indica, no se asume una meta)

## 3) Output
Devuelve **solo** un documento Markdown con estas secciones:

1. **Summary** (HU, estado, lenguaje y framework de pruebas)
2. **Matriz de trazabilidad** (tabla: CA | Escenario | Nombre de prueba | Tipo: happy/negativo/borde)
3. **Pruebas unitarias** (un bloque de código por archivo, con la ruta sugerida)
4. **Datos de prueba y mocks** (qué se simula y por qué)
5. **Cobertura esperada** (CA cubiertos y meta, si se indicó)
6. **Comando de ejecución** (el indicado por el usuario o el estándar del framework)
7. **Preguntas abiertas** (CA ambiguos, no verificables o supuestos pendientes)

## 4) Constraints
- No inventes requisitos: un CA ambiguo o no verificable va a **Preguntas abiertas** y no genera prueba.
- Cada CA tiene al menos una prueba; cada prueba referencia su CA (ej. `CA-2`) en el nombre o comentario.
- Incluye por CA: caso feliz, al menos un caso negativo y casos borde cuando aplique.
- Usa el framework y las convenciones indicadas; si no se indican, sigue las del proyecto o las estándar del lenguaje. No agregues dependencias nuevas sin justificarlas.
- Pruebas unitarias aisladas: sin red, base de datos ni archivos reales; mockea o sustituye dependencias externas.
- Si la funcionalidad ya existe, las pruebas verifican el comportamiento descrito por los CA sin modificar el código de producción.
- Si la funcionalidad es nueva, las pruebas deben fallar hasta implementarla; indícalo.
- Si el código objetivo no permite probar un CA de forma unitaria (acoplamiento, estado global), repórtalo en **Preguntas abiertas** en lugar de forzar la prueba.
- No deshabilites ni omitas pruebas (`skip`, `@Disabled`, `xit`) para que pasen.
- Nombres que expliquen el comportamiento; sin valores mágicos sin nombre; sin duplicación (usa fixtures/helpers).
- No incluyas datos sensibles ni secretos.
- Mantén la salida concisa y limitada a las pruebas de la HU.

## 5) Validation Rules
La salida es válida si:
- Incluye todas las secciones definidas en Output.
- Todo CA verificable aparece en la matriz con al menos una prueba.
- Cada CA tiene al menos un caso feliz y uno negativo, o se justifica por qué no aplica.
- Las pruebas usan el lenguaje y framework indicados.
- No hay dependencias reales (red, BD, filesystem) ni secretos.
- Los CA no cubiertos figuran en Preguntas abiertas.

## 6) Evidence
Adjunta o referencia estos elementos en el PR o entrega:
- `SKILL.md` versionado.
- `examples/input.sample.md`.
- `examples/output.sample.md`.
- Salida de la ejecución de las pruebas generadas.
- Reporte de cobertura, si se definió una meta.
- Tag de versión del Skill, como `skill-unit-tests-v0.2.0`.
