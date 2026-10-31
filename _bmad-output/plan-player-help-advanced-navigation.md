---
title: 'Ayuda del reproductor y navegación simplificada'
type: 'feature'
ticket: ''
created: '2026-10-31'
status: 'built'
baseline_revision: 'b1197be77da54e9930ff79a21ec4054728040ce0'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent">

## Intent

**Problem:** El usuario eligió los puntos 3 y 4 de las mejoras propuestas: ayuda cuando una señal no reproduce y navegación más simple.

**Approach:** Agregar una acción visible para probar otra señal y una explicación breve, conservando los controles existentes. Reunir Explorador JSON y Fuente en un menú Avanzado compartido por escritorio y móvil, dejando Eventos y Canales como navegación principal.

</frozen-after-approval>

## Implementation Notes

- Ruta oneshot: cambio localizado de aproximadamente 100 líneas en index.html y app.js; sin nuevas dependencias. El usuario seleccionó explícitamente ambas mejoras.
- Reutilizar switchModalChannel, switchModalStreamOption y switchTab. Recorrer opciones con URL, omitir duplicados y la URL actual; avisar si no hay alternativas. No inferir reproducción exitosa del evento load del iframe ni cambiar Anti-Ads automáticamente.
- El usuario indicó que pertenece a una iniciativa; nombre/referencia pendiente de respuesta. No se modificó el árbol de tickets.
- Implementado en index.html y app.js. Se incrementó la versión del script para invalidar caché.

## Plan Change Log

## Review Triage Log

- low / patch: la ayuda conservaba el nombre de una señal anterior tras selección manual. Corregido restableciendo el texto en loadCurrentStreamIntoPlayer, compartido por todos los controles.

## Verification

- node --check app.js; git diff --check.
- Verificar navegación principal y Avanzado en HTML y comportamiento del cambio de señal mediante Node VM con DOM simulado: siguiente opción, otro canal, URL duplicada, falta de alternativas y cierre de menú.
- Resultado: sintaxis y diff correctos; simulación aprobada para cambio entre opciones/canales, deduplicación, ciclo, cero/una alternativa y cierre del menú. No se verificó reproducción de proveedores externos ni diseño en navegador.
