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

- 🧱 **Construcción sobre cuadrícula**: suelos, paredes, puertas, ventanas y techos.
- 🛋️ **16 muebles y elementos** procedurales: cama, sofá, mesa, TV, cocina, baño, jardín…
- 🎨 **Paleta de colores** y herramienta de pintura para personalizar todo.
- 💰 **Economía**: cada pieza cuesta dinero; vende con la herramienta 🧹 y recupera el 50 %.
- 🏆 **11 misiones** con recompensas para guiar la partida.
- 🌙 **Ciclo día / noche** con estrellas y lámparas que se encienden de noche.
- 🚶 **Modo paseo** en primera persona (WASD + ratón) para visitar tu casa.
- 💾 **Autoguardado** en el navegador + **exportar / importar** la casa en JSON.
- 📷 Captura de pantalla con un clic.
- 🔊 Efectos de sonido generados con WebAudio (sin archivos externos).

## ⌨️ Controles

| Acción | Control |
|---|---|
| Orbitar cámara | Arrastrar con el ratón |
| Zoom | Rueda del ratón |
| Desplazar cámara | Botón derecho + arrastrar |
| Colocar pieza | Clic izquierdo |
| Rotar mueble | `R` |
| Cancelar herramienta | `Esc` |
| Modo paseo | Botón 🚶 · `WASD` + ratón · `Esc` para salir |

## 🛠️ Tecnología

- [Three.js](https://threejs.org/) r160 (incluido en `vendor/`, sin dependencias de CDN).
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
