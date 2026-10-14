/**
 * Wire protocol types for the StraightUp Arduino posture device.
 *
 * Transport: Bluetooth Classic SPP (HC-06), 9600 baud.
 * Every message is a single line of JSON terminated by '\n'.
 */

/** Periodic sensor sample, sent by the Arduino every ~1 second. */
export interface SensorReading {
  id: number;
  valid: boolean;
  pitch: number;
  roll: number;
  deviation: number;
}

export type PostureStatus = 'CALIBRATING' | 'OK' | 'DEVIATING' | 'ALERT' | 'SENSOR_ERROR';

export interface DataMessage {
  t: 'data';
  /** Three-sensor StraightUp v2 payload (optional for legacy/demo compatibility). */
  sensors?: SensorReading[];
  status?: PostureStatus;
  badForSec?: number;
  calibrated?: boolean;
  /** Current tilt angle in degrees. */
  pitch: number;
  /** Calibration baseline angle in degrees. */
  base: number;
  /** abs(pitch - base) */
  dev: number;
  /** 0 = ok, 1 = bad posture confirmed (deviation held past hold-time). */
  alert: 0 | 1;
  /** Battery percent 0-100, or -1 when unknown (no battery sensor wired). */
  batt: number;
  /** Arduino millis() timestamp, for latency debugging only - not shown in UI. */
  ms: number;
}

/** Informational message from the Arduino. */
export interface InfoMessage {
  t: 'info';
  msg: 'calibrating' | 'calibrated' | 'pong' | string;
  /** Present only on the "calibrated" message. */
  base?: number;
}

/** Error message from the Arduino. */
export interface ErrorMessage {
  t: 'error';
  msg: 'mpu_not_found' | 'mpu_read_fail' | string;
}

export type InboundMessage = DataMessage | InfoMessage | ErrorMessage;

export function isDataMessage(m: InboundMessage): m is DataMessage {
  return m.t === 'data';
}

export function isInfoMessage(m: InboundMessage): m is InfoMessage {
  return m.t === 'info';
}

export function isErrorMessage(m: InboundMessage): m is ErrorMessage {
  return m.t === 'error';
}

/**
 * Runtime type guard + parser for a single line of text coming off the
 * serial connection. Returns null (and never throws) for anything that
 * isn't a well-formed InboundMessage, so callers can safely ignore noise.
 */
export function parseInboundLine(line: string): InboundMessage | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const obj = JSON.parse(trimmed);
    if (!obj || typeof obj !== 'object') return null;
    // New firmware sends one JSON object each second, with no "t" field.
    // Normalize to the old data event so statistics and navigation keep working.
    if (obj.type === 'posture' && Array.isArray(obj.sensors)) {
      const readings: SensorReading[] = [];
      for (const raw of obj.sensors) {
        if (!raw || ![1, 2, 3].includes(raw.id) ||
            typeof raw.valid !== 'boolean' ||
            typeof raw.pitch !== 'number' || !Number.isFinite(raw.pitch) ||
            typeof raw.roll !== 'number' || !Number.isFinite(raw.roll) ||
            typeof raw.deviation !== 'number' || !Number.isFinite(raw.deviation)) return null;
        readings.push({ id: raw.id, valid: raw.valid, pitch: raw.pitch, roll: raw.roll, deviation: raw.deviation });
      }
      if (readings.length !== 3 || new Set(readings.map(r => r.id)).size !== 3 ||
          typeof obj.status !== 'string' ||
          !['CALIBRATING', 'OK', 'DEVIATING', 'ALERT', 'SENSOR_ERROR'].includes(obj.status) ||
          typeof obj.alert !== 'boolean') return null;
      readings.sort((x, y) => x.id - y.id);
      const dev = readings.reduce((max, r) => r.valid ? Math.max(max, r.deviation) : max, 0);
      return {
        t: 'data', sensors: readings, status: obj.status,
        badForSec: typeof obj.badForSec === 'number' ? obj.badForSec : 0,
        calibrated: obj.calibrated === true,
        pitch: readings[0].pitch, base: 0, dev,
        alert: obj.alert ? 1 : 0, batt: -1, ms: Date.now(),
      };
    }
    if (obj.t === 'data') {
      if (
        typeof obj.pitch === 'number' &&
        typeof obj.base === 'number' &&
        typeof obj.dev === 'number' &&
        (obj.alert === 0 || obj.alert === 1) &&
        typeof obj.batt === 'number' &&
        typeof obj.ms === 'number'
      ) {
        return obj as DataMessage;
      }
      return null;
    }
    if (obj.t === 'info') {
      if (typeof obj.msg === 'string') return obj as InfoMessage;
      return null;
    }
    if (obj.t === 'error') {
      if (typeof obj.msg === 'string') return obj as ErrorMessage;
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Commands the phone can send to the Arduino. Plain text line + '\n', not JSON. */
export const ProtocolCommands = {
  calibrate: () => 'CAL',
  beep: () => 'BEEP',
  setThreshold: (deg: number) => `SET_THRESH:${Math.round(deg)}`,
  setHold: (ms: number) => `SET_HOLD:${Math.round(ms)}`,
  ping: () => 'PING',
} as const;
