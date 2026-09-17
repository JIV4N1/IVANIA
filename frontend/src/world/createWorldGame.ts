import Phaser from 'phaser';
import type { VisibleState } from '../api';
import { agentPosition, areas, MAP_HEIGHT, MAP_WIDTH, unknownArea } from './worldLayout';

export interface WorldView { agents: VisibleState['agents']; selectedId: string }

export function createWorldGame(parent: HTMLElement, initial: WorldView) {
  let latest: WorldView | null = initial;
  let ready = false;
  let disposed = false;
  class WorldScene extends Phaser.Scene {
    private markers?: Phaser.GameObjects.Container;

    create() {
      if (disposed) return;
      const graphics = this.add.graphics();
      for (const area of [...areas, unknownArea]) {
        graphics.fillStyle(area.color, 0.6).fillRoundedRect(area.x, area.y, area.width, area.height, 14);
        graphics.lineStyle(1, 0x52637a).strokeRoundedRect(area.x, area.y, area.width, area.height, 14);
        this.add.text(area.x + 18, area.y + 18, area.label, {
          fontFamily: 'Segoe UI, sans-serif', fontSize: area === unknownArea ? '18px' : '25px', color: '#e5edf7',
        });
        if (area !== unknownArea) {
          // Small building silhouette, not an interactive control.
          graphics.lineStyle(3, 0x718a9e).strokeRect(area.x + 84, area.y + 64, 48, 40);
          graphics.strokeRect(area.x + 103, area.y + 83, 12, 21);
          if (area.id === 'home') graphics.strokeTriangle(area.x + 76, area.y + 64, area.x + 108, area.y + 44, area.x + 140, area.y + 64);
          if (area.id === 'cafe') graphics.lineBetween(area.x + 78, area.y + 64, area.x + 138, area.y + 64);
          if (area.id === 'work') graphics.strokeRect(area.x + 93, area.y + 47, 30, 17);
        }
      }
      this.markers = this.add.container(0, 0);
      ready = true;
      this.paint(); // Includes updates received while Phaser was booting.
    }

    paint() {
      if (!ready || disposed || !latest || !this.markers) return;
      this.markers.removeAll(true);
      for (const agent of latest.agents) {
        const { x, y } = agentPosition(agent.id, agent.locationId);
        const selected = agent.id === latest.selectedId;
        const color = agent.id === 'agent-sofia' ? 0xb8a2f5 : 0x67d9c8;
        const shape = this.add.graphics();
        if (selected) shape.lineStyle(3, 0xf5f9ff).strokeRoundedRect(x - 42, y - 29, 84, 81, 12);
        shape.fillStyle(color).fillCircle(x, y - 6, 12).fillRoundedRect(x - 16, y + 8, 32, 15, 6);
        const name = this.add.text(x, y + 37, agent.name, {
          fontFamily: 'Segoe UI, sans-serif', fontSize: '20px', color: '#ffffff',
        }).setOrigin(0.5);
        this.markers.add([shape, name]);
        if (selected) this.markers.add(this.add.text(x, y + 66, 'SELECCIONADO', {
          fontFamily: 'Segoe UI, sans-serif', fontSize: '11px', color: '#d9eef5',
        }).setOrigin(0.5));
      }
    }
  }
  const scene = new WorldScene('world-view');
  const game = new Phaser.Game({
    type: Phaser.CANVAS, parent, width: MAP_WIDTH, height: MAP_HEIGHT,
    backgroundColor: '#101a27', scene, banner: false,
    audio: { noAudio: true }, input: { keyboard: false, mouse: false, touch: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
  return {
    update(view: WorldView) { if (!disposed) { latest = view; scene.paint(); } },
    resize() { if (!disposed && game.isBooted) game.scale.refresh(); },
    destroy() {
      disposed = true; ready = false; latest = null;
      game.destroy(true); // Phaser removes its scene objects and global listeners on the next frame.
    },
  };
}
