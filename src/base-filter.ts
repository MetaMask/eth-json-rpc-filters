import SafeEventEmitter from '@metamask/safe-event-emitter';

export type FilterType = 'block' | 'log' | 'tx';

export type FilterUpdate = {
  oldBlock?: string | null;
  newBlock: string;
};

export abstract class BaseFilter<Result = unknown> extends SafeEventEmitter {
  abstract readonly type: FilterType;

  // Assigned when the filter is installed by the filter middleware.
  id?: number;

  idHex?: string;

  updates: Result[] = [];

  async initialize(_args: { currentBlock: string }): Promise<void> {
    // Nothing to initialize by default.
  }

  async update(_args: FilterUpdate): Promise<void> {
    throw new Error('BaseFilter - no update method specified');
  }

  addResults(newResults: Result[]): void {
    this.updates = this.updates.concat(newResults);
    newResults.forEach((result) => this.emit('update', result));
  }

  addInitialResults(_newResults: Result[]): void {
    // Initial results are ignored by default.
  }

  getChangesAndClear(): Result[] {
    const { updates } = this;
    this.updates = [];
    return updates;
  }
}
