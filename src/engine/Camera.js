// Camera.js - Smooth 2D Camera with lerp, mouse-wheel zoom, drag-to-pan, and screen shake

import { WORLD_WIDTH, WORLD_HEIGHT } from './Constants.js';

export class Camera {
  constructor(viewportWidth = 800, viewportHeight = 600) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    // Center in the world initially
    this.x = WORLD_WIDTH / 2;
    this.y = WORLD_HEIGHT / 2;
    this.targetX = this.x;
    this.targetY = this.y;

    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.minZoom = 0.5;
    this.maxZoom = 2.5;

    // Follow target (e.g. PlayerAvatar)
    this.target = null;
    this.followSpeed = 0.08;

    // Drag-to-pan
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // Screen shake
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTimer = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  resize(width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  follow(target) {
    this.target = target;
  }

  unfollow() {
    this.target = null;
  }

  centerOn(x, y, immediate = false) {
    this.targetX = x;
    this.targetY = y;
    if (immediate) {
      this.x = x;
      this.y = y;
    }
  }

  pan(deltaX, deltaY) {
    // Screen delta to world delta based on current zoom
    const worldDx = deltaX / this.zoom;
    const worldDy = deltaY / this.zoom;
    this.x -= worldDx;
    this.y -= worldDy;
    this.targetX = this.x;
    this.targetY = this.y;
    this.target = null; // Dragging breaks target lock
  }

  zoomAt(delta, screenX, screenY) {
    const prevZoom = this.targetZoom;
    const zoomFactor = delta < 0 ? 1.15 : 0.87;
    let nextZoom = Math.min(Math.max(this.targetZoom * zoomFactor, this.minZoom), this.maxZoom);

    // Zoom centered towards mouse cursor
    const mouseWorld = this.screenToWorld(screenX, screenY);
    this.targetZoom = nextZoom;

    // Shift camera slightly toward the mouse point
    const shiftRatio = 1 - prevZoom / nextZoom;
    this.targetX += (mouseWorld.x - this.targetX) * shiftRatio * 0.3;
    this.targetY += (mouseWorld.y - this.targetY) * shiftRatio * 0.3;
  }

  setZoom(value, immediate = false) {
    this.targetZoom = Math.min(Math.max(value, this.minZoom), this.maxZoom);
    if (immediate) {
      this.zoom = this.targetZoom;
    }
  }

  shake(intensity = 6, duration = 0.25) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  update(dt = 0.016) {
    // If following an entity, update target position
    if (this.target && !this.isDragging) {
      this.targetX = this.target.x;
      this.targetY = this.target.y;
    }

    // Smooth position lerp
    const lerpRate = 1 - Math.pow(1 - this.followSpeed, dt * 60);
    this.x += (this.targetX - this.x) * lerpRate;
    this.y += (this.targetY - this.y) * lerpRate;

    // Smooth zoom lerp
    this.zoom += (this.targetZoom - this.zoom) * 0.12;

    // Screen shake countdown
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const progress = this.shakeTimer / this.shakeDuration;
      const currentPower = this.shakeIntensity * progress;
      this.shakeOffsetX = (Math.random() * 2 - 1) * currentPower;
      this.shakeOffsetY = (Math.random() * 2 - 1) * currentPower;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    // Soft clamp inside world bounds
    const halfW = (this.viewportWidth / 2) / this.zoom;
    const halfH = (this.viewportHeight / 2) / this.zoom;
    const padding = 64;

    this.x = Math.max(halfW - padding, Math.min(WORLD_WIDTH - halfW + padding, this.x));
    this.y = Math.max(halfH - padding, Math.min(WORLD_HEIGHT - halfH + padding, this.y));
  }

  apply(ctx) {
    ctx.save();
    // Center viewport, apply zoom, then translate to camera world position
    const cx = Math.floor(this.viewportWidth / 2);
    const cy = Math.floor(this.viewportHeight / 2);

    ctx.translate(cx, cy);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-Math.floor(this.x + this.shakeOffsetX), -Math.floor(this.y + this.shakeOffsetY));
  }

  restore(ctx) {
    ctx.restore();
  }

  screenToWorld(screenX, screenY) {
    const cx = this.viewportWidth / 2;
    const cy = this.viewportHeight / 2;

    const relX = (screenX - cx) / this.zoom;
    const relY = (screenY - cy) / this.zoom;

    return {
      x: this.x + relX,
      y: this.y + relY,
    };
  }

  worldToScreen(worldX, worldY) {
    const cx = this.viewportWidth / 2;
    const cy = this.viewportHeight / 2;

    const screenX = cx + (worldX - this.x) * this.zoom;
    const screenY = cy + (worldY - this.y) * this.zoom;

    return {
      x: screenX,
      y: screenY,
    };
  }

  getVisibleBounds(margin = 64) {
    const halfW = (this.viewportWidth / 2) / this.zoom + margin;
    const halfH = (this.viewportHeight / 2) / this.zoom + margin;

    return {
      left: this.x - halfW,
      right: this.x + halfW,
      top: this.y - halfH,
      bottom: this.y + halfH,
    };
  }
}

export default Camera;
