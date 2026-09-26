// Lighting.js - Atmospheric lighting engine with warm radial light halos, flickering torches, and destination-out cutout blending

export class Lighting {
  constructor(viewportWidth = 800, viewportHeight = 600) {
    this.width = viewportWidth;
    this.height = viewportHeight;

    // Offscreen lighting buffer canvas
    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = this.width;
    this.lightCanvas.height = this.height;
    this.lightCtx = this.lightCanvas.getContext('2d');

    this.animTime = 0;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.lightCanvas.width = width;
    this.lightCanvas.height = height;
  }

  update(dt) {
    this.animTime += dt;
  }

  /**
   * Renders the ambient darkness and punches light halos out using destination-out blending.
   *
   * @param {CanvasRenderingContext2D} mainCtx - Main render context
   * @param {Camera} camera - World camera
   * @param {DayNightCycle} dayNight - Day/night manager
   * @param {Array} lightSources - Array of { x, y, radius, color, flicker }
   */
  render(mainCtx, camera, dayNight, lightSources = []) {
    const ambient = dayNight.getAmbientColor();

    // If completely clear daylight, skip lighting pass for maximum performance
    if (ambient.a <= 0.02) return;

    const ctx = this.lightCtx;

    // 1. Fill light buffer with ambient darkness overlay
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = `rgba(${ambient.r}, ${ambient.g}, ${ambient.b}, ${ambient.a})`;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Switch to destination-out to carve out light holes in the darkness
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    const bounds = camera.getVisibleBounds(120);

    lightSources.forEach(source => {
      // Frustum culling
      if (
        source.x + source.radius < bounds.left ||
        source.x - source.radius > bounds.right ||
        source.y + source.radius < bounds.top ||
        source.y - source.radius > bounds.bottom
      ) {
        return;
      }

      // Convert world coords to screen coords
      const screenPos = camera.worldToScreen(source.x, source.y);
      const scaledRadius = source.radius * camera.zoom;

      // Subtle flame flicker
      let rad = scaledRadius;
      if (source.flicker) {
        const flicker = Math.sin(this.animTime * 14 + source.x) * 0.08 + 1.0;
        rad *= flicker;
      }

      // Radial light cutout gradient
      const grad = ctx.createRadialGradient(
        screenPos.x,
        screenPos.y,
        0,
        screenPos.x,
        screenPos.y,
        rad
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');     // Completely clear core
      grad.addColorStop(0.4, 'rgba(0, 0, 0, 0.85)');
      grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.45)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');     // Fades into darkness

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, rad, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();

    // 3. Add warm colored tints / glow onto the cleared holes
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    lightSources.forEach(source => {
      if (
        source.x + source.radius < bounds.left ||
        source.x - source.radius > bounds.right ||
        source.y + source.radius < bounds.top ||
        source.y - source.radius > bounds.bottom
      ) {
        return;
      }

      const screenPos = camera.worldToScreen(source.x, source.y);
      const rad = source.radius * camera.zoom * 0.85;

      const warmGrad = ctx.createRadialGradient(
        screenPos.x,
        screenPos.y,
        0,
        screenPos.x,
        screenPos.y,
        rad
      );

      const tint = source.color || '#f59e0b';
      warmGrad.addColorStop(0, `${tint}55`); // Soft colored center
      warmGrad.addColorStop(0.5, `${tint}22`);
      warmGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = warmGrad;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, rad, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();

    // 4. Draw lighting buffer over main canvas
    mainCtx.save();
    mainCtx.drawImage(this.lightCanvas, 0, 0);
    mainCtx.restore();
  }
}

export default Lighting;
