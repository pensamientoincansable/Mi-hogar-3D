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

- 🧱 **Modo colocación estilo Heartopia**: al elegir cualquier material u objeto, la pieza queda «en la mano» y se sitúa con la **cuadrícula extendida por todo el territorio construible**; se suelta con un clic, arrastrando o con `Enter`, y `Esc` la devuelve. Con la **mano** 🖐️ puedes coger cualquier pieza ya colocada (suelos, muros, tejados o muebles), llevarla flotando por la parcela y soltarla en otro hueco válido.
- 🧰 **Catálogo ampliado**: 16 acabados de suelo (incluidos terrazas, adoquín, granito, microcemento, hidráulico, praderas y musgo), 11 muros, minimuros, vallas, 4 puertas, 4 ventanas y 5 techos, con escaleras y rampas rotables.
- 🎨 **Materiales PBR** con sombreado, bump y reflejos: las **80 texturas** de `media/image/` están incorporadas (Concreto, Elementos, Suelo, Follaje, Terreno, Metal, Patrón, Piedra y Baldosa). El nuevo **selector de texturas** —en el catálogo y en el panel de selección— permite cambiar la textura de cualquier material u objeto construible al colocarlo o al moverlo con la mano. Iluminación ACES, reflejos ambientales y cantos suavizados.
- 🌱 **Suelo construible con PTP-Foliage**: la parcela usa una composición coherente de `PTP-Foliage_01`, `_02`, `_04` y `_07`, y el botón 🌱 (o la tecla `G`) cambia a las demás Foliage (`_05`·`_06`·`_08`·`_09`) para todo el terreno.
- 🌌 **Cielo en ciclo continuo**: recorre los 50 panoramas/cubemaps de `media/image/Sky` con transiciones suaves y se integra con el modo día/noche.
- 🌳 **Vegetación 3D detallada**: cada especie usa una malla botánica propia (roble, pino, palmera, cerezo, arce, abedul, manzano, sauce…), con materiales ligeros, sombras suaves y movimiento con el viento.
- 🛋️ **Mobiliario pulido**: modelos 3D completos para dormitorio, salón, comedor, cocina, baño y jardín, combinados con elementos procedurales renovados.
- 📦 **Biblioteca CC0 local**: modelos de Kenney y Quaternius incluidos en el proyecto; sin descargas externas durante la partida y con fallback procedural.
- 🪴 **Catálogo de decoración** con plantas, cuadros, espejo, acuario, reloj, biombo, fuente y más.
- 🧰 **Inventario plegable**: se oculta al elegir una pieza para dejar libre toda la vista 3D.
- 🎨 **Paleta ampliada a 24 colores** y herramienta de pintura para personalizar todo.
- 💰 **Economía**: cada pieza cuesta dinero; vende con la herramienta 🧹 y recupera el 50 %.
- 🏆 **12 misiones** con recompensas para guiar la partida.
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
| Colocar la pieza que llevas | Clic izquierdo o `Enter` (también arrastrar y soltar) |
| Rotar mueble, escalera o rampa | `R` o botón `🔄` |
| Cancelar herramienta / devolver pieza llevada | `Esc` |
| Coger y mover piezas colocadas | Herramienta mano `🖐️` (clic para llevar, clic para soltar) |
| Cambiar textura de materiales y objetos | Selector 🖌️ bajo la paleta o fila «Textura» del panel de selección |
| Cambiar el suelo construible (Foliage) | Botón `🌱` o tecla `G` |
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
