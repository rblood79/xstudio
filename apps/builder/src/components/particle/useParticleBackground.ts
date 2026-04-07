import { useContext } from "react";
import { ParticleBackgroundContext } from "./particleContextInstance";

export function useParticleBackground() {
  const context = useContext(ParticleBackgroundContext);
  if (!context) {
    throw new Error(
      "useParticleBackground must be used within ParticleBackgroundProvider",
    );
  }
  return context;
}
