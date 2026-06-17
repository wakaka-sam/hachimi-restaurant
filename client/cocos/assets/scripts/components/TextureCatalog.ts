import { _decorator, Component, SpriteFrame } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('TextureCatalog')
export class TextureCatalog extends Component {
  @property(SpriteFrame)
  restaurantBackground: SpriteFrame | null = null;

  @property([SpriteFrame])
  restaurantBackgrounds: SpriteFrame[] = [];

  @property(SpriteFrame)
  panel: SpriteFrame | null = null;

  @property(SpriteFrame)
  card: SpriteFrame | null = null;

  @property(SpriteFrame)
  guideFocus: SpriteFrame | null = null;

  @property(SpriteFrame)
  button: SpriteFrame | null = null;

  @property(SpriteFrame)
  buttonDisabled: SpriteFrame | null = null;

  @property(SpriteFrame)
  tableEmpty: SpriteFrame | null = null;

  @property(SpriteFrame)
  tableLocked: SpriteFrame | null = null;

  @property(SpriteFrame)
  tableReady: SpriteFrame | null = null;

  @property(SpriteFrame)
  tableFood: SpriteFrame | null = null;

  @property(SpriteFrame)
  tablePay: SpriteFrame | null = null;

  @property(SpriteFrame)
  cashier: SpriteFrame | null = null;

  @property([SpriteFrame])
  animals: SpriteFrame[] = [];

  @property(SpriteFrame)
  coinIcon: SpriteFrame | null = null;

  @property(SpriteFrame)
  staminaIcon: SpriteFrame | null = null;

  @property(SpriteFrame)
  starIcon: SpriteFrame | null = null;

  @property(SpriteFrame)
  starIconEmpty: SpriteFrame | null = null;

  requireTexture(name: keyof TextureCatalog): SpriteFrame {
    const value = this[name];
    if (!value || Array.isArray(value)) {
      throw new Error(`TextureCatalog missing SpriteFrame: ${String(name)}`);
    }
    return value as SpriteFrame;
  }

  getRestaurantBackground(restaurantLevel: number): SpriteFrame {
    const frames = this.restaurantBackgrounds.length > 0
      ? this.restaurantBackgrounds
      : this.restaurantBackground ? [this.restaurantBackground] : [];
    const index = Math.min(frames.length - 1, Math.max(0, restaurantLevel - 1));
    const frame = frames[index];
    if (!frame) {
      throw new Error('TextureCatalog missing restaurant background SpriteFrame.');
    }
    return frame;
  }

  getStarFrame(filled: boolean): SpriteFrame {
    const frame = filled ? this.starIcon : this.starIconEmpty;
    if (!frame) {
      throw new Error(`TextureCatalog missing ${filled ? 'starIcon' : 'starIconEmpty'} SpriteFrame.`);
    }
    return frame;
  }
}
