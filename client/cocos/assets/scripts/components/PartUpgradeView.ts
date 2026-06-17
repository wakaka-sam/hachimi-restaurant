import { _decorator, Button, Component, Label, Sprite } from 'cc';
import { CONSTANTS, PART_LABELS, PartKey, ProfileState } from '../core/GameRules';
import { TextureCatalog } from './TextureCatalog';

const { ccclass, property } = _decorator;

@ccclass('PartUpgradeView')
export class PartUpgradeView extends Component {
  @property(Label)
  titleLabel: Label | null = null;

  @property(Label)
  costLabel: Label | null = null;

  @property(Label)
  effectLabel: Label | null = null;

  @property([Sprite])
  starSprites: Sprite[] = [];

  @property(Button)
  upgradeButton: Button | null = null;

  @property(Label)
  buttonLabel: Label | null = null;

  private part: PartKey = 'cashier';
  private onUpgrade: ((part: PartKey) => void) | null = null;

  bind(part: PartKey, onUpgrade: (part: PartKey) => void): void {
    this.part = part;
    this.onUpgrade = onUpgrade;
    if (this.upgradeButton) {
      this.upgradeButton.transition = Button.Transition.NONE;
    }
    this.upgradeButton?.node.on(Button.EventType.CLICK, this.handleClick, this);
  }

  render(profile: ProfileState, textures: TextureCatalog): void {
    const star = profile.player.parts[this.part];
    const maxed = star >= CONSTANTS.starsPerPart;
    const cost = profile.economy.upgradeCost;
    const short = Math.max(0, cost - profile.player.coins);

    if (this.titleLabel) {
      this.titleLabel.string = PART_LABELS[this.part];
    }
    if (this.costLabel) {
      this.costLabel.string = maxed ? '已满星' : `成本 ${cost}${short > 0 ? `，还差 ${short}` : ''}`;
    }
    if (this.effectLabel) {
      this.effectLabel.string = profile.partEffects[this.part] || '经营手感提升';
    }
    this.starSprites.forEach((sprite, index) => {
      sprite.spriteFrame = textures.getStarFrame(index < star);
      sprite.node.active = true;
    });
    if (this.upgradeButton) {
      this.upgradeButton.transition = Button.Transition.NONE;
      this.upgradeButton.interactable = !maxed && profile.player.coins >= cost;
    }
    if (this.buttonLabel) {
      this.buttonLabel.string = maxed ? '满星' : '升级';
    }
  }

  private handleClick(): void {
    this.onUpgrade?.(this.part);
  }
}
