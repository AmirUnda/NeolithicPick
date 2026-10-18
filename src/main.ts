import './styles.css';

import {
  annotationHash,
  parseAnnotationHash,
  validateHeritageRecord,
} from './annotation-utils';
import { heritageRecord } from './heritage-data';
import type { Annotation, Source } from './heritage-data';
import { HeritageViewer } from './viewer';
import type { ViewerState } from './viewer';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required element not found: ${selector}`);
  return element;
}

const canvasRoot = requireElement<HTMLDivElement>('#canvas-root');
const markerLayer = requireElement<HTMLDivElement>('#annotation-layer');
const statusElement = requireElement<HTMLDivElement>('#viewer-status');
const statusTextElement = requireElement<HTMLSpanElement>('#viewer-status-text');
const annotationList = requireElement<HTMLUListElement>('#annotation-list');
const detailRegion = requireElement<HTMLElement>('#annotation-detail');
const detailType = requireElement<HTMLParagraphElement>('#annotation-detail-type');
const detailTitle = requireElement<HTMLHeadingElement>('#annotation-detail-title');
const detailText = requireElement<HTMLParagraphElement>('#annotation-detail-text');
const detailEvidence = requireElement<HTMLParagraphElement>(
  '#annotation-detail-evidence',
);
const detailPlacement = requireElement<HTMLParagraphElement>(
  '#annotation-detail-placement',
);
const detailSources = requireElement<HTMLUListElement>('#annotation-detail-sources');
const detailCounter = requireElement<HTMLSpanElement>('#annotation-counter');
const metadataList = requireElement<HTMLDListElement>('#metadata-list');
const sourceList = requireElement<HTMLUListElement>('#source-list');
const previousButton = requireElement<HTMLButtonElement>('#annotation-previous');
const nextButton = requireElement<HTMLButtonElement>('#annotation-next');
const closeButton = requireElement<HTMLButtonElement>('#annotation-close');
const resetButton = requireElement<HTMLButtonElement>('#reset-view');

const annotationsById = new Map(
  heritageRecord.annotations.map((annotation) => [annotation.id, annotation]),
);
const validAnnotationIds = new Set(annotationsById.keys());
const sourcesById = new Map(heritageRecord.sources.map((source) => [source.id, source]));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const simulateModelError =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).has('simulate-model-error');
const validationIssues = validateHeritageRecord(heritageRecord);
let selectedAnnotationId: string | null = null;

function updateStatus(message: string, state: ViewerState): void {
  statusElement.dataset.state = state;
  statusTextElement.textContent = message;
}

function externalLink(source: Source): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = source.url;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = source.shortLabel;
  return link;
}

function renderMetadata(): void {
  const fragment = document.createDocumentFragment();
  for (const field of heritageRecord.metadata) {
    const wrapper = document.createElement('div');
    wrapper.dataset.status = field.status;
    const term = document.createElement('dt');
    term.textContent = field.label;
    const description = document.createElement('dd');
    description.textContent = field.value;
    wrapper.append(term, description);
    fragment.append(wrapper);
  }
  metadataList.replaceChildren(fragment);
}

function renderSourceList(): void {
  const fragment = document.createDocumentFragment();
  for (const source of heritageRecord.sources) {
    const item = document.createElement('li');
    const citation = document.createElement('p');
    citation.textContent = source.citation;
    item.append(externalLink(source), citation);
    fragment.append(item);
  }
  sourceList.replaceChildren(fragment);
}

function renderAnnotationList(): void {
  const fragment = document.createDocumentFragment();
  for (const annotation of heritageRecord.annotations) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'annotation-list-button';
    button.dataset.annotationId = annotation.id;
    button.dataset.annotationType = annotation.type;
    button.setAttribute('aria-pressed', 'false');

    const number = document.createElement('span');
    number.className = 'annotation-list-number';
    number.setAttribute('aria-hidden', 'true');
    number.textContent = String(annotation.index);
    const copy = document.createElement('span');
    const label = document.createElement('span');
    label.className = 'annotation-list-type';
    label.textContent = annotation.type;
    const title = document.createElement('span');
    title.className = 'annotation-list-title';
    title.textContent = annotation.title;
    copy.append(label, title);
    button.append(number, copy);
    button.addEventListener('click', () => selectAnnotation(annotation.id, 'push'));
    item.append(button);
    fragment.append(item);
  }
  annotationList.replaceChildren(fragment);
}

function renderDetail(annotation: Annotation | null): void {
  detailRegion.dataset.empty = String(!annotation);
  previousButton.disabled = !annotation;
  nextButton.disabled = !annotation;
  closeButton.disabled = !annotation;

  if (!annotation) {
    detailType.textContent = 'Annotation guide';
    detailTitle.textContent = 'Explore the object';
    detailText.textContent =
      'Choose a numbered marker or an entry below to examine the object, its archaeological context and the limits of the available record.';
    detailEvidence.textContent =
      'Six annotations · three source positions · three editorial positions';
    detailPlacement.textContent =
      'Every annotation is also available from the list below.';
    detailCounter.textContent = 'No annotation selected';
    detailSources.replaceChildren();
    return;
  }

  detailType.textContent = annotation.type;
  detailTitle.textContent = annotation.title;
  detailText.textContent = annotation.text;
  detailEvidence.textContent = `${annotation.evidence} · ${annotation.confidence} source confidence`;
  detailPlacement.textContent = `${
    annotation.anchor.placementOrigin === 'sketchfab'
      ? 'Source-derived placement'
      : 'Editorial placement'
  }: ${annotation.anchor.placementNote}`;
  detailCounter.textContent = `${annotation.index} of ${heritageRecord.annotations.length}`;

  const sourceItems = annotation.sources.flatMap((id) => {
    const source = sourcesById.get(id);
    if (!source) return [];
    const item = document.createElement('li');
    item.append(externalLink(source));
    return [item];
  });
  detailSources.replaceChildren(...sourceItems);
}

function updateSelectionStyles(id: string | null): void {
  for (const button of annotationList.querySelectorAll<HTMLButtonElement>(
    '.annotation-list-button',
  )) {
    const active = button.dataset.annotationId === id;
    button.dataset.active = String(active);
    button.setAttribute('aria-pressed', String(active));
  }
}

type HistoryMode = 'push' | 'replace' | 'none';

function writeSelectionToHistory(
  id: string | null,
  mode: Exclude<HistoryMode, 'none'>,
): void {
  const url = new URL(window.location.href);
  url.hash = id ? annotationHash(id) : '';
  window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', url);
}

function selectAnnotation(
  id: string | null,
  historyMode: HistoryMode = 'none',
  moveCamera = true,
): void {
  const annotation = id ? (annotationsById.get(id) ?? null) : null;
  selectedAnnotationId = annotation?.id ?? null;
  updateSelectionStyles(selectedAnnotationId);
  renderDetail(annotation);
  viewer.setActiveAnnotation(selectedAnnotationId, moveCamera);
  if (historyMode !== 'none') writeSelectionToHistory(selectedAnnotationId, historyMode);
}

function stepAnnotation(direction: -1 | 1): void {
  if (!selectedAnnotationId) return;
  const currentIndex = heritageRecord.annotations.findIndex(
    (annotation) => annotation.id === selectedAnnotationId,
  );
  const nextIndex =
    (currentIndex + direction + heritageRecord.annotations.length) %
    heritageRecord.annotations.length;
  const annotation = heritageRecord.annotations[nextIndex];
  if (annotation) selectAnnotation(annotation.id, 'push');
}

renderMetadata();
renderSourceList();
renderAnnotationList();
renderDetail(null);

if (validationIssues.length > 0) {
  updateStatus('Annotation data could not be validated', 'error');
  throw new Error(validationIssues.join('\n'));
}

const viewer = new HeritageViewer({
  canvasRoot,
  markerLayer,
  annotations: heritageRecord.annotations,
  modelUrl: simulateModelError
    ? `${import.meta.env.BASE_URL}models/antler_pick/missing-model.gltf`
    : `${import.meta.env.BASE_URL}models/antler_pick/scene.gltf`,
  reducedMotion,
  onStatus: updateStatus,
  onAnnotationSelect: (id) => selectAnnotation(id, 'push'),
});

previousButton.addEventListener('click', () => stepAnnotation(-1));
nextButton.addEventListener('click', () => stepAnnotation(1));
closeButton.addEventListener('click', () => selectAnnotation(null, 'push', false));
resetButton.addEventListener('click', () => viewer.resetView());

window.addEventListener('hashchange', () => {
  selectAnnotation(parseAnnotationHash(window.location.hash, validAnnotationIds), 'none');
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && selectedAnnotationId) {
    selectAnnotation(null, 'push', false);
    closeButton.focus();
  }
});

void viewer
  .load()
  .then(() => {
    const initialId = parseAnnotationHash(window.location.hash, validAnnotationIds);
    if (initialId) selectAnnotation(initialId, 'none');
  })
  .catch(() => {
    markerLayer.dataset.disabled = 'true';
  });

window.addEventListener('pagehide', () => viewer.dispose(), { once: true });
