import { BaselineMetricSnapshot } from './types';

export function percentile(sortedValues: number[], percentileValue: number): number {
  if (sortedValues.length === 1) {
    return sortedValues[0];
  }

  const index = (sortedValues.length - 1) * percentileValue;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const weight = index - lowerIndex;

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
}

export function buildMetricSnapshot(
  values: number[],
  lowerPercentile: number
): BaselineMetricSnapshot | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const sorted = [...values].sort((left, right) => left - right);
  return {
    median: percentile(sorted, 0.5),
    low: percentile(sorted, lowerPercentile / 100),
    high: percentile(sorted, (100 - lowerPercentile) / 100),
    sampleSize: sorted.length,
  };
}
