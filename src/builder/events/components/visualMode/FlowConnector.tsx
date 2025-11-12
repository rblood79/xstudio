export interface FlowConnectorProps {
  /**
   * Connector type - determines the visual style
   */
  type?: "default" | "conditional" | "error";
}

/**
 * FlowConnector - Visual connector between flow nodes
 */
export function FlowConnector({ type = "default" }: FlowConnectorProps) {
  return (
    <div className={`flow-connector flow-connector-${type}`}>
      <div className="connector-line" />
      <div className="connector-arrow">▼</div>
    </div>
  );
}
