import { DataMessage, InboundMessage } from '../types/protocol';
import { MiniEmitter } from '../utils/MiniEmitter';
import {
  ConnectionState,
  DataSourceEvents,
  PairedDeviceInfo,
  PostureDataSource,
} from './dataSource';

const SAMPLE_INTERVAL_MS = 1000; // 1 Hz, matches StraightUp v2 firmware
const DEMO_DEVICE: PairedDeviceInfo = {
  id: 'demo-3-mpu',
  name: 'StraightUp Demo',
  address: '00:00:00:DE:M0',
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Generates a synthetic stream of protocol messages with the exact same
 * shape/cadence a real HC-06-connected Arduino would produce, so every
 * screen can be built and demoed without hardware. Feeds the same
 * PostureDataSource interface the real bluetooth service implements.
 */
class DemoSimulator implements PostureDataSource {
  private emitter = new MiniEmitter<DataSourceEvents>();
  private _state: ConnectionState = 'disconnected';
  private timer: ReturnType<typeof setInterval> | null = null;

  // simulated device internals
  private base = 4 + Math.random() * 4; // degrees
  private pitch = this.base;
  private velocity = 0;
  private thresholdDeg = 15;
  private holdMs = 20000;
  private deviationSince: number | null = null;
  private alert: 0 | 1 = 0;
  private forcedEpisodeUntil = 0;
  private nextForcedEpisodeAt = Date.now() + randRange(8000, 20000);

  get state(): ConnectionState {
    return this._state;
  }

  get connectedDevice(): PairedDeviceInfo | null {
    return this._state === 'connected' ? DEMO_DEVICE : null;
  }

  on<K extends keyof DataSourceEvents>(
    event: K,
    listener: (payload: DataSourceEvents[K]) => void,
  ): () => void {
    return this.emitter.on(event, listener);
  }

  private setState(state: ConnectionState) {
    this._state = state;
    this.emitter.emit('connectionState', state);
  }

  private emitMessage(message: InboundMessage) {
    this.emitter.emit('message', message);
  }

  async connect(_address: string): Promise<boolean> {
    this.setState('connecting');
    await delay(600 + Math.random() * 500);
    this.setState('connected');
    this.startLoop();
    return true;
  }

  async disconnect(): Promise<void> {
    this.stopLoop();
    this.setState('disconnected');
  }

  async sendCommand(command: string): Promise<boolean> {
    if (this._state !== 'connected') return false;
    if (command === 'CAL') {
      this.emitMessage({ t: 'info', msg: 'calibrating' });
      await delay(7000);
      this.base = this.pitch;
      this.deviationSince = null;
      this.alert = 0;
      this.emitMessage({ t: 'info', msg: 'calibrated', base: round2(this.base) });
      return true;
    }
    if (command === 'BEEP') {
      // no-op in demo; real buzzer has no audible analogue here
      return true;
    }
    if (command === 'PING') {
      await delay(150);
      this.emitMessage({ t: 'info', msg: 'pong' });
      return true;
    }
    if (command.startsWith('SET_THRESH:')) {
      const deg = Number(command.split(':')[1]);
      if (Number.isFinite(deg)) this.thresholdDeg = deg;
      return true;
    }
    if (command.startsWith('SET_HOLD:')) {
      const ms = Number(command.split(':')[1]);
      if (Number.isFinite(ms)) this.holdMs = ms;
      return true;
    }
    return false;
  }

  private startLoop() {
    this.stopLoop();
    this.timer = setInterval(() => this.tick(), SAMPLE_INTERVAL_MS);
  }

  private stopLoop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick() {
    const now = Date.now();

    // Random-walk the pitch angle around the baseline, with occasional
    // deliberate "slouch episodes" so alerts actually fire in the demo.
    const forcingEpisode = now < this.forcedEpisodeUntil;
    if (!forcingEpisode && now >= this.nextForcedEpisodeAt) {
      this.forcedEpisodeUntil = now + randRange(22000, 32000);
      this.nextForcedEpisodeAt = this.forcedEpisodeUntil + randRange(15000, 45000);
    }

    const pull = forcingEpisode ? this.base + this.thresholdDeg * 1.6 : this.base;
    const springForce = (pull - this.pitch) * (forcingEpisode ? 0.02 : 0.01);
    this.velocity = clamp(this.velocity + springForce + randRange(-0.35, 0.35), -1.5, 1.5);
    this.pitch = clamp(this.pitch + this.velocity, this.base - 25, this.base + 35);

    const dev = Math.abs(this.pitch - this.base);
    if (dev > this.thresholdDeg) {
      if (this.deviationSince == null) this.deviationSince = now;
      if (now - this.deviationSince >= this.holdMs) {
        this.alert = 1;
      }
    } else {
      this.deviationSince = null;
      this.alert = 0;
    }

    const readings = [
      { id: 1, valid: true, pitch: round2(this.pitch), roll: 1.4, deviation: round2(dev) },
      { id: 2, valid: true, pitch: round2(this.pitch * 0.65), roll: 0.9, deviation: round2(dev * 0.65) },
      { id: 3, valid: true, pitch: round2(this.pitch * 0.4), roll: 0.4, deviation: round2(dev * 0.4) },
    ];
    const message: DataMessage = {
      t: 'data',
      status: this.alert ? 'ALERT' : this.deviationSince == null ? 'OK' : 'DEVIATING',
      calibrated: true,
      badForSec: this.deviationSince == null ? 0 : Math.floor((now - this.deviationSince) / 1000),
      sensors: readings,
      pitch: round2(this.pitch),
      base: round2(this.base),
      dev: round2(dev),
      alert: this.alert,
      batt: -1,
      ms: now,
    };
    this.emitMessage(message);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export const demoSimulator = new DemoSimulator();
