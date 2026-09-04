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

- 🧱 **Construcción sobre cuadrícula** con 11 acabados de suelo más escaleras y rampas, muros de piedra, ladrillo, hormigón y madera, minimuros, vallas, 4 puertas, 4 ventanas y techos.
- 🎨 **Materiales PBR** con sombreado, bump y reflejos: madera, ladrillo, piedra, hormigón, tejado, baldosa, mármol, grava, hierba, corteza, metal y más. Iluminación ACES, reflejos ambientales y cantos suavizados. Las superficies nuevas usan los albedos incluidos en `media/image/`.
- 🌌 **Cielo en ciclo continuo**: recorre los 50 panoramas/cubemaps de `media/image/Sky` con transiciones suaves y se integra con el modo día/noche.
- 🌳 **Vegetación 3D detallada**: cada especie usa una malla botánica propia (roble, pino, palmera, cerezo, arce, abedul, manzano, sauce…), con materiales ligeros, sombras suaves y movimiento con el viento.
- 🛋️ **Mobiliario pulido**: modelos 3D completos para dormitorio, salón, comedor, cocina, baño y jardín, combinados con elementos procedurales renovados.
- 📦 **Biblioteca CC0 local**: modelos de Kenney y Quaternius incluidos en el proyecto; sin descargas externas durante la partida y con fallback procedural.
- 🪴 **Catálogo de decoración** con plantas, cuadros, espejo, acuario, reloj, biombo, fuente y más.
- 🧰 **Inventario plegable**: se oculta al elegir una pieza para dejar libre toda la vista 3D.
- 🎨 **Paleta de colores** y herramienta de pintura para personalizar todo.
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
| Entrar en modo de colocación | Elegir pieza (o `🖐️` sobre un objeto para moverlo) |
| Confirmar colocación / soltar objeto | Clic izquierdo sobre la cuadrícula |
| Rotar mueble, escalera o rampa | `R` o botón `🔄` |
| Mover objeto seleccionado | Botón `🖐️ Mover` o tecla `M` |
| Cancelar herramienta / colocación | `Esc` |
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
