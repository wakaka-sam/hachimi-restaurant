import { _decorator, Component, Sprite } from 'cc';
import { TextureCatalog } from './TextureCatalog';

const { ccclass, property } = _decorator;

type PanelTexture = 'panel' | 'card' | 'guideFocus';

@ccclass('TexturedPanelView')
export class TexturedPanelView extends Component {
  @property(Sprite)
  backgroundSprite: Sprite | null = null;

  @property
  panelTexture: PanelTexture = 'panel';

  render(textures: TextureCatalog): void {
    if (!this.backgroundSprite) {
      return;
    }
    const textureName = this.panelTexture === 'guideFocus'
      ? 'guideFocus'
      : this.panelTexture === 'card' ? 'card' : 'panel';
    this.backgroundSprite.spriteFrame = textures.requireTexture(textureName);
  }
}
