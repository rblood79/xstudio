import { createContext, useContext } from "react";

export const ToggleButtonGroupIndicatorContext = createContext(false);
export const ToggleButtonGroupEmphasizedContext = createContext(false);

export function useToggleButtonGroupIndicator() {
  return useContext(ToggleButtonGroupIndicatorContext);
}

export function useToggleButtonGroupEmphasized() {
  return useContext(ToggleButtonGroupEmphasizedContext);
}
