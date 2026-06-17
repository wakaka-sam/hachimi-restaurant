import { _decorator, Component, SafeArea, Widget } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('MobileSafeAreaView')
export class MobileSafeAreaView extends Component {
  @property
  symmetric = false;

  @property
  minTouchInset = 16;

  onLoad(): void {
    this.applySafeArea();
  }

  onEnable(): void {
    this.applySafeArea();
  }

  applySafeArea(): void {
    const widget = this.ensureWidget();
    widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
    widget.isAlignTop = true;
    widget.isAlignBottom = true;
    widget.isAlignLeft = true;
    widget.isAlignRight = true;
    widget.isAbsoluteTop = true;
    widget.isAbsoluteBottom = true;
    widget.isAbsoluteLeft = true;
    widget.isAbsoluteRight = true;

    const safeArea = this.ensureSafeArea();
    safeArea.symmetric = this.symmetric;
    safeArea.updateArea();

    widget.top = Math.max(widget.top, this.minTouchInset);
    widget.bottom = Math.max(widget.bottom, this.minTouchInset);
    widget.left = Math.max(widget.left, 0);
    widget.right = Math.max(widget.right, 0);
    widget.updateAlignment();
  }

  private ensureWidget(): Widget {
    return this.getComponent(Widget) || this.node.addComponent(Widget);
  }

  private ensureSafeArea(): SafeArea {
    return this.getComponent(SafeArea) || this.node.addComponent(SafeArea);
  }
}
