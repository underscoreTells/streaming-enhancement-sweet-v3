export type FeatureData =
  | { current: number }
  | { total: number }
  | { value: number; currency: string; normalizedMicros?: number }
  | { count: number; tier?: number }
  | object;
