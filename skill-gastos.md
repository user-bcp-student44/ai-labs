---
name: personal-expense-capture
description: >
  Registra gastos personales y familiares a partir de fotos de boletas y recibos,
  capturas de pantalla (Yape, Plin, apps bancarias, delivery, compras online) y
  PDFs (recibos de servicios, estados de cuenta de tarjeta).
  Extrae fecha, comercio, monto, moneda, método de pago, categoría y quién del
  hogar hizo el gasto, valida los datos y devuelve un registro estructurado listo
  para guardar.
  Triggers: "registrar gasto", "anotar gasto", "subir boleta", "procesar recibo",
  "captura de Yape", "gastos del hogar", "gastos familiares", "extraer gastos del
  PDF", "log expense", "scan receipt".
  NOT for: contabilidad de empresas o negocios, facturación electrónica, crédito
  fiscal, declaración de impuestos, presupuestos o análisis agregado, ni
  documentos que no sean comprobantes de pago.
---

# Registro de gastos personales y familiares

Pensado para el uso doméstico: un individuo o un hogar que registra sus gastos
diarios (supermercado, servicios, colegio, salud, transporte, ocio). No maneja
RUC, crédito fiscal ni centros de costo.


## Inputs

| Input | Tipo | Obligatorio | Detalle |
|---|---|---|---|
| `files` | Lista de rutas o adjuntos | Sí | JPG, PNG, HEIC, WEBP o PDF (una o varias páginas). Un archivo puede contener varios gastos, como un estado de cuenta. |
| `default_currency` | String (ISO 4217) | No | Moneda por defecto si el comprobante no la indica. Ejemplo: `PEN`. |
| `categories` | Lista | No | Catálogo permitido. Por defecto: alimentación, supermercado, vivienda, servicios, transporte, salud, educación, hijos, ropa, ocio, mascotas, regalos, otros. |
| `payment_method_hint` | String | No | Ejemplo: "tarjeta BCP terminada en 1234". |
| `member` | String | No | Miembro del hogar que hizo el gasto. Ejemplo: "Hider", "Mamá". |
| `household_members` | Lista | No | Miembros válidos del hogar, para validar `member` y repartir gastos compartidos. |
| `shared` | Boolean | No | `true` si el gasto es del hogar y no de una sola persona. Por defecto `false`. |
| `locale` | String | No | Formato de fecha y decimales. Ejemplo: `es-PE`, donde 03/11/2026 es día/mes. |
| `notes` | String | No | Contexto del usuario, como "cumpleaños de Ana" o "vacaciones". |
| `dedupe_against` | Ruta o fuente | No | Registros previos para detectar duplicados. |

### Ejemplo de invocación

> Registra estos gastos: `boleta_tottus.jpg`, `yape_captura.png` y `recibo_luz.pdf`.
> Moneda `PEN`, locale `es-PE`, gasto compartido del hogar, pagó "Hider".


## Outputs

El skill devuelve un objeto con tres partes: `expenses`, `summary` y `failed_files`.

### Estructura general

```json
{
  "expenses": [ /* un objeto por gasto detectado */ ],
  "summary": { /* resumen del lote */ },
  "failed_files": [ /* archivos que no se pudieron procesar */ ]
}
```

### `expenses[]` (un objeto por gasto)

| Campo | Tipo | Nulo | Descripción |
|---|---|---|---|
| `expense_id` | string | No | Hash de fecha + monto + comercio + número de documento (si existe). |
| `date` | string (YYYY-MM-DD) | Sí | Fecha del gasto, normalizada según `locale`. |
| `merchant` | string | Sí | Nombre del comercio o del beneficiario (en Yape/Plin, la persona o negocio que recibió). |
| `document_type` | enum | No | `boleta`, `recibo_servicio`, `captura_pago`, `estado_cuenta` u `otro`. |
| `document_number` | string | Sí | Número del comprobante, si es visible. Ejemplo: `B001-004512`. |
| `currency` | string (ISO 4217) | No | Ejemplo: `PEN`. |
| `total` | number | No | Monto total pagado. |
| `tip` | number | Sí | Propina, si aparece separada. |
| `payment_method` | enum | Sí | `tarjeta`, `efectivo`, `yape`, `plin` o `transferencia`. |
| `card_last4` | string | Sí | Solo los últimos 4 dígitos, nunca el número completo. |
| `category` | string | No | Una de las categorías permitidas. |
| `line_items[]` | array | Sí | Opcional. Cada ítem tiene `description`, `qty`, `unit_price` y `amount`. |
| `member` | string | Sí | Miembro del hogar que hizo el gasto. Se copia del input. |
| `shared` | boolean | No | `true` si es un gasto compartido del hogar. |
| `notes` | string | Sí | Nota del usuario sobre el gasto. |
| `source_file` | string | No | Archivo de origen. |
| `source_page` | integer | Sí | Página del PDF. |
| `confidence` | number (0–1) | No | Confianza global de la extracción. |
| `flags[]` | array de enum | No | Lista vacía si no hay alertas (ver abajo). |
| `needs_review` | boolean | No | `true` si `confidence < 0.8` o hay flags críticos. |

### Valores de `flags`

| Flag | Significado |
|---|---|
| `fecha_ambigua` | La fecha puede leerse como día/mes o mes/día. |
| `total_no_cuadra` | La suma de `line_items` (más `tip`) no coincide con `total`. |
| `miembro_desconocido` | `member` no está en `household_members`. |
| `posible_duplicado` | Coincide con un gasto existente. |
| `baja_legibilidad` | Imagen borrosa, cortada o con poco contraste. |
| `moneda_asumida` | Se usó `default_currency` porque el documento no la indica. |
| `categoria_sugerida` | La categoría se infirió y no estaba explícita. |

### `summary`

```json
{
  "files_processed": 3,
  "expenses_extracted": 5,
  "expenses_needing_review": 1,
  "totals_by_currency": { "PEN": 412.50, "USD": 30.00 },
  "totals_by_category": { "supermercado": 180.00, "servicios": 232.50 },
  "totals_by_member": { "Hider": 300.00, "Mamá": 112.50 },
  "shared_total": 232.50
}
```

### `failed_files[]`

```json
[
  { "file": "foto_borrosa.jpg", "reason": "ilegible" },
  { "file": "documento.pdf", "reason": "no es un comprobante de pago" }
]
```

### Ejemplo completo de un gasto

```json
{
  "expense_id": "a3f9c1...",
  "date": "2026-11-02",
  "merchant": "Tottus S.A.",
  "document_type": "boleta",
  "document_number": "B001-004512",
  "currency": "PEN",
  "total": 100.00,
  "tip": null,
  "payment_method": "tarjeta",
  "card_last4": "1234",
  "category": "supermercado",
  "line_items": [
    { "description": "Leche 1L", "qty": 2, "unit_price": 4.50, "amount": 9.00 }
  ],
  "member": "Hider",
  "shared": true,
  "notes": null,
  "source_file": "boleta1.jpg",
  "source_page": 1,
  "confidence": 0.92,
  "flags": [],
  "needs_review": false
}
```

### Formatos de salida

- **JSON:** formato principal, validado contra `references/schema.json`.
- **CSV (opcional):** una fila por gasto, con `line_items` serializado como JSON o en una hoja aparte.
- El skill confirma con el usuario antes de escribir en cualquier destino.
