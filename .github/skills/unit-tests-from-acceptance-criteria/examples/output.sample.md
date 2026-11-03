# Acceptance Criteria -> Unit Tests

## 1. Summary
HU-12, funcionalidad a crear (TDD). Python / pytest.
Las pruebas fallan hasta implementar `calculate_line_total` en `cart/pricing.py`.

## 2. Matriz de trazabilidad
| CA | Escenario | Prueba | Tipo |
|----|-----------|--------|------|
| CA-1 | 1 unidad | `test_ca1_no_discount_for_single_unit` | happy |
| CA-1 | 9 unidades (límite superior) | `test_ca1_no_discount_at_nine_units` | borde |
| CA-2 | 10 y 49 unidades (límites) | `test_ca2_five_percent_discount` | borde |
| CA-3 | 50 y 500 unidades | `test_ca3_ten_percent_discount` | borde/happy |
| CA-4 | cantidad 0 y negativa | `test_ca4_rejects_invalid_quantity` | negativo |

## 3. Pruebas unitarias
`tests/test_pricing.py`
```python
import pytest

from cart.pricing import calculate_line_total

UNIT_PRICE = 100.0


def test_ca1_no_discount_for_single_unit():
    assert calculate_line_total(UNIT_PRICE, 1) == 100.0


def test_ca1_no_discount_at_nine_units():
    assert calculate_line_total(UNIT_PRICE, 9) == 900.0


@pytest.mark.parametrize("quantity, expected", [(10, 950.0), (49, 4655.0)])
def test_ca2_five_percent_discount(quantity, expected):
    assert calculate_line_total(UNIT_PRICE, quantity) == pytest.approx(expected)


@pytest.mark.parametrize("quantity, expected", [(50, 4500.0), (500, 45000.0)])
def test_ca3_ten_percent_discount(quantity, expected):
    assert calculate_line_total(UNIT_PRICE, quantity) == pytest.approx(expected)


@pytest.mark.parametrize("invalid_quantity", [0, -1])
def test_ca4_rejects_invalid_quantity(invalid_quantity):
    with pytest.raises(ValueError):
        calculate_line_total(UNIT_PRICE, invalid_quantity)
```

## 4. Datos de prueba y mocks
- Precio unitario fijo (`UNIT_PRICE`); sin mocks porque la función es pura.
- `pytest.approx` evita errores de punto flotante.

## 5. Cobertura esperada
CA-1 a CA-4 cubiertos, con límites 9/10 y 49/50. Meta indicada: 85% del código modificado.

## 6. Comando de ejecución
`pytest tests/test_pricing.py --cov=cart.pricing`

## 7. Preguntas abiertas
- CA-4: ¿el error es `ValueError` u otra excepción del dominio? Se asumió `ValueError`.
- ¿El resultado se redondea a 2 decimales? Los CA no lo indican.
