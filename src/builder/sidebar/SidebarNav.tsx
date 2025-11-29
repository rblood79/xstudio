import React from "react";
//import "./SidebarNav.css";
import {
  File,
  SquarePlus,
  Palette,
  WandSparkles,
  Settings,
  ChevronLeft,
} from "lucide-react";
import { iconProps } from "../../utils/ui/uiConstants";

export type Tab =
  | "nodes"
  | "components"
  | "theme"
  | "ai"
  | "settings";

interface SidebarNavProps {
  activeTabs: Set<Tab>;
  onTabChange: (tab: Tab) => void;
  onCloseAll?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTabs,
  onTabChange,
  onCloseAll,
}) => {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "nodes",
      label: "노드",
      icon: (
        <File
          color={iconProps.color}
          strokeWidth={iconProps.stroke}
          size={iconProps.size}
        />
      ),
    },
    {
      id: "components",
      label: "컴포넌트",
      icon: (
        <SquarePlus
          color={iconProps.color}
          strokeWidth={iconProps.stroke}
          size={iconProps.size}
        />
      ),
    },
    {
      id: "theme",
      label: "테마",
      icon: (
        <Palette
          color={iconProps.color}
          strokeWidth={iconProps.stroke}
          size={iconProps.size}
        />
      ),
    },
    {
      id: "ai",
      label: "AI",
      icon: (
        <WandSparkles
          color={iconProps.color}
          strokeWidth={iconProps.stroke}
          size={iconProps.size}
        />
      ),
    },
    {
      id: "settings",
      label: "설정",
      icon: (
        <Settings
          color={iconProps.color}
          strokeWidth={iconProps.stroke}
          size={iconProps.size}
        />
      ),
    },
  ];

  return (
    <nav className="panel-nav">
      <ul className="nav-list">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <button
              className={`nav-button ${activeTabs.has(tab.id) ? "active" : ""}`}
              onClick={() => onTabChange(tab.id)}
              aria-pressed={activeTabs.has(tab.id)}
            >
              {tab.icon}
            </button>
          </li>
        ))}
      </ul>
      {onCloseAll && activeTabs.size > 0 && (
        <button
          className="nav-button close-all-button active"
          onClick={onCloseAll}
          aria-label="Close all tabs"
          title="전체 닫기"
        >
          <ChevronLeft
            color={iconProps.color}
            strokeWidth={iconProps.stroke}
            size={iconProps.size}
          />
        </button>
      )}
    </nav>
  );
};
