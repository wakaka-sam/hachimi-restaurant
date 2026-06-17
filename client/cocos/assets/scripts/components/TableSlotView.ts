import { _decorator, Button, Component, Label, Sprite, SpriteFrame } from 'cc';
import { CustomerPhase, LocalCustomer } from '../core/BusinessSimulation';
import { TextureCatalog } from './TextureCatalog';

const { ccclass, property } = _decorator;

@ccclass('TableSlotView')
export class TableSlotView extends Component {
  @property(Sprite)
  tableSprite: Sprite | null = null;

  @property(Sprite)
  customerSprite: Sprite | null = null;

  @property(Label)
  label: Label | null = null;

  @property(Button)
  button: Button | null = null;

  private tableIndex = 0;
  private onPressed: ((tableIndex: number) => void) | null = null;

  bind(tableIndex: number, onPressed: (tableIndex: number) => void): void {
    this.tableIndex = tableIndex;
    this.onPressed = onPressed;
    this.button?.node.on(Button.EventType.CLICK, this.handleClick, this);
  }

  render(customer: LocalCustomer | null, waitingCount: number, textures: TextureCatalog): void {
    if (this.tableSprite) {
      this.tableSprite.spriteFrame = this.getTableTexture(customer?.phase, textures);
    }
    if (this.customerSprite) {
      this.customerSprite.node.active = Boolean(customer);
      if (customer && textures.animals.length > 0) {
        this.customerSprite.spriteFrame = textures.animals[customer.animalIndex % textures.animals.length];
      }
    }
    if (this.label) {
      this.label.string = this.getLabel(customer, waitingCount);
    }
  }

  private handleClick(): void {
    this.onPressed?.(this.tableIndex);
  }

  private getTableTexture(phase: CustomerPhase | undefined, textures: TextureCatalog): SpriteFrame | null {
    if (phase === 'eating') {
      return textures.tableFood;
    }
    if (phase === 'readyPay') {
      return textures.tablePay;
    }
    if (phase === 'seated' || phase === 'readyFood') {
      return textures.tableReady;
    }
    return textures.tableEmpty;
  }

  private getLabel(customer: LocalCustomer | null, waitingCount: number): string {
    if (!customer) {
      return waitingCount > 0 ? '点我入座' : '空桌';
    }
    if (customer.phase === 'seated') {
      return '等上菜';
    }
    if (customer.phase === 'readyFood') {
      return '点我上菜';
    }
    if (customer.phase === 'eating') {
      return '用餐中';
    }
    return '点我收银';
  }
}
