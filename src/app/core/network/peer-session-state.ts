export enum PeerSessionGrade {
  UNSPECIFIED,
  LOW,
  MIDDLE,
  HIGH,
}

export interface PeerSessionState {
  readonly grade: PeerSessionGrade;
  /** Round-trip time in ms. */
  readonly ping: number;
  /** [0.0, 1.0]; values below 1.0 indicate possible disconnect. */
  readonly health: number;
  /** [0.0, 1.0]; higher is faster. */
  readonly speed: number;
  readonly description: string;
}

export interface MutablePeerSessionState extends PeerSessionState {
  grade: PeerSessionGrade;
  ping: number;
  health: number;
  speed: number;
  description: string;
}
