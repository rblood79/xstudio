# Performance Optimization Tasks

- [ ] **Phase 1: Panel Gateway Pattern**

  - [ ] MonitorPanel Gateway + `enabled` parameter <!-- id: 0 -->
  - [ ] PropertiesPanel Gateway Pattern <!-- id: 1 -->
  - [ ] StylesPanel Gateway Pattern <!-- id: 2 -->
  - [ ] ComponentsPanel Gateway Pattern <!-- id: 3 -->
  - [ ] PanelShell HOC Standardization <!-- id: 4 -->

- [ ] **Phase 2: Store Indexing System**

  - [ ] Type Definitions (ElementIndexes) <!-- id: 5 -->
  - [ ] Indexer Utility (`elementIndexer.ts`) <!-- id: 6 -->
  - [ ] Store Integration (`elements.ts`) <!-- id: 7 -->
  - [ ] Migration (`.filter` refactoring) <!-- id: 8 -->

- [ ] **Phase 3: History Diff System**

  - [ ] Command Pattern Implementation <!-- id: 9 -->
  - [ ] DiffHistoryManager Implementation (`diffHistory.ts`) <!-- id: 10 -->
  - [ ] Store Integration & Memory Optimization <!-- id: 11 -->

- [ ] **Phase 4: Canvas Delta Sync**

  - [ ] Delta Message Types & Queue <!-- id: 12 -->
  - [ ] `useCanvasDeltaSync` Hook <!-- id: 13 -->
  - [ ] Canvas Runtime Receiver (`useDeltaReceiver`) <!-- id: 14 -->
  - [ ] Backpressure & Full Sync Reservation <!-- id: 15 -->

- [ ] **Phase 5: Lazy Loading & LRU**

  - [ ] LRU Page Cache Implementation <!-- id: 16 -->
  - [ ] Element Loader Service <!-- id: 17 -->
  - [ ] Store Integration (Load/Unload Logic) <!-- id: 18 -->

- [x] **Phase 6: React Query Integration**

  - [x] Setup & Provider <!-- id: 19 -->
  - [x] DataTablePanel Implementation (Double Layer) <!-- id: 20 -->
  - [ ] Request Manager (Deduplication + Abort) <!-- id: 21 -->
  - [ ] Persister & Realtime Invalidation <!-- id: 22 -->

- [ ] **Phase 7: Performance Monitoring & SLO**

  - [ ] PerformanceMonitor Implementation <!-- id: 23 -->
  - [ ] Trace Hooks (Select, Drag, Panel Switch) <!-- id: 24 -->
  - [ ] Auto Recovery Logic <!-- id: 25 -->
  - [ ] Scoped Error Boundary <!-- id: 26 -->

- [ ] **Phase 8: CI & Large Scale Testing**

  - [ ] Fixed Seed Generator (`generate-large-project.ts`) <!-- id: 27 -->
  - [ ] Long Session Simulation Script <!-- id: 28 -->
  - [ ] SLO Verification Logic <!-- id: 29 -->

- [ ] **Phase 9: Supplement & Additional Ideas**
  - [ ] Canvas Virtualization (P0) - `react-virtual` + Hitbox <!-- id: 30 -->
  - [ ] Web Worker Offloading (P1) - Comlink + Fallback <!-- id: 31 -->
  - [ ] CSS Containment (P0) <!-- id: 32 -->
  - [ ] Event Delegation (P1) <!-- id: 33 -->
  - [ ] Selection Overlay Isolation (P2) <!-- id: 34 -->
