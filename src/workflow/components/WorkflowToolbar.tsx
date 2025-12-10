/**
 * WorkflowToolbar - 워크플로우 뷰 설정 툴바
 *
 * Layout/Navigation 엣지 표시 토글 등
 */

import { useWorkflowStore } from '../store';
import { Layout, ArrowRightLeft, Link as LinkIcon, Zap, Database } from 'lucide-react';

export function WorkflowToolbar() {
  // Individual selectors to prevent infinite loops
  const showLayouts = useWorkflowStore((s) => s.showLayouts);
  const showNavigationEdges = useWorkflowStore((s) => s.showNavigationEdges);
  const showEventLinks = useWorkflowStore((s) => s.showEventLinks);
  const showLayoutEdges = useWorkflowStore((s) => s.showLayoutEdges);
  const showDataSources = useWorkflowStore((s) => s.showDataSources);
  const toggleShowLayouts = useWorkflowStore((s) => s.toggleShowLayouts);
  const toggleShowNavigationEdges = useWorkflowStore((s) => s.toggleShowNavigationEdges);
  const toggleShowEventLinks = useWorkflowStore((s) => s.toggleShowEventLinks);
  const toggleShowLayoutEdges = useWorkflowStore((s) => s.toggleShowLayoutEdges);
  const toggleShowDataSources = useWorkflowStore((s) => s.toggleShowDataSources);

  return (
    <div className="workflow-toolbar">
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

        {/* Show Navigation Edges Toggle (Link 요소) */}
        <button
          className={`workflow-toolbar-btn ${showNavigationEdges ? 'active' : ''}`}
          onClick={toggleShowNavigationEdges}
          title="Show Link Navigation"
        >
          <ArrowRightLeft size={16} />
          <span>Links</span>
        </button>

        {/* Show Event Links Toggle (Event 기반 navigate) */}
        <button
          className={`workflow-toolbar-btn ${showEventLinks ? 'active' : ''}`}
          onClick={toggleShowEventLinks}
          title="Show Event Navigation (onClick, onSubmit, etc.)"
        >
          <Zap size={16} />
          <span>Events</span>
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

        {/* Show Data Sources Toggle */}
        <button
          className={`workflow-toolbar-btn ${showDataSources ? 'active' : ''}`}
          onClick={toggleShowDataSources}
          title="Show Data Sources (DataTable, API, etc.)"
        >
          <Database size={16} />
          <span>Data</span>
        </button>
      </div>
    </div>
  );
}

export default WorkflowToolbar;
