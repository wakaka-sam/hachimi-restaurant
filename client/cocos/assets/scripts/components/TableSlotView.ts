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

  render(customer: LocalCustomer | null, waitingCount: number, textures: TextureCatalog, unlocked = true): void {
    if (this.tableSprite) {
      this.tableSprite.spriteFrame = this.getTableTexture(customer?.phase, textures, unlocked);
    }
    if (this.customerSprite) {
      this.customerSprite.node.active = unlocked && Boolean(customer);
      if (unlocked && customer && textures.animals.length > 0) {
        this.customerSprite.spriteFrame = textures.animals[customer.animalIndex % textures.animals.length];
      }
    }
    if (this.button) {
      this.button.interactable = unlocked;
    }
    if (this.label) {
      this.label.string = this.getLabel(customer, waitingCount, unlocked);
    }
  }

  private handleClick(): void {
    this.onPressed?.(this.tableIndex);
  }

  private getTableTexture(phase: CustomerPhase | undefined, textures: TextureCatalog, unlocked: boolean): SpriteFrame | null {
    if (!unlocked) {
      return textures.tableLocked;
    }
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

  private getLabel(customer: LocalCustomer | null, waitingCount: number, unlocked: boolean): string {
    if (!unlocked) {
      return '未解锁';
    }
    if (!customer) {
      return waitingCount > 0 ? '点我入座' : '空桌';
    }
    if (customer.phase === 'seated') {
      return `等上菜 ${this.formatSeconds(customer.phaseTime)}`;
    }
    if (customer.phase === 'readyFood') {
      return `点我上菜 ${this.formatSeconds(customer.patience)}`;
    }
    if (customer.phase === 'eating') {
      return `用餐中 ${this.formatSeconds(customer.phaseTime)}`;
    }
    return `点我收银 ${this.formatSeconds(customer.patience)}`;
  }

  private formatSeconds(seconds: number): string {
    return `${Math.max(0, Math.ceil(seconds))}s`;
  }
}
