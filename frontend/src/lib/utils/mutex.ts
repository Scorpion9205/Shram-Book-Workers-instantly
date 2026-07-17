/**
 * Minimal mutex to serialize the token-refresh flow so that concurrent
 * 401 responses don't trigger multiple simultaneous refresh calls.
 */
export class Mutex {
  private locked = false;
  private waiters: (() => void)[] = [];

  isLocked() {
    return this.locked;
  }

  async acquire(): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      return () => this.release();
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.locked = true;
    return () => this.release();
  }

  private release() {
    this.locked = false;
    const next = this.waiters.shift();
    if (next) next();
  }

  async waitForUnlock(): Promise<void> {
    if (!this.locked) return;
    await new Promise<void>((resolve) => {
      const check = () => {
        if (!this.locked) resolve();
        else setTimeout(check, 20);
      };
      check();
    });
  }
}
