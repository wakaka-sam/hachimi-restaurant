import { sys } from 'cc';
import { BusinessSession, PartKey, ProfileState, SettlementState, SpeedMode } from '../core/GameRules';
import { LocalBusinessSummary } from '../core/BusinessSimulation';

export const PRODUCTION_API_BASE_URL = 'https://animalapi.wakaka007.cn';

export interface ApiResponse<T> {
  ok: boolean;
  error?: {
    code: string;
    message: string;
  };
  profile?: ProfileState;
  session?: BusinessSession;
  settlement?: SettlementState;
  claimedTask?: unknown;
  resumed?: boolean;
}

export class ApiClient {
  private playerId = '';
  private readonly resolvedBaseUrl: string;

  constructor(baseUrl = '') {
    this.resolvedBaseUrl = ApiClient.resolveBaseUrl(baseUrl);
  }

  static resolveBaseUrl(baseUrl = ''): string {
    const trimmed = baseUrl.trim();
    if (trimmed) {
      return trimmed.replace(/\/+$/, '');
    }
    return sys.isBrowser ? '' : PRODUCTION_API_BASE_URL;
  }

  getPlayerId(): string {
    if (!this.playerId) {
      const saved = sys.localStorage.getItem('hachimi-player-id');
      this.playerId = saved || `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
      sys.localStorage.setItem('hachimi-player-id', this.playerId);
    }
    return this.playerId;
  }

  async getProfile(): Promise<ProfileState> {
    const payload = await this.request<ApiResponse<ProfileState>>('/api/player/profile');
    return this.requireProfile(payload);
  }

  async startSession(speedMode: SpeedMode): Promise<ApiResponse<BusinessSession>> {
    return this.request('/api/session/start', {
      method: 'POST',
      body: { speedMode }
    });
  }

  async finishSession(sessionId: string, summary: LocalBusinessSummary): Promise<ApiResponse<SettlementState>> {
    return this.request('/api/session/finish', {
      method: 'POST',
      body: { sessionId, summary }
    });
  }

  async upgradePart(part: PartKey): Promise<ProfileState> {
    const payload = await this.request<ApiResponse<ProfileState>>('/api/upgrade/part', {
      method: 'POST',
      body: { part }
    });
    return this.requireProfile(payload);
  }

  async upgradeRestaurant(): Promise<ProfileState> {
    const payload = await this.request<ApiResponse<ProfileState>>('/api/upgrade/restaurant', {
      method: 'POST',
      body: {}
    });
    return this.requireProfile(payload);
  }

  async claimTask(taskId: string): Promise<ProfileState> {
    const payload = await this.request<ApiResponse<ProfileState>>('/api/tasks/claim', {
      method: 'POST',
      body: { taskId }
    });
    return this.requireProfile(payload);
  }

  private requireProfile(payload: ApiResponse<ProfileState>): ProfileState {
    if (!payload.profile) {
      throw new Error('Missing profile from backend response.');
    }
    return payload.profile;
  }

  private async request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
    const response = await fetch(`${this.resolvedBaseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        'content-type': 'application/json',
        'x-player-id': this.getPlayerId()
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error?.message || payload.error?.code || 'Request failed.');
    }
    return payload as T;
  }
}
