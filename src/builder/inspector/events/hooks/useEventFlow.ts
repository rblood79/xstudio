import { useMemo } from "react";
import type { Node, Edge } from "reactflow";
import type { ElementEvent } from "@/types/events";
import type { TriggerNodeData } from "../components/visualMode/TriggerNode";
import type { ActionNodeData } from "../components/visualMode/ActionNode";

/**
 * Convert ElementEvent to ReactFlow nodes and edges
 */
export function useEventFlow(eventHandler: ElementEvent) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create trigger node
    const triggerNode: Node<TriggerNodeData> = {
      id: `trigger-${eventHandler.event_type}`,
      type: "trigger",
      position: { x: 250, y: 50 },
      data: {
        eventType: eventHandler.event_type
      }
    };
    nodes.push(triggerNode);

    // Create action nodes
    eventHandler.actions.forEach((action, index) => {
      const actionNode: Node<ActionNodeData> = {
        id: `action-${action.id}`,
        type: "action",
        position: { x: 250, y: 200 + index * 150 },
        data: {
          action,
          index
        }
      };
      nodes.push(actionNode);

      // Create edge from trigger to first action, or from previous action
      if (index === 0) {
        edges.push({
          id: `edge-trigger-action-0`,
          source: triggerNode.id,
          target: actionNode.id,
          sourceHandle: "trigger-out",
          targetHandle: "action-in",
          animated: true
        });
      } else {
        const previousActionId = `action-${eventHandler.actions[index - 1].id}`;
        edges.push({
          id: `edge-action-${index - 1}-action-${index}`,
          source: previousActionId,
          target: actionNode.id,
          sourceHandle: "action-out",
          targetHandle: "action-in",
          animated: true
        });
      }
    });

    return { nodes, edges };
  }, [eventHandler]);

  return { nodes, edges };
}
