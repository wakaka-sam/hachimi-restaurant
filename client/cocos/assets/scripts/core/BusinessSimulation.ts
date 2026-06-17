import { CONSTANTS, SpeedMode, TuningState, clamp } from './GameRules';

export type CustomerPhase = 'waiting' | 'seated' | 'readyFood' | 'eating' | 'readyPay';

export interface LocalCustomer {
  id: number;
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
}

export class BusinessSimulation {
  readonly tables: TableState[];
  readonly waiting: LocalCustomer[] = [];
  readonly speedMode: SpeedMode;
  timeLeft = CONSTANTS.sessionDurationSeconds;
  spawnCooldown = 1;
  customersServed = 0;
  customersLost = 0;
  satisfactionSum = 0;
  combo = 0;
  maxCombo = 0;
  nextCustomerId = 1;
  finished = false;

  constructor(readonly tuning: TuningState, speedMode: SpeedMode) {
    this.speedMode = speedMode;
    this.tables = Array.from({ length: tuning.tableCapacity }, () => ({ customer: null }));
  }

  update(realDeltaSeconds: number): void {
    if (this.finished) {
      return;
    }
    const speed = this.speedMode === '2x' ? 2 : 1;
    const delta = realDeltaSeconds * speed;
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
      averageSatisfaction: this.customersServed > 0 ? this.satisfactionSum / this.customersServed : 0,
      maxCombo: this.maxCombo,
      durationSeconds: CONSTANTS.sessionDurationSeconds,
      speedMode: this.speedMode,
      clientVersion: 'cocos-source-0.1.0'
    };
  }

  private spawnCustomer(): void {
    this.waiting.push({
      id: this.nextCustomerId,
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
  }

  private loseCustomer(): void {
    this.customersLost += 1;
    this.combo = 0;
  }
}
