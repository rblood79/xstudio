import { DataSourceSelector } from "./DataSourceSelector";
import type { SelectedElement } from "../../inspector/types";

export interface DataSectionProps {
  element: SelectedElement;
}

export function DataSection({ element }: DataSectionProps) {
  return (
    <div className="data-section">
      <div className="section-header">
        <div className="section-title">{element.type}</div>
      </div>
      <div className="section-content">
        <DataSourceSelector element={element} />
      </div>
    </div>
  );
}
