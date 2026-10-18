import { describe, expect, it } from 'vitest';

import {
  annotationHash,
  computeNormalizationTransform,
  parseAnnotationHash,
  validateHeritageRecord,
} from './annotation-utils';
import { heritageRecord } from './heritage-data';

describe('heritage record', () => {
  it('has six unique, internally valid annotations', () => {
    expect(heritageRecord.annotations).toHaveLength(6);
    expect(new Set(heritageRecord.annotations.map(({ id }) => id)).size).toBe(6);
    expect(validateHeritageRecord(heritageRecord)).toEqual([]);
  });

  it('preserves source positions for the three Sketchfab placements', () => {
    const sourceDerived = heritageRecord.annotations.filter(
      ({ anchor }) => anchor.placementOrigin === 'sketchfab',
    );
    expect(sourceDerived.map(({ id }) => id)).toEqual(['a3', 'a4', 'a5']);
    expect(sourceDerived.every(({ anchor }) => anchor.sourcePosition !== undefined)).toBe(
      true,
    );
  });
});

describe('model normalization', () => {
  it('fits the longest side and places the scaled minimum on the ground gap', () => {
    const transform = computeNormalizationTransform({
      min: [-2, -1, -0.5],
      max: [3, 1, 1.5],
    });

    expect(transform.scale).toBeCloseTo(0.68);
    expect((3 - -2) * transform.scale).toBeCloseTo(3.4);
    expect(-1 * transform.scale + transform.translation[1]).toBeCloseTo(-0.38);
  });

  it('rejects empty bounds', () => {
    expect(() =>
      computeNormalizationTransform({ min: [0, 0, 0], max: [0, 0, 0] }),
    ).toThrow(/invalid spatial bounds/i);
  });
});

describe('annotation URLs', () => {
  const ids = new Set(['a1', 'a2', 'a3', 'a4', 'a5', 'a6']);

  it('builds and parses a valid deep link', () => {
    expect(annotationHash('a4')).toBe('#annotation-a4');
    expect(parseAnnotationHash('#annotation-a4', ids)).toBe('a4');
  });

  it('ignores unknown and unrelated hashes', () => {
    expect(parseAnnotationHash('#annotation-a7', ids)).toBeNull();
    expect(parseAnnotationHash('#about', ids)).toBeNull();
  });
});
