# 🏠 Mi Hogar 3D

**Construye tu hogar de ensueño** — un juego de construcción de casas en 3D que funciona directamente en el navegador, sin instalaciones ni servidor. 100 % estático y compatible con **GitHub Pages**.

## 🎮 Jugar

Abre la web del proyecto (GitHub Pages) o clona el repositorio y sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

> Nota: al usar módulos ES, el juego debe servirse por HTTP (no funciona abriendo `index.html` con doble clic).

## ✨ Características

- 🏗️ **Modo colocación**: al elegir cualquier material u objeto entra en modo colocación con una **cuadrícula dorada extendida por todo el terreno construible**; sitúa la pieza, rótala con `R` y fíjala con un clic (`Esc` cancela).
- 🖐️ **Coger y mover con la mano** (estilo Heartopia): arrastra cualquier pieza ya colocada —suelos, muros, techos o muebles— para levantarla y soltarla en otra celda libre; el botón derecho o `Esc` la devuelve a su sitio.
- 🌱 **Suelos verde jardín**: todo el suelo construible (11 acabados + escaleras y rampas) usa los cinco albedos `PTP-Foliage` de `media/image/` —césped, hierba fina, pradera floral, floración rosa y adoquines ajardinados— con tintes coherentes.
- 🖼️ **Función de cambio de textura**: 44 esquemas hechos con el resto de albedos de la carpeta (ladrillos, piedras, hormigones, maderas, metales, aguas, azulejos, patrones…). Cada pieza colocada o movida estrena el esquema activo; el modo **Auto** avanza el ciclo en cada acción y **🪄 Aplicar a todo** re-vesta la casa entera.
- 🧱 **Construcción sobre cuadrícula** con muros de piedra, ladrillo, hormigón y madera, minimuros, vallas, 4 puertas, 4 ventanas y techos.
- 🎨 **Materiales PBR** con sombreado, bump y reflejos. Iluminación ACES, reflejos ambientales y cantos suavizados. Todas las superficies usan los albedos incluidos en `media/image/`.
- 🎨 **Paleta de 24 colores** coordinada con las texturas, más herramienta de pintura para personalizar todo.
- 🌌 **Cielo en ciclo continuo**: recorre los 50 panoramas/cubemaps de `media/image/Sky` con transiciones suaves y se integra con el modo día/noche.
- 🌳 **Vegetación 3D detallada**: cada especie usa una malla botánica propia (roble, pino, palmera, cerezo, arce, abedul, manzano, sauce…), con materiales ligeros, sombras suaves y movimiento con el viento.
- 🛋️ **Mobiliario pulido**: modelos 3D completos para dormitorio, salón, comedor, cocina, baño y jardín, combinados con elementos procedurales renovados.
- 📦 **Biblioteca CC0 local**: modelos de Kenney y Quaternius incluidos en el proyecto; sin descargas externas durante la partida y con fallback procedural.
- 🪴 **Catálogo de decoración** con plantas, cuadros, espejo, acuario, reloj, biombo, fuente y más.
- 🧰 **Inventario plegable**: se oculta al elegir una pieza para dejar libre toda la vista 3D.
- 💰 **Economía**: cada pieza cuesta dinero; vende con la herramienta 🧹 y recupera el 50 %.
- 🏆 **16 misiones** con recompensas para guiar la partida.
- 🌙 **Ciclo día / noche** con estrellas y lámparas que se encienden de noche.
- 🚶 **Modo paseo** en primera persona (WASD + ratón) para visitar tu casa.
- 💾 **Autoguardado** en el navegador + **exportar / importar** la casa en JSON.
- 📷 Captura de pantalla con un clic.
- 🔊 Efectos de sonido generados con WebAudio (sin archivos externos).

## ⌨️ Controles

| Acción | Control |
|---|---|
| Orbitar cámara | Arrastrar con el ratón (sin herramienta activa) |
| Zoom | Rueda del ratón |
| Desplazar cámara | Botón derecho + arrastrar |
| Abrir/cerrar catálogo | Botón `🧰` |
| Entrar en modo colocación | Elige una pieza del catálogo (cuadrícula dorada) |
| Fijar la pieza en el modo colocación | Clic izquierdo · `R` rota · `Esc` cancela |
| Coger y mover una pieza con la mano | 🖐️ + arrastrar · suéltala con un clic · `Esc`/clic derecho la devuelve |
| Rotar mueble, escalera o rampa | `R` o botón `🔄` |
| Cancelar herramienta | `Esc` |
| Cambiar textura de las piezas | Panel Herramientas 🖼️ (auto o 🪄 aplicar a todo) |
| Modo paseo | Botón 🚶 · `WASD` + ratón · `Esc` para salir |

## 🛠️ Tecnología

- [Three.js](https://threejs.org/) r160 (incluido en `vendor/`, sin dependencias de CDN).
- Modelos CC0 de [Kenney](https://kenney.nl/assets/furniture-kit) y [Quaternius](https://quaternius.com/packs/ultimatestylizednature.html). Consulta [`assets/models/ATTRIBUTION.md`](assets/models/ATTRIBUTION.md).
- JavaScript vanilla con módulos ES + import maps.
- Sin build, sin bundler, sin backend: ideal para GitHub Pages.

## 🚀 Despliegue en GitHub Pages

El juego es 100 % estático, así que basta con el modo clásico de Pages:

1. Ve a **Settings → Pages**.
2. En *Build and deployment*, selecciona **Deploy from a branch**.
3. Elige la rama `main` y la carpeta `/ (root)` y guarda.

En un par de minutos el juego estará disponible en `https://<usuario>.github.io/Mi-hogar-3D/`.

## 📄 Licencia

[Apache 2.0](LICENSE)
