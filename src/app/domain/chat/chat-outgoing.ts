import GameSystemClass from 'bcdice/lib/game_system';

export interface ChatOutgoing {
  text: string;
  gameSystem: GameSystemClass;
  sendFrom: string;
  sendTo: string;
  portraitIndex: number;
  messColor: string;
  messBubbleLight?: string;
  messBubbleDark?: string;
  replyTo: string;
  quoteOf: string;
}
