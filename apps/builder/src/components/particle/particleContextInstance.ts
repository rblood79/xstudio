import { createContext } from "react";
import type { ParticleBackgroundContextValue } from "./types";

export const ParticleBackgroundContext =
  createContext<ParticleBackgroundContextValue | null>(null);
