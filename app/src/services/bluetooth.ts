import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import RNBluetoothClassic, {
  BluetoothDevice,
  BluetoothEventSubscription,
} from 'react-native-bluetooth-classic';
import { parseInboundLine } from '../types/protocol';
import { LineBuffer } from '../utils/LineBuffer';
import { MiniEmitter } from '../utils/MiniEmitter';
import {
  ConnectionState as BtConnectionState,
  DataSourceEvents as BluetoothServiceEvents,
  PairedDeviceInfo,
  PostureDataSource,
} from './dataSource';

export type { BtConnectionState, PairedDeviceInfo };

/**
 * Thin wrapper around react-native-bluetooth-classic that:
 *  - requests the correct Android runtime permissions (12+ vs legacy)
 *  - lists already-paired (bonded) Classic devices
 *  - connects/disconnects, exposing a simple connection-state stream
 *  - line-buffers incoming serial data and parses each complete line as
 *    JSON per the StraightUp wire protocol, guarding every parse so a
 *    malformed line can never crash the app
 *  - sends plain-text commands (CAL / BEEP / SET_THRESH:.. / SET_HOLD:.. / PING)
 *
 * Screens/contexts should talk to this via the exported `bluetoothService`
 * singleton rather than importing react-native-bluetooth-classic directly,
 * so the demo simulator can present an identical surface.
 */
class BluetoothService implements PostureDataSource {
  private emitter = new MiniEmitter<BluetoothServiceEvents>();
  private device: BluetoothDevice | null = null;
  private dataSubscription: BluetoothEventSubscription | null = null;
  private lineBuffer = new LineBuffer();
  private _state: BtConnectionState = 'disconnected';

  get state(): BtConnectionState {
    return this._state;
  }

  get connectedDevice(): PairedDeviceInfo | null {
    if (!this.device) return null;
    return {
      id: this.device.id ?? this.device.address,
      name: this.device.name ?? 'HC-06',
      address: this.device.address,
    };
  }

  on<K extends keyof BluetoothServiceEvents>(
    event: K,
    listener: (payload: BluetoothServiceEvents[K]) => void,
  ): () => void {
    return this.emitter.on(event, listener);
  }

  private setState(state: BtConnectionState) {
    this._state = state;
    this.emitter.emit('connectionState', state);
  }

  /**
   * Requests the Android runtime permissions Classic Bluetooth needs.
   * Android 12+ (API 31+) needs BLUETOOTH_CONNECT / BLUETOOTH_SCAN.
   * Older Android needs ACCESS_FINE_LOCATION for scanning/bonded lookups.
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    try {
      const apiLevel = Platform.Version as number;
      if (apiLevel >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        ]);
        return Object.values(granted).every(
          v => v === PermissionsAndroid.RESULTS.GRANTED,
        );
      }
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      console.warn('[bluetooth] permission request failed', e);
      return false;
    }
  }

  async isBluetoothEnabled(): Promise<boolean> {
    try {
      return await RNBluetoothClassic.isBluetoothEnabled();
    } catch (e) {
      console.warn('[bluetooth] isBluetoothEnabled failed', e);
      return false;
    }
  }

  async requestEnableBluetooth(): Promise<boolean> {
    try {
      return await RNBluetoothClassic.requestBluetoothEnabled();
    } catch (e) {
      console.warn('[bluetooth] requestBluetoothEnabled failed', e);
      return false;
    }
  }

  /** Lists Classic Bluetooth devices already paired at the OS level. */
  async listPairedDevices(): Promise<PairedDeviceInfo[]> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return [];
    try {
      const devices = await RNBluetoothClassic.getBondedDevices();
      return devices.map(d => ({
        id: d.id ?? d.address,
        name: d.name ?? d.address,
        address: d.address,
      }));
    } catch (e) {
      console.warn('[bluetooth] getBondedDevices failed', e);
      return [];
    }
  }

  /** Connect to a paired device by address (or reuse an existing connection to it). */
  async connect(address: string): Promise<boolean> {
    if (this.device && this.device.address === address && this._state === 'connected') {
      return true;
    }
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      this.setState('error');
      return false;
    }
    this.setState('connecting');
    try {
      let device: BluetoothDevice;
      const already = await RNBluetoothClassic.getConnectedDevices().catch(() => []);
      const existing = already.find(d => d.address === address);
      if (existing) {
        device = existing;
      } else {
        device = await RNBluetoothClassic.connectToDevice(address, {
          delimiter: '\n',
        });
      }
      this.attachDevice(device);
      this.setState('connected');
      return true;
    } catch (e) {
      console.warn('[bluetooth] connect failed', e);
      this.setState('error');
      return false;
    }
  }

  private attachDevice(device: BluetoothDevice) {
    this.detachDevice();
    this.device = device;
    this.lineBuffer.reset();
    this.dataSubscription = device.onDataReceived(event => {
      this.handleIncoming(event?.data ?? '');
    });
  }

  private handleIncoming(chunk: string) {
    const lines = this.lineBuffer.push(chunk);
    for (const line of lines) {
      this.emitter.emit('rawLine', line);
      const message = parseInboundLine(line);
      if (message) {
        this.emitter.emit('message', message);
      }
      // malformed lines are silently ignored, per protocol contract
    }
  }

  private detachDevice() {
    if (this.dataSubscription) {
      this.dataSubscription.remove();
      this.dataSubscription = null;
    }
    this.device = null;
  }

  async disconnect(): Promise<void> {
    try {
      if (this.device) {
        await this.device.disconnect();
      }
    } catch (e) {
      console.warn('[bluetooth] disconnect failed', e);
    } finally {
      this.detachDevice();
      this.setState('disconnected');
    }
  }

  /** Send a raw plain-text command line (CAL / BEEP / SET_THRESH:.. / SET_HOLD:.. / PING). */
  async sendCommand(command: string): Promise<boolean> {
    if (!this.device) return false;
    try {
      await this.device.write(`${command}\n`);
      return true;
    } catch (e) {
      console.warn('[bluetooth] write failed', e);
      return false;
    }
  }

  /** True if the native Bluetooth Classic module is actually linked (it won't be until a native build exists). */
  isNativeModuleAvailable(): boolean {
    return Boolean(NativeModules.RNBluetoothClassic);
  }
}

export const bluetoothService = new BluetoothService();
