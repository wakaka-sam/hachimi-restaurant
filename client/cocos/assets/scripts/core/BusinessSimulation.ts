import { CONSTANTS, CustomerType, SpeedMode, TuningState, clamp } from './GameRules';

export type CustomerPhase = 'waiting' | 'seated' | 'readyFood' | 'eating' | 'readyPay';

export interface LocalCustomer {
  id: number;
  customerType: CustomerType;
  animalIndex: number;
  phase: CustomerPhase;
  patience: number;
  maxPatience: number;
  phaseTime: number;
}

export interface TableState {
  customer: LocalCustomer | null;
}

export interface LocalBusinessSummary {
  customersServed: number;
  customersLost: number;
  averageSatisfaction: number;
  maxCombo: number;
  durationSeconds: number;
  speedMode: SpeedMode;
  clientVersion: string;
  customerTypes: Record<CustomerType, number>;
}

export class BusinessSimulation {
  readonly tables: TableState[];
  readonly waiting: LocalCustomer[] = [];
  speedMode: SpeedMode;
  timeLeft: number;
  spawnCooldown: number = 1;
  customersServed: number = 0;
  customersLost: number = 0;
  satisfactionSum: number = 0;
  combo: number = 0;
  maxCombo: number = 0;
  nextCustomerId: number = 1;
  lastFeedback = '';
  feedbackTimeLeft = 0;
  finished = false;

  constructor(readonly tuning: TuningState, speedMode: SpeedMode, remainingSeconds: number = CONSTANTS.sessionDurationSeconds) {
    this.speedMode = speedMode;
    this.timeLeft = clamp(remainingSeconds, 0, CONSTANTS.sessionDurationSeconds);
    this.tables = Array.from({ length: tuning.tableCapacity }, () => ({ customer: null }));
  }

  setSpeedMode(speedMode: SpeedMode): void {
    this.speedMode = speedMode;
    this.setFeedback(`已切换 ${speedMode}`);
  }

  toggleSpeedMode(): void {
    this.setSpeedMode(this.speedMode === '1x' ? '2x' : '1x');
  }

  update(realDeltaSeconds: number): void {
    if (this.finished) {
      return;
    }
    const speed = this.speedMode === '2x' ? 2 : 1;
    const delta = realDeltaSeconds * speed;
    this.feedbackTimeLeft = Math.max(0, this.feedbackTimeLeft - delta);
    if (this.feedbackTimeLeft <= 0) {
      this.lastFeedback = '';
    }
    this.timeLeft = Math.max(0, this.timeLeft - delta);
    this.spawnCooldown -= delta;

    const crowdCount = this.waiting.length + this.tables.filter((table) => table.customer).length;
    if (this.spawnCooldown <= 0 && crowdCount < this.tables.length + 4) {
      this.spawnCustomer();
      this.spawnCooldown = this.tuning.spawnIntervalSeconds;
    }

    this.updateWaiting(delta);
    this.updateTables(delta);

    if (this.timeLeft <= 0) {
      this.finished = true;
    }
  }

  seatCustomer(tableIndex: number): void {
    const table = this.tables[tableIndex];
    if (!table || table.customer || this.waiting.length < 1) {
      return;
    }
    const customer = this.waiting.shift()!;
    customer.phase = 'seated';
    customer.phaseTime = this.tuning.prepDelaySeconds;
    table.customer = customer;
    this.setFeedback('安排入座');
  }

  handleTablePressed(tableIndex: number): void {
    const table = this.tables[tableIndex];
    if (!table) {
      return;
    }
    if (!table.customer) {
      this.seatCustomer(tableIndex);
      return;
    }
    if (table.customer.phase === 'readyFood') {
      table.customer.phase = 'eating';
      table.customer.phaseTime = this.tuning.eatingSeconds;
      this.setFeedback('上菜完成');
      return;
    }
    if (table.customer.phase === 'readyPay') {
      this.collectCustomer(tableIndex);
    }
  }

  collectFirstReadyPay(): void {
    const index = this.tables.findIndex((table) => table.customer?.phase === 'readyPay');
    if (index >= 0) {
      this.collectCustomer(index);
    }
  }

  getSummary(): LocalBusinessSummary {
    return {
      customersServed: this.customersServed,
      customersLost: this.customersLost,
      averageSatisfaction: this.averageSatisfaction,
      maxCombo: this.maxCombo,
      durationSeconds: CONSTANTS.sessionDurationSeconds,
      speedMode: this.speedMode,
      clientVersion: 'cocos-source-0.1.0',
      customerTypes: {
        normal: this.customersServed + this.customersLost
      }
    };
  }

  get averageSatisfaction(): number {
    return this.customersServed > 0 ? this.satisfactionSum / this.customersServed : 0;
  }

  get satisfactionPercent(): number {
    return Math.round(this.averageSatisfaction * 100);
  }

  private spawnCustomer(): void {
    this.waiting.push({
      id: this.nextCustomerId,
      customerType: 'normal',
      animalIndex: (this.nextCustomerId - 1) % 4,
      phase: 'waiting',
      patience: this.tuning.patienceSeconds,
      maxPatience: this.tuning.patienceSeconds,
      phaseTime: this.tuning.patienceSeconds
    });
    this.nextCustomerId += 1;
  }

  private updateWaiting(delta: number): void {
    for (let index = this.waiting.length - 1; index >= 0; index -= 1) {
      const customer = this.waiting[index];
      customer.patience -= delta;
      if (customer.patience <= 0) {
        this.waiting.splice(index, 1);
        this.loseCustomer();
      }
    }
  }

  private updateTables(delta: number): void {
    this.tables.forEach((table) => {
      const customer = table.customer;
      if (!customer) {
        return;
      }

      customer.phaseTime -= delta;
      if (customer.phase === 'seated') {
        customer.patience -= delta;
        if (customer.patience <= 0) {
          table.customer = null;
          this.loseCustomer();
        } else if (customer.phaseTime <= 0) {
          customer.phase = 'readyFood';
          customer.phaseTime = customer.patience;
        }
      } else if (customer.phase === 'readyFood') {
        customer.patience -= delta;
        customer.phaseTime = customer.patience;
        if (customer.patience <= 0) {
          table.customer = null;
          this.loseCustomer();
        }
      } else if (customer.phase === 'eating') {
        if (customer.phaseTime <= 0) {
          customer.phase = 'readyPay';
          customer.maxPatience = this.tuning.cashierWindowSeconds;
          customer.patience = customer.maxPatience;
          customer.phaseTime = customer.maxPatience;
        }
      } else if (customer.phase === 'readyPay') {
        customer.patience -= delta;
        customer.phaseTime = customer.patience;
        if (customer.patience <= 0) {
          table.customer = null;
          this.loseCustomer();
        }
      }
    });
  }

  private collectCustomer(tableIndex: number): void {
    const table = this.tables[tableIndex];
    const customer = table?.customer;
    if (!customer) {
      return;
    }
    const satisfaction = 0.6 + 0.4 * clamp(customer.patience / customer.maxPatience, 0, 1);
    this.satisfactionSum += satisfaction;
    this.customersServed += 1;
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    table.customer = null;
    this.setFeedback(`收银成功 满意 ${Math.round(satisfaction * 100)}%`);
  }

  private loseCustomer(): void {
    this.customersLost += 1;
    this.combo = 0;
    this.setFeedback('顾客离开，连击中断');
  }

  private setFeedback(message: string): void {
    this.lastFeedback = message;
    this.feedbackTimeLeft = 2.2;
  }
}
