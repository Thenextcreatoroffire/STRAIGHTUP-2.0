/**
 * Buffers arbitrary chunks of text arriving from a serial/SPP connection
 * until complete '\n'-terminated lines are available. Data over Bluetooth
 * Classic SPP is not guaranteed to arrive chunked by line, so this must
 * tolerate: multiple lines in one chunk, a line split across chunks, and
 * stray '\r' characters.
 */
export class LineBuffer {
  private pending = '';

  /** Push a raw chunk of text; returns any complete lines it produced. */
  push(chunk: string): string[] {
    this.pending += chunk;
    const lines: string[] = [];
    let idx: number;
    // eslint-disable-next-line no-cond-assign
    while ((idx = this.pending.indexOf('\n')) >= 0) {
      const rawLine = this.pending.slice(0, idx);
      this.pending = this.pending.slice(idx + 1);
      const cleaned = rawLine.replace(/\r$/, '');
      if (cleaned.length > 0) lines.push(cleaned);
    }
    return lines;
  }

  reset(): void {
    this.pending = '';
  }
}
