import type { HeritageRecord, Vec3Tuple } from './heritage-data';

export interface BoundsTuple {
  min: Vec3Tuple;
  max: Vec3Tuple;
}

export interface NormalizationTransform {
  scale: number;
  translation: Vec3Tuple;
}

export function computeNormalizationTransform(
  bounds: BoundsTuple,
  targetLongestSide = 3.4,
  groundY = -0.4,
  groundGap = 0.02,
): NormalizationTransform {
  const size = bounds.max.map(
    (value, index) => value - bounds.min[index]!,
  ) as unknown as Vec3Tuple;
  const longestSide = Math.max(...size);

  if (!Number.isFinite(longestSide) || longestSide <= 0) {
    throw new Error('The model has invalid spatial bounds.');
  }

  const scale = targetLongestSide / longestSide;
  const scaledMin = bounds.min.map((value) => value * scale) as unknown as Vec3Tuple;
  const scaledMax = bounds.max.map((value) => value * scale) as unknown as Vec3Tuple;
  const centre = scaledMin.map(
    (value, index) => (value + scaledMax[index]!) * 0.5,
  ) as unknown as Vec3Tuple;

  return {
    scale,
    translation: [-centre[0], groundY - scaledMin[1] + groundGap, -centre[2]],
  };
}

export function parseAnnotationHash(
  hash: string,
  validIds: ReadonlySet<string>,
): string | null {
  const match = /^#annotation-(a\d+)$/.exec(hash);
  const id = match?.[1];
  return id && validIds.has(id) ? id : null;
}

export function annotationHash(id: string): string {
  return `#annotation-${id}`;
}

export function validateHeritageRecord(record: HeritageRecord): readonly string[] {
  const issues: string[] = [];
  const sourceIds = new Set(record.sources.map((source) => source.id));
  const annotationIds = new Set<string>();

  for (const annotation of record.annotations) {
    if (annotationIds.has(annotation.id)) {
      issues.push(`Duplicate annotation id: ${annotation.id}`);
    }
    annotationIds.add(annotation.id);

    const vectors = [
      annotation.anchor.displayPosition,
      annotation.camera.eye,
      annotation.camera.target,
      ...(annotation.anchor.sourcePosition ? [annotation.anchor.sourcePosition] : []),
    ];

    if (
      vectors.some(
        (vector) =>
          vector.length !== 3 || vector.some((value) => !Number.isFinite(value)),
      )
    ) {
      issues.push(`Annotation ${annotation.id} contains an invalid vector.`);
    }

    for (const sourceId of annotation.sources) {
      if (!sourceIds.has(sourceId)) {
        issues.push(`Annotation ${annotation.id} refers to unknown source ${sourceId}.`);
      }
    }
  }

  return issues;
}
