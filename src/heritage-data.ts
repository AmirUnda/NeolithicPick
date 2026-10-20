export type Vec3Tuple = readonly [number, number, number];

export type AnnotationType = 'observation' | 'interpretation' | 'context' | 'gap';
export type Confidence = 'high' | 'medium';
export type PlacementOrigin = 'sketchfab' | 'editorial';

export interface Source {
  id: string;
  shortLabel: string;
  citation: string;
  url: string;
}

export interface CameraPose {
  eye: Vec3Tuple;
  target: Vec3Tuple;
}

export interface AnnotationAnchor {
  displayPosition: Vec3Tuple;
  placementOrigin: PlacementOrigin;
  sourcePosition?: Vec3Tuple;
}

export interface Annotation {
  id: string;
  index: number;
  type: AnnotationType;
  title: string;
  text: string;
  evidence: string;
  confidence: Confidence;
  sources: readonly string[];
  author: string;
  date: string;
  anchor: AnnotationAnchor;
  camera: CameraPose;
  sourceCamera?: CameraPose;
}

export interface MetadataField {
  label: string;
  value: string;
  status: 'documented' | 'creator-supplied' | 'not-documented';
}

export interface HeritageRecord {
  object: string;
  period: string;
  altText: string;
  summary: string;
  metadata: readonly MetadataField[];
  sources: readonly Source[];
  annotations: readonly Annotation[];
}

const commonSketchfabTarget = [0.163295, -0.254943, 1.181867] as const;

export const heritageRecord = {
  object: 'Antler pick',
  period: 'Neolithic',
  altText:
    'Interactive 3D model of a pale beige-brown deer-antler pick, 44.2 centimetres long. Its thick curved beam has a broad end, two projecting tines, and a long tapered point.',
  summary:
    'A photogrammetric record of a deer-antler pick associated with the Neolithic flint-mining landscape around Rijckholt and Sint Geertruid.',
  metadata: [
    { label: 'Origin', value: 'Rijckholt / Sint Geertruid', status: 'documented' },
    { label: 'Period', value: 'Neolithic · 5000–2000 BCE', status: 'documented' },
    { label: 'Material', value: 'Deer antler', status: 'documented' },
    { label: 'Length', value: '44.2 cm', status: 'documented' },
    { label: 'Holding institution', value: 'Not documented', status: 'not-documented' },
    { label: 'Inventory number', value: 'Not documented', status: 'not-documented' },
    { label: 'Exact object date', value: 'Not documented', status: 'not-documented' },
    { label: 'Excavation history', value: 'Not documented', status: 'not-documented' },
    { label: 'Deer species', value: 'Not documented', status: 'not-documented' },
    { label: 'Capture', value: 'Nikon EOS 250D photogrammetry', status: 'documented' },
    {
      label: 'Processing',
      value: 'Agisoft Metashape Professional',
      status: 'documented',
    },
    {
      label: 'Model creators',
      value: 'Richard Stevenson and Héctor Amir Unda Garza',
      status: 'documented',
    },
    { label: 'Model created', value: '2022', status: 'creator-supplied' },
    { label: 'Published online', value: '30 January 2023', status: 'documented' },
  ],
  sources: [
    {
      id: 'sketchfab',
      shortLabel: 'Sketchfab model record',
      citation:
        'Centre Céramique Maastricht, “Antler Pick,” model by Richard Stevenson and Amir Unda, published 30 January 2023.',
      url: 'https://sketchfab.com/3d-models/antler-pick-497f2fdabecc44ecae461622d0450103',
    },
    {
      id: 'geological-survey',
      shortLabel: 'Geological Survey of the Netherlands',
      citation: 'Geological Survey of the Netherlands, “Rijckholt Flint Mine.”',
      url: 'https://www.geologischedienst.nl/en/geology-for-you/geological-hotspots/rijckholt-flint-mine/',
    },
    {
      id: 'mining-methods',
      shortLabel: 'Rijckholt mining methods',
      citation:
        'Prehistorische Vuursteenmijnen Rijckholt–St. Geertruid, “Werkwijze van de prehistorische mijnwerkers.”',
      url: 'https://www.vuursteenmijnen.nl/rijckholt/werkwijze.html',
    },
    {
      id: 'chronology',
      shortLabel: 'Felder 1981',
      citation:
        'P. J. Felder, “Prehistoric Flint Mining at Ryckholt-St. Geertruid (Netherlands) and Grimes Graves (England),” Staringia 6 (1981), 57–62.',
      url: 'https://natuurtijdschriften.nl/pub/568087',
    },
    {
      id: 'license',
      shortLabel: 'Creative Commons licence',
      citation: 'Creative Commons Attribution 4.0 International (CC BY 4.0).',
      url: 'https://creativecommons.org/licenses/by/4.0/',
    },
  ],
  annotations: [
    {
      id: 'a1',
      index: 1,
      type: 'observation',
      title: 'Overall form',
      text: 'The object is a curved section of antler, 44.2 centimetres long. A thick main beam tapers to a long point, while two shorter tines project from its broader end.',
      evidence: 'Visible on the model; length from the published model record',
      confidence: 'high',
      sources: ['sketchfab'],
      author: 'Héctor Amir Unda Garza',
      date: '2026-10',
      anchor: {
        displayPosition: [-0.415344, -0.301746, -1.858538],
        placementOrigin: 'editorial',
      },
      camera: {
        eye: [-8.17, 4.55, -10.91],
        target: [-0.19, 0.25, 0.03],
      },
    },
    {
      id: 'a2',
      index: 2,
      type: 'observation',
      title: 'Surface and possible wear',
      text: 'The digitised surface is irregular and mottled, with shallow grooves, pitting and lighter worn-looking areas along the beam and around its ends. The model alone cannot establish how or when these marks formed.',
      evidence: 'Visible on the 3D model; no cause assigned from appearance alone',
      confidence: 'high',
      sources: [],
      author: 'Héctor Amir Unda Garza',
      date: '2026-10',
      anchor: {
        displayPosition: [0.064029, 0.812739, 0.728805],
        placementOrigin: 'editorial',
      },
      camera: {
        eye: [-1.72, 1.28, 2.54],
        target: [0.064029, 0.812739, 0.728805],
      },
    },
    {
      id: 'a3',
      index: 3,
      type: 'interpretation',
      title: 'How picks like this were used',
      text: 'Accounts of the Rijckholt mines describe antler picks as one of several tool types used in mining. Antler was used especially while cutting through loess and gravel above the limestone; harder layers required other tools. This describes the tool class, not the documented use of this particular object.',
      evidence:
        'Published mining-method account; object-specific use remains undocumented',
      confidence: 'high',
      sources: ['mining-methods'],
      author: 'Héctor Amir Unda Garza',
      date: '2026-10',
      anchor: {
        displayPosition: [0.113946, 0.428787, -1.474297],
        sourcePosition: [-1.5266, 0.00373, -0.199681],
        placementOrigin: 'sketchfab',
      },
      camera: {
        eye: [-1.27844, 2.165067, -8.175421],
        target: [0.113946, 0.428787, -1.474297],
      },
      sourceCamera: {
        eye: [-3.127945, 1.594524, 4.183606],
        target: commonSketchfabTarget,
      },
    },
    {
      id: 'a4',
      index: 4,
      type: 'context',
      title: 'The Rijckholt flint mines',
      text: 'South-east of Maastricht, Neolithic miners sank narrow shafts through surface deposits into limestone and excavated galleries along flint-bearing layers. The complex extends across several hectares and is one of the Netherlands’ major prehistoric mining landscapes.',
      evidence: 'Geological and archaeological site descriptions',
      confidence: 'high',
      sources: ['geological-survey', 'mining-methods'],
      author: 'Héctor Amir Unda Garza',
      date: '2026-10',
      anchor: {
        displayPosition: [-0.027676, 0.721837, 0.112794],
        sourcePosition: [-0.180585, 0.189397, 0.682682],
        placementOrigin: 'sketchfab',
      },
      camera: {
        eye: [-0.139912, 2.739907, -2.104577],
        target: [-0.027676, 0.721837, 0.112794],
      },
      sourceCamera: {
        eye: [-3.009901, 0.30363, 1.674578],
        target: commonSketchfabTarget,
      },
    },
    {
      id: 'a5',
      index: 5,
      type: 'context',
      title: 'Dating the mining landscape',
      text: 'The model record assigns the object only to the broad Neolithic period, 5000–2000 BCE. Radiocarbon studies date activity at parts of the Rijckholt mining complex more narrowly, but those dates cannot be transferred to this pick without its catalogue and excavation context.',
      evidence: 'Model record compared with published site chronology',
      confidence: 'medium',
      sources: ['sketchfab', 'chronology'],
      author: 'Héctor Amir Unda Garza',
      date: '2026-10',
      anchor: {
        displayPosition: [-0.699613, 0.074425, 1.719592],
        sourcePosition: [1.571566, -0.384301, 0.913503],
        placementOrigin: 'sketchfab',
      },
      camera: {
        eye: [-0.128808, 3.433433, -2.95371],
        target: [-0.699613, 0.074425, 1.719592],
      },
      sourceCamera: {
        eye: [-4.063772, 0.376906, 1.968034],
        target: commonSketchfabTarget,
      },
    },
    {
      id: 'a6',
      index: 6,
      type: 'gap',
      title: 'What is not documented',
      text: 'No catalogue record for this exact object was identified. Its holding institution, inventory number, exact findspot, excavation history, individual date and deer species therefore remain undocumented. Centre Céramique is the model publisher, but that does not by itself establish ownership or custody.',
      evidence: 'Absence of object-level documentation in the sources consulted',
      confidence: 'high',
      sources: ['sketchfab'],
      author: 'Héctor Amir Unda Garza',
      date: '2026-10',
      anchor: {
        displayPosition: [0.434283, 0.816804, -1.773127],
        placementOrigin: 'editorial',
      },
      camera: {
        eye: [-3.65, 0.88, 2.48],
        target: [0.434283, 0.816804, -1.773127],
      },
    },
  ],
} satisfies HeritageRecord;
