import { BaseFilter } from './base-filter.js';
import type { FilterUpdate } from './base-filter.js';

/**
 * A filter that tracks all results ever recorded.
 */
export abstract class BaseFilterWithHistory<
  Result = unknown,
> extends BaseFilter<Result> {
  allResults: Result[] = [];

  override async update(_args: FilterUpdate): Promise<void> {
    throw new Error('BaseFilterWithHistory - no update method specified');
  }

  override addResults(newResults: Result[]): void {
    this.allResults = this.allResults.concat(newResults);
    super.addResults(newResults);
  }

  override addInitialResults(newResults: Result[]): void {
    this.allResults = this.allResults.concat(newResults);
    super.addInitialResults(newResults);
  }

  getAllResults(): Result[] {
    return this.allResults;
  }
}
