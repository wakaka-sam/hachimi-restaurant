import {
  CONSTANTS,
  PARTS,
  PART_LABELS,
  getPartEffectDescription
} from '/shared/game-rules.mjs';

const PLAYER_ID = localStorage.getItem('hachimi-player-id') || crypto.randomUUID();
localStorage.setItem('hachimi-player-id', PLAYER_ID);

const textures = {
  coin: '/textures/icon-coin.png',
  stamina: '/textures/icon-stamina.png',
  star: '/textures/icon-star.png',
  table: {
    empty: '/textures/table-empty.png',
    seated: '/textures/table-ready.png',
    readyFood: '/textures/table-ready.png',
    eating: '/textures/table-food.png',
    readyPay: '/textures/table-pay.png'
  },
  cashier: '/textures/cashier.png',
  animals: [
    '/textures/customer-cat.png',
    '/textures/customer-dog.png',
    '/textures/customer-rabbit.png',
    '/textures/customer-bear.png'
  ]
};

const state = {
  profile: null,
  screen: 'main',
  loading: true,
  message: '',
  speedMode: '1x',
  result: null,
  game: null,
  loopHandle: null
};

const app = document.querySelector('#app');

loadProfile();

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      'x-player-id': PLAYER_ID,
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    const message = payload.error?.message || payload.error?.code || '请求失败';
    throw new Error(message);
  }
  return payload;
}

async function loadProfile() {
  try {
    state.loading = true;
    render();
    const payload = await api('/api/player/profile');
    state.profile = payload.profile;
    state.loading = false;
    render();
  } catch (error) {
    state.loading = false;
    state.message = error.message;
    render();
  }
}

function h(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.assign(element.dataset, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'disabled') {
      element.disabled = Boolean(value);
    } else if (value !== false && value !== null && value !== undefined) {
      element.setAttribute(key, value);
    }
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined) {
      continue;
    }
    element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return element;
}

function textureButton(label, onClick, { disabled = false, className = '' } = {}) {
  return h('button', {
    class: `texture-button ${className}`.trim(),
    disabled,
    onclick: disabled ? undefined : onClick
  }, label);
}

function render() {
  app.replaceChildren();

  if (state.loading) {
    app.append(h('section', { class: 'panel empty-state' }, '正在加载小动物餐厅...'));
    return;
  }

  if (!state.profile) {
    app.append(h('section', { class: 'panel empty-state' }, state.message || '加载失败'));
    return;
  }

  app.append(renderTopBar());

  if (state.message) {
    app.append(h('div', { class: 'message-pill' }, state.message));
  }

  if (state.screen !== 'business') {
    app.append(renderNavigation());
  }

  if (state.screen === 'main') {
    app.append(renderMainScene());
  } else if (state.screen === 'upgrade') {
    app.append(renderUpgradeScreen());
  } else if (state.screen === 'tasks') {
    app.append(renderTaskScreen());
  } else if (state.screen === 'business') {
    app.append(renderBusinessScreen());
  } else if (state.screen === 'result') {
    app.append(renderResultScreen());
  }
}

function renderTopBar() {
  const { player, economy } = state.profile;
  return h('header', { class: 'top-bar' },
    h('div', { class: 'title-row' },
      h('h1', { class: 'game-title' }, '小动物餐厅'),
      h('span', { class: 'level-pill' }, `餐厅 Lv.${player.restaurantLevel}`)
    ),
    h('div', { class: 'stats-row' },
      h('span', { class: 'stat-pill' }, h('img', { class: 'stat-icon', src: textures.coin, alt: '' }), player.coins),
      h('span', { class: 'stat-pill' }, h('img', { class: 'stat-icon', src: textures.stamina, alt: '' }), `${player.stamina}/${player.staminaMax}`),
      h('span', { class: 'stat-pill' }, `下次 ${economy.expectedRevenue}`)
    )
  );
}

function renderNavigation() {
  return h('nav', { class: 'nav-row' },
    textureButton('餐厅', () => setScreen('main'), { className: 'compact' }),
    textureButton('升级', () => setScreen('upgrade'), { className: 'compact' }),
    textureButton('任务', () => setScreen('tasks'), { className: 'compact' })
  );
}

function setScreen(screen) {
  clearGameLoop();
  state.screen = screen;
  state.message = '';
  render();
}

function renderMainScene() {
  const { player, activeSession } = state.profile;
  return h('section', { class: 'scene restaurant-scene' },
    h('div', { class: 'status-grid' }, PARTS.map((part) => h('div', { class: 'part-chip' },
      h('div', {}, PART_LABELS[part]),
      renderStars(player.parts[part])
    ))),
    h('div', { class: 'main-actions' },
      h('div', { class: 'stats-row' },
        textureButton(state.speedMode === '1x' ? '1 倍速' : '2 倍速', () => {
          state.speedMode = state.speedMode === '1x' ? '2x' : '1x';
          render();
        }, { className: 'compact' }),
        textureButton(activeSession ? '继续营业' : '开始营业', startBusiness, {
          className: 'primary',
          disabled: player.stamina < CONSTANTS.sessionStaminaCost && !activeSession
        })
      ),
      h('span', { class: 'message-pill' }, '营业消耗 10 体力，完成后后端结算金币')
    )
  );
}

function renderStars(count) {
  return h('div', { class: 'stars' }, Array.from({ length: CONSTANTS.starsPerPart }, (_, index) => h('img', {
    class: `star ${index < count ? 'full' : 'empty'}`,
    src: textures.star,
    alt: index < count ? '满星' : '空星'
  })));
}

async function startBusiness() {
  try {
    const payload = await api('/api/session/start', {
      method: 'POST',
      body: { speedMode: state.speedMode }
    });
    state.profile = payload.profile;
    state.message = payload.resumed ? '已恢复未完成营业' : '';
    startLocalGame(payload.session);
  } catch (error) {
    state.message = error.message;
    render();
  }
}

function startLocalGame(session) {
  clearGameLoop();
  const tuning = state.profile.tuning;
  state.game = {
    session,
    tuning,
    timeLeft: CONSTANTS.sessionDurationSeconds,
    spawnCooldown: 1,
    waiting: [],
    tables: Array.from({ length: tuning.tableCapacity }, () => null),
    served: 0,
    lost: 0,
    satisfactionSum: 0,
    combo: 0,
    maxCombo: 0,
    nextCustomerId: 1,
    lastTick: performance.now(),
    finished: false
  };
  state.screen = 'business';
  render();
  state.loopHandle = window.setInterval(tickGame, 180);
}

function tickGame() {
  if (state.screen !== 'business' || !state.game || state.game.finished) {
    clearGameLoop();
    return;
  }

  const now = performance.now();
  const realDelta = Math.min(0.5, (now - state.game.lastTick) / 1000);
  state.game.lastTick = now;
  const speed = state.game.session.speedMode === '2x' ? 2 : 1;
  updateGame(realDelta * speed);
  render();
}

function updateGame(delta) {
  const game = state.game;
  game.timeLeft = Math.max(0, game.timeLeft - delta);

  game.spawnCooldown -= delta;
  const crowdCount = game.waiting.length + game.tables.filter(Boolean).length;
  if (game.spawnCooldown <= 0 && crowdCount < game.tables.length + 4) {
    spawnCustomer();
    game.spawnCooldown = game.tuning.spawnIntervalSeconds * (0.85 + Math.random() * 0.3);
  }

  for (const customer of [...game.waiting]) {
    customer.patience -= delta;
    if (customer.patience <= 0) {
      removeWaitingCustomer(customer.id);
      loseCustomer();
    }
  }

  game.tables.forEach((customer, index) => {
    if (!customer) {
      return;
    }

    customer.phaseTime -= delta;
    if (customer.phase === 'seated') {
      customer.patience -= delta;
      if (customer.patience <= 0) {
        game.tables[index] = null;
        loseCustomer();
      } else if (customer.phaseTime <= 0) {
        customer.phase = 'readyFood';
        customer.phaseTime = customer.patience;
      }
    } else if (customer.phase === 'readyFood') {
      customer.patience -= delta;
      customer.phaseTime = customer.patience;
      if (customer.patience <= 0) {
        game.tables[index] = null;
        loseCustomer();
      }
    } else if (customer.phase === 'eating') {
      if (customer.phaseTime <= 0) {
        customer.phase = 'readyPay';
        customer.maxPatience = game.tuning.cashierWindowSeconds;
        customer.patience = customer.maxPatience;
        customer.phaseTime = customer.maxPatience;
      }
    } else if (customer.phase === 'readyPay') {
      customer.patience -= delta;
      customer.phaseTime = customer.patience;
      if (customer.patience <= 0) {
        game.tables[index] = null;
        loseCustomer();
      }
    }
  });

  if (game.timeLeft <= 0) {
    finishBusiness();
  }
}

function spawnCustomer() {
  const game = state.game;
  const animal = textures.animals[(game.nextCustomerId - 1) % textures.animals.length];
  game.waiting.push({
    id: game.nextCustomerId,
    animal,
    patience: game.tuning.patienceSeconds,
    maxPatience: game.tuning.patienceSeconds
  });
  game.nextCustomerId += 1;
}

function removeWaitingCustomer(id) {
  const game = state.game;
  game.waiting = game.waiting.filter((customer) => customer.id !== id);
}

function loseCustomer() {
  const game = state.game;
  game.lost += 1;
  game.combo = 0;
}

function renderBusinessScreen() {
  const game = state.game;
  if (!game) {
    return h('section', { class: 'panel empty-state' }, '营业未开始');
  }

  return h('section', { class: 'scene business-scene' },
    h('div', { class: 'business-hud' },
      h('span', { class: 'timer-pill' }, `剩余 ${Math.ceil(game.timeLeft)}s`),
      h('span', { class: 'timer-pill' }, game.session.speedMode),
      textureButton('结束结算', finishBusiness, { className: 'compact' })
    ),
    h('div', { class: 'table-zone' }, game.tables.map((customer, index) => renderTable(customer, index))),
    h('div', { class: 'waiting-row' }, game.waiting.map((customer) => h('div', { class: 'waiting-customer' },
      h('img', { src: customer.animal, alt: '等待中的小动物' }),
      h('span', {}, `${Math.max(0, Math.ceil(customer.patience))}s`)
    ))),
    h('button', { class: 'cashier-button', onclick: collectFirstReadyPay },
      h('img', { src: textures.cashier, alt: '收银机' })
    ),
    h('div', { class: 'business-log' },
      h('span', { class: 'stat-pill' }, `服务 ${game.served}`),
      h('span', { class: 'stat-pill' }, `离开 ${game.lost}`),
      h('span', { class: 'stat-pill' }, `连击 ${game.combo}`),
      h('span', { class: 'stat-pill' }, `等待 ${game.waiting.length}`)
    )
  );
}

function renderTable(customer, index) {
  const texture = customer ? textures.table[customer.phase] : textures.table.empty;
  const label = getTableLabel(customer);
  return h('button', { class: 'table-slot', onclick: () => handleTableClick(index) },
    customer ? h('img', { class: 'customer-on-table', src: customer.animal, alt: '用餐小动物' }) : null,
    h('img', { class: 'table-texture', src: texture, alt: label }),
    h('span', { class: 'table-label' }, label)
  );
}

function getTableLabel(customer) {
  if (!customer) {
    return state.game.waiting.length ? '点我入座' : '空桌';
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

function handleTableClick(index) {
  const game = state.game;
  if (!game || game.finished) {
    return;
  }
  const customer = game.tables[index];
  if (!customer) {
    seatCustomer(index);
  } else if (customer.phase === 'readyFood') {
    customer.phase = 'eating';
    customer.phaseTime = game.tuning.eatingSeconds;
  } else if (customer.phase === 'readyPay') {
    collectCustomer(index);
  }
  render();
}

function seatCustomer(index) {
  const game = state.game;
  if (!game.waiting.length || game.tables[index]) {
    return;
  }
  const customer = game.waiting.shift();
  game.tables[index] = {
    ...customer,
    phase: 'seated',
    phaseTime: game.tuning.prepDelaySeconds
  };
}

function collectFirstReadyPay() {
  const index = state.game?.tables.findIndex((customer) => customer?.phase === 'readyPay') ?? -1;
  if (index >= 0) {
    collectCustomer(index);
    render();
  }
}

function collectCustomer(index) {
  const game = state.game;
  const customer = game.tables[index];
  if (!customer) {
    return;
  }
  const satisfaction = 0.6 + 0.4 * (customer.patience / customer.maxPatience);
  game.satisfactionSum += Math.max(0, Math.min(1, satisfaction));
  game.served += 1;
  game.combo += 1;
  game.maxCombo = Math.max(game.maxCombo, game.combo);
  game.tables[index] = null;
}

async function finishBusiness() {
  const game = state.game;
  if (!game || game.finished) {
    return;
  }
  game.finished = true;
  clearGameLoop();

  const averageSatisfaction = game.served > 0 ? game.satisfactionSum / game.served : 0;
  try {
    const payload = await api('/api/session/finish', {
      method: 'POST',
      body: {
        sessionId: game.session.sessionId,
        summary: {
          customersServed: game.served,
          customersLost: game.lost,
          averageSatisfaction,
          maxCombo: game.maxCombo,
          durationSeconds: CONSTANTS.sessionDurationSeconds,
          speedMode: game.session.speedMode,
          clientVersion: 'web-prototype-0.1.0'
        }
      }
    });
    state.profile = payload.profile;
    state.result = payload.settlement;
    state.screen = 'result';
    state.game = null;
    render();
  } catch (error) {
    state.message = error.message;
    state.screen = 'main';
    state.game = null;
    await loadProfile();
  }
}

function clearGameLoop() {
  if (state.loopHandle) {
    window.clearInterval(state.loopHandle);
    state.loopHandle = null;
  }
}

function renderResultScreen() {
  const result = state.result;
  return h('section', { class: 'result-panel' },
    h('h2', {}, '营业结算'),
    result ? [
      h('p', {}, `获得金币：${result.rewardCoins}`),
      h('p', {}, `期望收入：${result.expectedRevenue}`),
      h('p', {}, `表现倍率：${result.performanceFactor.toFixed(2)}x`),
      h('p', {}, `完成率：${Math.round(result.completionScore * 100)}%`)
    ] : h('p', {}, '暂无结算结果'),
    h('div', { class: 'nav-row' },
      textureButton('继续营业', () => setScreen('main'), { className: 'primary' }),
      textureButton('去升级', () => setScreen('upgrade'), { className: 'primary' })
    )
  );
}

function renderUpgradeScreen() {
  const { player, economy, allPartsMaxed } = state.profile;
  return h('section', { class: 'panel' },
    h('div', { class: 'title-row' },
      h('h2', {}, '餐厅升级'),
      h('span', { class: 'level-pill' }, `统一成本 ${economy.upgradeCost}`)
    ),
    h('div', { class: 'upgrade-list' }, PARTS.map((part) => renderPartCard(part))),
    h('div', { class: 'part-card' },
      h('div', { class: 'part-card-header' },
        h('h3', { class: 'part-card-title' }, '整体升级餐厅'),
        textureButton('升级餐厅', upgradeRestaurant, {
          disabled: !allPartsMaxed,
          className: 'compact'
        })
      ),
      h('p', { class: 'effect-text' }, allPartsMaxed
        ? '五个部件已满星，可以进入下一餐厅等级。玩法体验不会回退。'
        : '五个部件全部 5 星后解锁。')
    )
  );
}

function renderPartCard(part) {
  const { player, economy } = state.profile;
  const star = player.parts[part];
  const disabled = star >= CONSTANTS.starsPerPart || player.coins < economy.upgradeCost;
  const shortage = Math.max(0, economy.upgradeCost - player.coins);
  return h('article', { class: 'part-card' },
    h('div', { class: 'part-card-header' },
      h('h3', { class: 'part-card-title' }, PART_LABELS[part]),
      textureButton(star >= CONSTANTS.starsPerPart ? '满星' : '升级', () => upgradePart(part), {
        disabled,
        className: 'compact'
      })
    ),
    renderStars(star),
    h('p', { class: 'fine-print' }, `成本：${economy.upgradeCost}${shortage ? `，还差 ${shortage}` : ''}`),
    h('p', { class: 'effect-text' }, getPartEffectDescription(part, player))
  );
}

async function upgradePart(part) {
  try {
    const payload = await api('/api/upgrade/part', {
      method: 'POST',
      body: { part }
    });
    state.profile = payload.profile;
    state.message = `${PART_LABELS[part]} 已升级`;
    render();
  } catch (error) {
    state.message = error.message;
    render();
  }
}

async function upgradeRestaurant() {
  try {
    const payload = await api('/api/upgrade/restaurant', { method: 'POST', body: {} });
    state.profile = payload.profile;
    state.message = '餐厅已整体升级';
    render();
  } catch (error) {
    state.message = error.message;
    render();
  }
}

function renderTaskScreen() {
  const tasks = state.profile.tasks;
  return h('section', { class: 'panel' },
    h('div', { class: 'title-row' },
      h('h2', {}, '任务'),
      h('span', { class: 'level-pill' }, '辅助奖励')
    ),
    h('div', { class: 'task-list' }, tasks.map(renderTaskCard))
  );
}

function renderTaskCard(task) {
  return h('article', { class: 'task-card' },
    h('div', { class: 'task-header' },
      h('h3', { class: 'task-title' }, task.title),
      textureButton(task.claimed ? '已领取' : '领取', () => claimTask(task.id), {
        disabled: !task.completed || task.claimed,
        className: 'compact'
      })
    ),
    h('p', { class: 'effect-text' }, task.description),
    h('p', { class: 'progress-text' }, `进度：${task.progress}/${task.target}`),
    h('p', { class: 'fine-print' }, `奖励：金币 ${task.reward.coins || 0}，体力 ${task.reward.stamina || 0}`)
  );
}

async function claimTask(taskId) {
  try {
    const payload = await api('/api/tasks/claim', {
      method: 'POST',
      body: { taskId }
    });
    state.profile = payload.profile;
    state.message = '任务奖励已领取';
    render();
  } catch (error) {
    state.message = error.message;
    render();
  }
}
