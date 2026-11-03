## Story ID and title
HU-12 - Calcular descuento por cantidad en el carrito

## User story
Como cliente, quiero que el carrito aplique un descuento según la cantidad
de unidades para pagar menos en compras grandes.

## Acceptance criteria
1. Dado un ítem con 1 a 9 unidades, cuando se calcula el total, entonces no se aplica descuento.
2. Dado un ítem con 10 a 49 unidades, cuando se calcula el total, entonces se aplica 5% de descuento.
3. Dado un ítem con 50 o más unidades, cuando se calcula el total, entonces se aplica 10% de descuento.
4. Dada una cantidad menor o igual a 0, cuando se calcula el total, entonces se rechaza con error de cantidad inválida.

## Feature state
to-create

## Language and test framework
Python / pytest

## Target code
`cart/pricing.py` -> `calculate_line_total(unit_price, quantity)`

## Test conventions (optional)
Pruebas en `tests/`, ejecutar con `pytest`.

## Dependencies to mock
Ninguna (función pura).

## Coverage target (optional)
85% del código modificado.
