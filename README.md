# ⚽ SportsHub Live - Frontend para datos.json

Frontend web moderno, interactivo y responsivo para explorar, filtrar y reproducir las transmisiones de eventos deportivos y canales en vivo provistos en el JSON público de:
`https://raw.githubusercontent.com/tadeoallende/repos-web/refs/heads/main/datos.json`

---

## 🚀 Cómo Iniciar

Tienes dos formas sencillas de usar el frontend:

### Opción 1: Con Servidor Local (Recomendado)
Abre una terminal en esta carpeta y ejecuta:
```bash
node server.js
```
o con npm:
```bash
npm start
```
Luego abre tu navegador en **`http://localhost:3000`**.

### Opción 2: Abrir Directamente en el Navegador
Simplemente haz doble clic sobre el archivo [index.html](file:///c:/Users/Pichu/Documents/antigravity/valiant-curie/index.html) para abrirlo en tu navegador favorito (Chrome, Edge, Firefox, Brave, etc.). Como el endpoint de GitHub Raw tiene cabeceras `Access-Control-Allow-Origin: *`, funciona directamente sin necesidad de backend.

---

## ✨ Características Principales

1. **⚽ Agenda de Eventos Deportivos en Vivo**:
   - Detección automática del estado del evento (**🔴 En Vivo**, **⏳ Próximo** o **🏁 Finalizado**) según la hora actual y la zona horaria del usuario.
   - Escudos y logos oficiales de los equipos (con soporte de iniciales en caso de fallo de carga de imagen).
   - Filtros rápidos por competencia (**Premier League, LaLiga, Serie A, Fórmula 1, UFC / Boxeo, Tenis ATP/WTA, Liga Argentina, etc.**).
   - Búsqueda en tiempo real por nombre de equipo, evento, liga o canal.
   - Alternancia entre vista en tarjetas (grid) y vista compacta (lista).

2. **📺 Canales 24/7**:
   - Catálogo de canales de TV continuos (**ESPN, ESPN Premium, FOX Sports, DSports, TNT Sports, TyC Sports, Win Sports, DAZN, NBA TV, etc.**).
   - Filtro por canales destacados.
   - Enlace directo al canal oficial de Discord.

3. **🎬 Reproductor Integrado**:
   - Modal con reproductor `iframe` de pantalla completa.
   - Selector entre múltiples canales cuando el partido se transmite por varias señales (ej. ESPN y Disney+).
   - Selector de opciones de streaming (**Opción 1, Opción 2 HD, Opción 3, etc.**).
   - Botón **"Pestaña Nueva"** para abrir el enlace directo del stream en caso de bloqueadores o restricciones de inserción del proveedor.
   - Botón de recarga de señal y atajo `Esc` para cerrar.

4. **🔍 Explorador JSON & API Raw**:
   - Visualizador formateado del JSON con métricas (total de eventos, canales y opciones).
   - Botón de **Copiar JSON completo** al portapapeles.
   - Botón de **Descargar archivo .json**.
   - Posibilidad de probar y cargar cualquier otra URL JSON pública personalizada.
   - Botón de recarga en tiempo real para traer las últimas actualizaciones del repositorio.

---

## 🛠️ Tecnologías Utilizadas
- **Tailwind CSS v3 (CDN)** para una interfaz moderna, limpia y modo oscuro ("dark mode").
- **Lucide Icons** para iconografía vectorial nítida.
- **JavaScript Vanilla (ES6+)** sin herramientas de empaquetado pesadas, ágil y ligero.
- **Node.js (nativo)** para el servidor estático local y proxy opcional de contingencia.
