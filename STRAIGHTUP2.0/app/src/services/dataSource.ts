import { InboundMessage } from '../types/protocol';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface PairedDeviceInfo {
  id: string;
  name: string;
  address: string;
}

export interface DataSourceEvents {
  message: InboundMessage;
  rawLine: string;
  connectionState: ConnectionState;
  deviceDisconnected: void;
}

/**
 * Common surface implemented by both the real Bluetooth service and the
 * demo simulator, so PostureContext (and every screen) can talk to
 * "whatever is currently feeding data" without caring which one it is.
 */
export interface PostureDataSource {
  readonly state: ConnectionState;
  readonly connectedDevice: PairedDeviceInfo | null;
  on<K extends keyof DataSourceEvents>(
    event: K,
    listener: (payload: DataSourceEvents[K]) => void,
  ): () => void;
  connect(address: string): Promise<boolean>;
  disconnect(): Promise<void>;
  sendCommand(command: string): Promise<boolean>;
}
