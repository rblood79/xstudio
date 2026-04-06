export interface BenchmarkScenario {
  name: string;
  elements: number;
  mutationsPerFrame: number;
  duration: number;
  drag?: boolean;
  zoom?: boolean;
  pages?: number;
}

export const SCENARIOS: BenchmarkScenario[] = [
  { name: "static-100", elements: 100, mutationsPerFrame: 0, duration: 5000 },
  { name: "static-1000", elements: 1000, mutationsPerFrame: 0, duration: 5000 },
  { name: "static-5000", elements: 5000, mutationsPerFrame: 0, duration: 5000 },
  {
    name: "mutate-1000x10",
    elements: 1000,
    mutationsPerFrame: 10,
    duration: 5000,
  },
  {
    name: "mutate-5000x10",
    elements: 5000,
    mutationsPerFrame: 10,
    duration: 5000,
  },
  {
    name: "drag-500",
    elements: 500,
    mutationsPerFrame: 1,
    duration: 3000,
    drag: true,
  },
  {
    name: "drag-2000",
    elements: 2000,
    mutationsPerFrame: 1,
    duration: 3000,
    drag: true,
  },
  {
    name: "zoom-1000",
    elements: 1000,
    mutationsPerFrame: 0,
    duration: 3000,
    zoom: true,
  },
  {
    name: "multipage-3x1000",
    elements: 1000,
    mutationsPerFrame: 0,
    duration: 5000,
    pages: 3,
  },
];
