import { _decorator, Button, Component, Label, Sprite } from 'cc';
import { TextureCatalog } from './TextureCatalog';

const { ccclass, property } = _decorator;

type ButtonVisualState = 'normal' | 'active' | 'muted';
type ButtonTextureName = 'none' | 'button' | 'buttonDisabled' | 'designStartButton';

@ccclass('TexturedButtonView')
export class TexturedButtonView extends Component {
  @property(Button)
  button: Button | null = null;

  @property(Sprite)
  backgroundSprite: Sprite | null = null;

  @property(Label)
  label: Label | null = null;

  @property
  visualState: ButtonVisualState = 'normal';

  @property
  normalTexture: ButtonTextureName = 'button';

  @property
  activeTexture: ButtonTextureName = 'button';

  @property
  mutedTexture: ButtonTextureName = 'buttonDisabled';

  @property
  disabledTexture: ButtonTextureName = 'buttonDisabled';

  render(textures: TextureCatalog): void {
    if (this.button) {
      this.button.transition = Button.Transition.NONE;
    }
    if (this.backgroundSprite) {
      const interactable = this.button?.interactable ?? true;
      const textureName = this.getTextureName(interactable);
      this.backgroundSprite.spriteFrame = textureName === 'none' ? null : textures.requireTexture(textureName);
    }
  }

  setText(text: string): void {
    if (this.label) {
      this.label.string = text;
    }
  }

  private getTextureName(interactable: boolean): ButtonTextureName {
    if (this.visualState === 'active') {
      return this.activeTexture;
    }
    if (this.visualState === 'muted') {
      return this.mutedTexture;
    }
    return interactable ? this.normalTexture : this.disabledTexture;
  }
}
