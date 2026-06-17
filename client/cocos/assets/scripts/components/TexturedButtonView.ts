import { _decorator, Button, Component, Label, Sprite } from 'cc';
import { TextureCatalog } from './TextureCatalog';

const { ccclass, property } = _decorator;

@ccclass('TexturedButtonView')
export class TexturedButtonView extends Component {
  @property(Button)
  button: Button | null = null;

  @property(Sprite)
  backgroundSprite: Sprite | null = null;

  @property(Label)
  label: Label | null = null;

  render(textures: TextureCatalog): void {
    if (this.button) {
      this.button.transition = Button.Transition.NONE;
    }
    if (this.backgroundSprite) {
      const interactable = this.button?.interactable ?? true;
      this.backgroundSprite.spriteFrame = interactable ? textures.button : textures.buttonDisabled;
    }
  }

  setText(text: string): void {
    if (this.label) {
      this.label.string = text;
    }
  }
}
