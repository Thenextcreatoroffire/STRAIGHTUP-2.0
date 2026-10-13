import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Vibration } from 'react-native';
import { bluetoothService } from '../services/bluetooth';
import { demoSimulator } from '../services/demoSimulator';
import { ConnectionState, PostureDataSource } from '../services/dataSource';
import { ProtocolCommands, InboundMessage, SensorReading, PostureStatus } from '../types/protocol';
import { AppSettings, SessionSamplePoint, SessionSummary, UserProfile } from '../types/domain';
import { DEFAULT_SETTINGS, getSettings, saveSettings, sensitivityToThresholdDeg } from '../storage/settings';
import { DEFAULT_PROFILE, getProfile, saveProfile } from '../storage/profile';
import { addSession } from '../storage/sessions';
import { generateId } from '../utils/id';

export interface LivePosture {
  sensors: SensorReading[];
  status: PostureStatus;
  badForSec: number;
  pitch: number;
  base: number;
  dev: number;
  alert: 0 | 1;
  batt: number; // -1 = unknown
  updatedAt: number | null;
}

const INITIAL_LIVE: LivePosture = {
  sensors: [], status: 'CALIBRATING', badForSec: 0,
  pitch: 0,
  base: 0,
  dev: 0,
  alert: 0,
  batt: -1,
  updatedAt: null,
};

interface StartMonitoringResult {
  ok: boolean;
  reason?: 'no_device' | 'connect_failed';
}

export interface PostureContextValue {
  // connection
  connectionState: ConnectionState;
  connectedDeviceName: string | null;
  connectedDeviceAddress: string | null;
  lastSyncAt: number | null;
  demoMode: boolean;
  setDemoMode: (value: boolean) => Promise<void>;
  connectToDevice: (address: string, name: string) => Promise<boolean>;
  disconnectDevice: () => Promise<void>;

  // live posture
  live: LivePosture;
  calibrating: boolean;
  lastError: string | null;

  // monitoring session
  isMonitoring: boolean;
  sessionStartedAt: number | null;
  sessionElapsedMs: number;
  sessionCorrectnessPct: number;
  sessionAlertCount: number;
  lastAlertAt: number | null;
  startMonitoring: () => Promise<StartMonitoringResult>;
  stopMonitoring: () => Promise<void>;

  // commands
  calibrate: () => Promise<void>;
  testBuzzer: () => Promise<void>;

  // settings & profile
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  profile: UserProfile;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
}

const PostureContext = createContext<PostureContextValue | null>(null);

const SAMPLE_PREVIEW_TARGET_POINTS = 60;

export const PostureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
  const [connectedDeviceAddress, setConnectedDeviceAddress] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [calibrating, setCalibrating] = useState(false);

  const [live, setLive] = useState<LivePosture>(INITIAL_LIVE);

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [sessionElapsedMs, setSessionElapsedMs] = useState(0);
  const [sessionCorrectnessPct, setSessionCorrectnessPct] = useState(100);
  const [sessionAlertCount, setSessionAlertCount] = useState(0);
  const [lastAlertAt, setLastAlertAt] = useState<number | null>(null);

  // Refs for values that need to be read inside event callbacks without
  // forcing a re-subscription (avoids stale-closure bugs).
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const isMonitoringRef = useRef(isMonitoring);
  isMonitoringRef.current = isMonitoring;
  const prevAlertRef = useRef<0 | 1>(0);

  // In-memory session accumulators (not React state - updated on every
  // sample at 5Hz, flushed into React state at a lower rate for the UI).
  const sessionAccum = useRef({
    sampleCount: 0,
    okCount: 0,
    devSum: 0,
    alertEpisodes: 0,
    samples: [] as SessionSamplePoint[],
    lastSampleStoredAt: 0,
  });

  const repeatAlertTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeSourceRef = useRef<PostureDataSource>(
    settings.demoMode ? demoSimulator : bluetoothService,
  );
  // Bumped every time activeSourceRef.current is swapped, so the message-
  // subscription effect (which reads the ref, not this counter) knows to
  // re-run and attach to the new source. Using a ref for the source itself
  // (instead of state) avoids re-creating it on every unrelated render.
  const [sourceEpoch, setSourceEpoch] = useState(0);
  const switchActiveSource = useCallback((next: PostureDataSource) => {
    activeSourceRef.current = next;
    setSourceEpoch(e => e + 1);
  }, []);

  // ---- load persisted settings/profile once ----
  useEffect(() => {
    (async () => {
      const [s, p] = await Promise.all([getSettings(), getProfile()]);
      setSettings(s);
      setProfile(p);
      switchActiveSource(s.demoMode ? demoSimulator : bluetoothService);
      setSettingsLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearRepeatAlertTimer = useCallback(() => {
    if (repeatAlertTimer.current) {
      clearInterval(repeatAlertTimer.current);
      repeatAlertTimer.current = null;
    }
  }, []);

  const triggerAlertFeedback = useCallback(() => {
    if (settingsRef.current.vibrationEnabled) {
      Vibration.vibrate(400);
    }
    // The physical buzzer is operated by Arduino itself; avoid a second
    // BEEP command on every alert, which would duplicate hardware sounds.
  }, []);

  const handleMessage = useCallback(
    (message: InboundMessage) => {
      setLastSyncAt(Date.now());
      if (message.t === 'error') {
        setLastError(message.msg);
        return;
      }
      if (message.t === 'info') {
        if (message.msg === 'calibrating') {
          setCalibrating(true);
        } else if (message.msg === 'calibrated') {
          setCalibrating(false);
          setLive(prev => ({ ...prev, base: message.base ?? prev.base }));
        }
        return;
      }
      // data message
      setCalibrating(message.status === 'CALIBRATING');
      setLastError(message.status === 'SENSOR_ERROR' ? 'Ошибка одного из датчиков' : null);
      setLive({
        sensors: message.sensors ?? [],
        status: message.status ?? (message.alert ? 'ALERT' : 'OK'),
        badForSec: message.badForSec ?? 0,
        pitch: message.pitch,
        base: message.base,
        dev: message.dev,
        alert: message.alert,
        batt: message.batt,
        updatedAt: Date.now(),
      });

      if (message.alert === 1 && prevAlertRef.current === 0) {
        setLastAlertAt(Date.now());
        triggerAlertFeedback();
        clearRepeatAlertTimer();
        repeatAlertTimer.current = setInterval(() => {
          triggerAlertFeedback();
        }, settingsRef.current.alertIntervalMs);
      } else if (message.alert === 0 && prevAlertRef.current === 1) {
        clearRepeatAlertTimer();
      }
      prevAlertRef.current = message.alert;

      if (isMonitoringRef.current) {
        const acc = sessionAccum.current;
        acc.sampleCount += 1;
        if (message.alert === 0) acc.okCount += 1;
        acc.devSum += Math.abs(message.dev);
        const now = Date.now();
        if (now - acc.lastSampleStoredAt >= 1500 || acc.samples.length === 0) {
          acc.lastSampleStoredAt = now;
          const startedAt = sessionStartedAtRef.current ?? now;
          acc.samples.push({
            offsetMs: now - startedAt,
            pitch: message.pitch,
            alert: message.alert,
          });
          if (acc.samples.length > SAMPLE_PREVIEW_TARGET_POINTS * 2) {
            // downsample in place: keep every other point
            acc.samples = acc.samples.filter((_, i) => i % 2 === 0);
          }
        }
        setSessionCorrectnessPct(acc.sampleCount > 0 ? (acc.okCount / acc.sampleCount) * 100 : 100);
      }
    },
    [clearRepeatAlertTimer, triggerAlertFeedback],
  );

  // track alert episodes (0->1 transitions) into the session accumulator separately,
  // since handleMessage above already mutates prevAlertRef before we can compare there
  const prevAlertForEpisodeRef = useRef<0 | 1>(0);
  useEffect(() => {
    if (!isMonitoring) return;
    if (live.alert === 1 && prevAlertForEpisodeRef.current === 0) {
      sessionAccum.current.alertEpisodes += 1;
      setSessionAlertCount(sessionAccum.current.alertEpisodes);
    }
    prevAlertForEpisodeRef.current = live.alert;
  }, [live.alert, isMonitoring]);

  const sessionStartedAtRef = useRef<number | null>(null);
  sessionStartedAtRef.current = sessionStartedAt;

  // ---- subscribe to the active data source's messages/connection state ----
  useEffect(() => {
    const source = activeSourceRef.current;
    const offMessage = source.on('message', handleMessage);
    const offState = source.on('connectionState', state => {
      setConnectionState(state);
      if (state === 'disconnected' || state === 'error') {
        setConnectedDeviceName(null);
        setConnectedDeviceAddress(null);
      }
    });
    return () => {
      offMessage();
      offState();
    };
    // Re-subscribe whenever the active source is swapped (sourceEpoch bump).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceEpoch, handleMessage]);

  // ---- session elapsed-time ticker ----
  useEffect(() => {
    if (isMonitoring && sessionStartedAt != null) {
      elapsedTimer.current = setInterval(() => {
        setSessionElapsedMs(Date.now() - sessionStartedAt);
      }, 1000);
      return () => {
        if (elapsedTimer.current) clearInterval(elapsedTimer.current);
      };
    }
    return undefined;
  }, [isMonitoring, sessionStartedAt]);

  const setDemoMode = useCallback(
    async (value: boolean) => {
      if (isMonitoringRef.current || settingsRef.current.demoMode === value) return;
      const next = { ...settingsRef.current, demoMode: value };
      setSettings(next);
      await saveSettings(next);
      // switch the active data source; disconnect the old one first
      const previous = activeSourceRef.current;
      await previous.disconnect().catch(() => undefined);
      switchActiveSource(value ? demoSimulator : bluetoothService);
      setLive(INITIAL_LIVE);
      setLastSyncAt(null);
      setLastError(null);
      setCalibrating(false);
      prevAlertRef.current = 0;
      setConnectionState('disconnected');
      setConnectedDeviceName(null);
      setConnectedDeviceAddress(null);
    },
    [switchActiveSource],
  );

  const connectToDevice = useCallback(async (address: string, name: string) => {
    const source = activeSourceRef.current;
    const ok = await source.connect(address);
    if (ok) {
      setConnectedDeviceAddress(address);
      setConnectedDeviceName(name);
      const next = { ...settingsRef.current, lastDeviceAddress: address, lastDeviceName: name };
      setSettings(next);
      await saveSettings(next);
    }
    return ok;
  }, []);

  const disconnectDevice = useCallback(async () => {
    await activeSourceRef.current.disconnect();
    setConnectedDeviceAddress(null);
    setConnectedDeviceName(null);
  }, []);

  const waitForCalibration = useCallback((timeoutMs = 11000): Promise<void> => {
    return new Promise(resolve => {
      let done = false;
      const off = activeSourceRef.current.on('message', m => {
        if ((m.t === 'info' && m.msg === 'calibrated') ||
            (m.t === 'data' && m.calibrated && m.status !== 'CALIBRATING')) {
          if (!done) {
            done = true;
            off();
            resolve();
          }
        }
      });
      setTimeout(() => {
        if (!done) {
          done = true;
          off();
          resolve();
        }
      }, timeoutMs);
    });
  }, []);

  const calibrate = useCallback(async () => {
    setCalibrating(true);
    const calibrated = waitForCalibration();
    await activeSourceRef.current.sendCommand(ProtocolCommands.calibrate());
    await calibrated;
    setCalibrating(false);
  }, [waitForCalibration]);

  const testBuzzer = useCallback(async () => {
    await activeSourceRef.current.sendCommand(ProtocolCommands.beep());
  }, []);

  const startMonitoring = useCallback(async (): Promise<StartMonitoringResult> => {
    const source = activeSourceRef.current;
    if (source.state !== 'connected') {
      const demo = settingsRef.current.demoMode;
      const address = demo
        ? 'demo'
        : settingsRef.current.lastDeviceAddress;
      const name = demo ? 'StraightUp Demo' : settingsRef.current.lastDeviceName ?? 'Устройство';
      if (!address) {
        return { ok: false, reason: 'no_device' };
      }
      const ok = await connectToDevice(address, name);
      if (!ok) return { ok: false, reason: 'connect_failed' };
    }

    // reset accumulators & calibrate
    sessionAccum.current = {
      sampleCount: 0,
      okCount: 0,
      devSum: 0,
      alertEpisodes: 0,
      samples: [],
      lastSampleStoredAt: 0,
    };
    prevAlertForEpisodeRef.current = 0;
    prevAlertRef.current = 0;
    setSessionAlertCount(0);
    setSessionCorrectnessPct(100);
    setLastAlertAt(null);

    setCalibrating(true);
    const calibrated = waitForCalibration();
    await activeSourceRef.current.sendCommand(ProtocolCommands.calibrate());
    await calibrated;
    setCalibrating(false);

    // apply current settings to the (possibly freshly connected) device
    const thresholdDeg = sensitivityToThresholdDeg(settingsRef.current.sensitivity);
    await activeSourceRef.current.sendCommand(ProtocolCommands.setThreshold(thresholdDeg));
    await activeSourceRef.current.sendCommand(ProtocolCommands.setHold(20000));

    const now = Date.now();
    setSessionStartedAt(now);
    setSessionElapsedMs(0);
    setIsMonitoring(true);
    return { ok: true };
  }, [connectToDevice, waitForCalibration]);

  const stopMonitoring = useCallback(async () => {
    if (!isMonitoringRef.current || sessionStartedAtRef.current == null) {
      setIsMonitoring(false);
      return;
    }
    const acc = sessionAccum.current;
    const startedAt = sessionStartedAtRef.current;
    const endedAt = Date.now();
    const summary: SessionSummary = {
      id: generateId('session'),
      startedAt,
      endedAt,
      sampleCount: acc.sampleCount,
      correctnessPct: acc.sampleCount > 0 ? (acc.okCount / acc.sampleCount) * 100 : 100,
      avgDeviation: acc.sampleCount > 0 ? acc.devSum / acc.sampleCount : 0,
      alertEpisodes: acc.alertEpisodes,
      demo: settingsRef.current.demoMode,
      samples: acc.samples,
    };
    setIsMonitoring(false);
    setSessionStartedAt(null);
    clearRepeatAlertTimer();
    if (summary.sampleCount > 0) {
      await addSession(summary);
    }
  }, [clearRepeatAlertTimer]);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    setSettings(next);
    await saveSettings(next);
    if ('sensitivity' in patch && activeSourceRef.current.state === 'connected') {
      const deg = sensitivityToThresholdDeg(next.sensitivity);
      await activeSourceRef.current.sendCommand(ProtocolCommands.setThreshold(deg));
    }
  }, []);

  const updateProfile = useCallback(async (patch: Partial<UserProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...patch };
      saveProfile(next).catch(() => undefined);
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      clearRepeatAlertTimer();
      if (elapsedTimer.current) clearInterval(elapsedTimer.current);
    };
  }, [clearRepeatAlertTimer]);

  const value = useMemo<PostureContextValue>(
    () => ({
      connectionState,
      connectedDeviceName,
      connectedDeviceAddress,
      lastSyncAt,
      demoMode: settings.demoMode,
      setDemoMode,
      connectToDevice,
      disconnectDevice,
      live,
      calibrating,
      lastError,
      isMonitoring,
      sessionStartedAt,
      sessionElapsedMs,
      sessionCorrectnessPct,
      sessionAlertCount,
      lastAlertAt,
      startMonitoring,
      stopMonitoring,
      calibrate,
      testBuzzer,
      settings,
      updateSettings,
      profile,
      updateProfile,
    }),
    [
      connectionState,
      connectedDeviceName,
      connectedDeviceAddress,
      lastSyncAt,
      settings,
      setDemoMode,
      connectToDevice,
      disconnectDevice,
      live,
      calibrating,
      lastError,
      isMonitoring,
      sessionStartedAt,
      sessionElapsedMs,
      sessionCorrectnessPct,
      sessionAlertCount,
      lastAlertAt,
      startMonitoring,
      stopMonitoring,
      calibrate,
      testBuzzer,
      updateSettings,
      profile,
      updateProfile,
    ],
  );

  if (!settingsLoaded) return null;

  return <PostureContext.Provider value={value}>{children}</PostureContext.Provider>;
};

export function usePosture(): PostureContextValue {
  const ctx = useContext(PostureContext);
  if (!ctx) throw new Error('usePosture must be used within a PostureProvider');
  return ctx;
}
