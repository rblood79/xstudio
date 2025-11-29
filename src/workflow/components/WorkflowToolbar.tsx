/**
 * WorkflowToolbar - 워크플로우 뷰 설정 툴바
 *
 * Layout/Navigation 엣지 표시 토글 등
 */

import { useWorkflowStore } from '../store';
import { Layout, ArrowRightLeft, Link as LinkIcon } from 'lucide-react';

export function WorkflowToolbar() {
  // Individual selectors to prevent infinite loops
  const showLayouts = useWorkflowStore((s) => s.showLayouts);
  const showNavigationEdges = useWorkflowStore((s) => s.showNavigationEdges);
  const showLayoutEdges = useWorkflowStore((s) => s.showLayoutEdges);
  const toggleShowLayouts = useWorkflowStore((s) => s.toggleShowLayouts);
  const toggleShowNavigationEdges = useWorkflowStore((s) => s.toggleShowNavigationEdges);
  const toggleShowLayoutEdges = useWorkflowStore((s) => s.toggleShowLayoutEdges);

  return (
    <div className="workflow-toolbar">
      <div className="workflow-toolbar-title">Project Workflow</div>

      <div className="workflow-toolbar-actions">
        {/* Show Layouts Toggle */}
        <button
          className={`workflow-toolbar-btn ${showLayouts ? 'active' : ''}`}
          onClick={toggleShowLayouts}
          title="Show Layouts"
        >
          <Layout size={16} />
          <span>Layouts</span>
        </button>

        {/* Show Navigation Edges Toggle */}
        <button
          className={`workflow-toolbar-btn ${showNavigationEdges ? 'active' : ''}`}
          onClick={toggleShowNavigationEdges}
          title="Show Navigation Links"
        >
          <ArrowRightLeft size={16} />
          <span>Navigation</span>
        </button>

        {/* Show Layout Edges Toggle */}
        <button
          className={`workflow-toolbar-btn ${showLayoutEdges ? 'active' : ''}`}
          onClick={toggleShowLayoutEdges}
          title="Show Layout Usage"
          disabled={!showLayouts}
        >
          <LinkIcon size={16} />
          <span>Layout Links</span>
        </button>
      </div>
    </div>
  );
}

export default WorkflowToolbar;
