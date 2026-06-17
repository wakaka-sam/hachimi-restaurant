import { _decorator, Component, Label, Sprite } from 'cc';
import { CONSTANTS, PART_LABELS, PartKey, ProfileState } from '../core/GameRules';
import { TextureCatalog } from './TextureCatalog';

const { ccclass, property } = _decorator;

@ccclass('PartStatusView')
export class PartStatusView extends Component {
  @property(Label)
  titleLabel: Label | null = null;

  @property([Sprite])
  starSprites: Sprite[] = [];

  private part: PartKey = 'cashier';

  bind(part: PartKey): void {
    this.part = part;
  }

  render(profile: ProfileState, textures: TextureCatalog): void {
    const star = profile.player.parts[this.part];

    if (this.titleLabel) {
      this.titleLabel.string = PART_LABELS[this.part];
    }

    this.starSprites.forEach((sprite, index) => {
      sprite.node.active = index < CONSTANTS.starsPerPart;
      sprite.spriteFrame = textures.getStarFrame(index < star);
    });
  }
}
