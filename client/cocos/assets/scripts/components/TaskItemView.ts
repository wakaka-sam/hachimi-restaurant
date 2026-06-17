import { _decorator, Button, Component, Label } from 'cc';
import { TASK_TYPE_LABELS, TaskState } from '../core/GameRules';

const { ccclass, property } = _decorator;

@ccclass('TaskItemView')
export class TaskItemView extends Component {
  @property(Label)
  titleLabel: Label | null = null;

  @property(Label)
  typeLabel: Label | null = null;

  @property(Label)
  descriptionLabel: Label | null = null;

  @property(Label)
  progressLabel: Label | null = null;

  @property(Label)
  rewardLabel: Label | null = null;

  @property(Label)
  buttonLabel: Label | null = null;

  @property(Button)
  claimButton: Button | null = null;

  private taskId = '';
  private onClaim: ((taskId: string) => void) | null = null;

  bind(onClaim: (taskId: string) => void): void {
    this.onClaim = onClaim;
    if (this.claimButton) {
      this.claimButton.transition = Button.Transition.NONE;
    }
    this.claimButton?.node.on(Button.EventType.CLICK, this.handleClick, this);
  }

  render(task: TaskState): void {
    this.taskId = task.id;
    if (this.titleLabel) {
      this.titleLabel.string = task.title;
    }
    if (this.typeLabel) {
      this.typeLabel.string = task.typeLabel || TASK_TYPE_LABELS[task.type] || '任务';
    }
    if (this.descriptionLabel) {
      this.descriptionLabel.string = task.description;
    }
    if (this.progressLabel) {
      this.progressLabel.string = `${task.progress}/${task.target}`;
    }
    if (this.rewardLabel) {
      this.rewardLabel.string = `金币 ${task.reward.coins || 0} / 体力 ${task.reward.stamina || 0}`;
    }
    if (this.buttonLabel) {
      this.buttonLabel.string = task.claimed ? '已领取' : '领取';
    }
    if (this.claimButton) {
      this.claimButton.transition = Button.Transition.NONE;
      this.claimButton.interactable = task.completed && !task.claimed;
    }
  }

  private handleClick(): void {
    if (this.taskId) {
      this.onClaim?.(this.taskId);
    }
  }
}
