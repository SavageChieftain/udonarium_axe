export class ChatInputHistory {
  private readonly lines: string[] = [];
  private cursor = -1;
  static readonly MAX = 1000;

  push(text: string): void {
    if (this.lines.length >= ChatInputHistory.MAX) this.lines.shift();
    this.lines.push(text);
    this.cursor = -1;
  }

  navigate(direction: number): string {
    if (direction < 0 && this.cursor < 0) {
      this.cursor = this.lines.length - 1;
    } else if (direction > 0 && this.cursor >= this.lines.length - 1) {
      this.cursor = -1;
    } else {
      this.cursor += direction;
    }
    return this.cursor < 0 ? '' : this.lines[this.cursor];
  }
}
