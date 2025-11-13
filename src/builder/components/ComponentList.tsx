import { useMemo, useCallback, memo, useState, useEffect } from "react";
import {
  AppWindowMac,
  SeparatorHorizontal,
  ChevronUp,
  Square,
  Code,
  Text,
  ToggleLeft,
  AppWindow,
  InspectionPanel,
  SlidersHorizontal,
  MousePointer,
  Tag,
  CalendarCheck,
  CalendarDays,
  RectangleEllipsis,
  Calendar,
  ListTree,
  Menu,
  GroupIcon,
  ListIcon,
  Grid,
  TableProperties,
  SquareCheck,
  ChevronDown,
  Search,
  ToggleRight,
  Hash,
  MessageSquare,
  Settings,
  Gauge,
  BarChart3,
  Settings2,
  ChevronRight,
  Clock,
  Star,
  Trash2,
  Link,
  Paintbrush,
} from "lucide-react";
import { iconProps } from "../../utils/ui/uiConstants";
import { ComponentSearch } from "./ComponentSearch";
import { useRecentComponents } from "../hooks/useRecentComponents";
import { useFavoriteComponents } from "../hooks/useFavoriteComponents";
import { useCategoryExpansion } from "../hooks/useCategoryExpansion";
import "./styles/ComponentList.css";
import { Badge } from "./Badge";
// import { ToggleButton, ToggleButtonGroup, Button, TextField, Label, Input, Description, FieldError, Checkbox, CheckboxGroup } from '../components/list';

interface ComponentListProps {
  handleAddElement: (tag: string, parentId?: string) => void;
  selectedElementId?: string | null;
}

// 컴포넌트 정의를 메모이제이션 (8개 카테고리)
const layoutComp = [
  { tag: "Panel", label: "panel", icon: InspectionPanel },
  { tag: "Card", label: "card", icon: AppWindowMac },
  { tag: "Tabs", label: "tabs", icon: AppWindow },
  { tag: "Breadcrumbs", label: "breadcrumbs", icon: ChevronRight },
  { tag: "Link", label: "link", icon: Link },
  { tag: "Separator", label: "separator", icon: SeparatorHorizontal },
  { tag: "Nav", label: "navigation", icon: Menu },
] as const;

const inputsComp = [
  { tag: "TextField", label: "text field", icon: RectangleEllipsis },
  { tag: "NumberField", label: "number field", icon: Hash },
  { tag: "SearchField", label: "search field", icon: Search },
  { tag: "Checkbox", label: "checkbox", icon: SquareCheck },
  { tag: "CheckboxGroup", label: "checkbox group", icon: GroupIcon },
  { tag: "RadioGroup", label: "radio group", icon: GroupIcon },
  { tag: "Select", label: "select", icon: ChevronDown },
  { tag: "ComboBox", label: "combo box", icon: ChevronDown },
  { tag: "Switch", label: "switch", icon: ToggleRight },
  { tag: "Slider", label: "slider", icon: SlidersHorizontal },
  { tag: "TailSwatch", label: "color picker", icon: Paintbrush },
] as const;

const actionsComp = [
  { tag: "Button", label: "button", icon: MousePointer },
  { tag: "ToggleButton", label: "toggle button", icon: ToggleLeft },
  { tag: "ToggleButtonGroup", label: "toggle button group", icon: GroupIcon },
  { tag: "Menu", label: "menu", icon: Menu },
  { tag: "Toolbar", label: "toolbar", icon: Settings },
] as const;

const collectionsComp = [
  { tag: "Table", label: "table", icon: TableProperties },
  { tag: "ListBox", label: "list box", icon: ListIcon },
  { tag: "GridList", label: "grid list", icon: Grid },
  { tag: "Tree", label: "tree", icon: ListTree },
  { tag: "TagGroup", label: "tag group", icon: Tag },
  { tag: "Field", label: "field", icon: GroupIcon },
] as const;

const feedbackComp = [
  { tag: "Tooltip", label: "tooltip", icon: MessageSquare },
  { tag: "ProgressBar", label: "progress bar", icon: BarChart3 },
  { tag: "Meter", label: "meter", icon: Gauge },
  { tag: "Badge", label: "badge", icon: Star },
] as const;

const dateTimeComp = [
  { tag: "Calendar", label: "calendar", icon: Calendar },
  { tag: "DatePicker", label: "date picker", icon: CalendarCheck },
  { tag: "DateRangePicker", label: "date range picker", icon: CalendarDays },
  { tag: "DateField", label: "date field", icon: CalendarCheck },
  { tag: "TimeField", label: "time field", icon: ChevronDown },
] as const;

const overlaysComp = [
  { tag: "Dialog", label: "dialog", icon: AppWindowMac },
  { tag: "Modal", label: "modal", icon: InspectionPanel },
  { tag: "Popover", label: "popover", icon: AppWindowMac },
  { tag: "Tooltip", label: "tooltip", icon: MessageSquare },
] as const;

const structureComp = [
  { tag: "Text", label: "text", icon: Text },
  { tag: "section", label: "section", icon: Square },
  { tag: "Div", label: "division", icon: Code },
] as const;

const otherComp = [{ tag: "Form", label: "form", icon: GroupIcon }] as const;

// 카테고리 설정 (레이블 및 설명)
const categoryConfig = {
  layout: { label: "Layout", description: "Containers and structure" },
  inputs: { label: "Inputs", description: "Form controls" },
  actions: { label: "Actions", description: "Buttons and interactions" },
  collections: { label: "Collections", description: "Lists and data display" },
  feedback: { label: "Feedback", description: "Status indicators" },
  dateTime: { label: "Date & Time", description: "Date pickers" },
  overlays: { label: "Overlays", description: "Dialogs and modals" },
  structure: { label: "Structure", description: "Basic elements" },
  other: { label: "Other", description: "Item components" },
} as const;

// 개별 컴포넌트 아이템을 메모이제이션
const ComponentItem = ({
  component,
  onAdd,
  selectedElementId,
  isRecent = false,
  count = 0,
}: {
  component: {
    tag: string;
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  };
  onAdd: (tag: string, parentId?: string) => void;
  selectedElementId?: string | null;
  isRecent?: boolean;
  count?: number;
}) => {
  const handleClick = useCallback(() => {
    onAdd(component.tag, selectedElementId || undefined);
  }, [component.tag, onAdd, selectedElementId]);

  return (
    <div className="component-list-item">
      <button onClick={handleClick} title={`Add ${component.label} element`}>
        <component.icon strokeWidth={1} width={16} height={16} />
        {isRecent && count > 0 && (
          <Badge size="xs">{count}</Badge>
        )}
      </button>
      <label>{component.label}</label>
    </div>
  );
};

ComponentItem.displayName = "ComponentItem";

// 메인 컴포넌트
const ComponentList = memo(
  ({ handleAddElement, selectedElementId }: ComponentListProps) => {
    const { recentTags, addRecentComponent, clearRecentComponents, getComponentCount } =
      useRecentComponents();
    const { favoriteTags } = useFavoriteComponents();
    const [searchQuery, setSearchQuery] = useState("");

    // 카테고리 펼치기/접기 상태 관리 (모든 카테고리 기본 펼침)
    const allCategoryKeys = useMemo(
      () => [
        "layout",
        "inputs",
        "actions",
        "collections",
        "feedback",
        "dateTime",
        "overlays",
        "structure",
        "other",
      ],
      []
    );
    const { isExpanded, toggleCategory, expandCategories } =
      useCategoryExpansion({
        initialExpanded: allCategoryKeys,
        persist: true,
      });

    // 이벤트 핸들러를 메모이제이션
    const handleComponentAdd = useCallback(
      (tag: string, parentId?: string) => {
        handleAddElement(tag, parentId);
        addRecentComponent(tag); // Recent에 추가
      },
      [handleAddElement, addRecentComponent]
    );

    // 컴포넌트 그룹을 메모이제이션 (8개 카테고리)
    const componentGroups = useMemo(
      () => ({
        layout: layoutComp,
        inputs: inputsComp,
        actions: actionsComp,
        collections: collectionsComp,
        feedback: feedbackComp,
        dateTime: dateTimeComp,
        overlays: overlaysComp,
        structure: structureComp,
        other: otherComp,
      }),
      []
    );

    // 검색용 모든 컴포넌트 배열 생성
    const allComponents = useMemo(() => {
      return Object.entries(componentGroups).flatMap(
        ([categoryKey, components]) => {
          const config =
            categoryConfig[categoryKey as keyof typeof categoryConfig];
          return components.map((comp) => ({
            ...comp,
            category: config.label,
            categoryKey,
          }));
        }
      );
    }, [componentGroups]);

    // Fuzzy search results
    const searchResults = useMemo(() => {
      if (!searchQuery.trim()) return null;

      const lowerQuery = searchQuery.toLowerCase();

      const scored = allComponents.map((comp) => {
        const lowerLabel = comp.label.toLowerCase();
        const lowerTag = comp.tag.toLowerCase();
        const lowerCategory = comp.category.toLowerCase();

        let score = 0;

        // Exact match
        if (lowerLabel === lowerQuery || lowerTag === lowerQuery) {
          score += 100;
        }

        // Starts with query
        if (
          lowerLabel.startsWith(lowerQuery) ||
          lowerTag.startsWith(lowerQuery)
        ) {
          score += 50;
        }

        // Contains query
        if (lowerLabel.includes(lowerQuery)) {
          score += 30;
        }
        if (lowerTag.includes(lowerQuery)) {
          score += 25;
        }
        if (lowerCategory.includes(lowerQuery)) {
          score += 10;
        }

        // Multi-word matching
        const words = lowerQuery.split(" ").filter((w) => w.length > 0);
        const allWordsMatch = words.every(
          (word) => lowerLabel.includes(word) || lowerTag.includes(word)
        );
        if (allWordsMatch && words.length > 1) {
          score += 20;
        }

        return { ...comp, score };
      });

      return scored
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);
    }, [searchQuery, allComponents]);

    // Group search results by category
    const filteredGroups = useMemo(() => {
      if (!searchResults) return null;

      const groups: Record<string, typeof allComponents> = {};

      searchResults.forEach((comp) => {
        if (!groups[comp.categoryKey]) {
          groups[comp.categoryKey] = [];
        }
        groups[comp.categoryKey].push(comp);
      });

      return groups;
    }, [searchResults]);

    // Recent 컴포넌트 가져오기
    const recentComponents = useMemo(() => {
      return recentTags
        .map((tag) => allComponents.find((comp) => comp.tag === tag))
        .filter((comp): comp is (typeof allComponents)[0] => comp !== undefined)
        .slice(0, 8);
    }, [recentTags, allComponents]);

    // Favorites 컴포넌트 가져오기
    const favoriteComponents = useMemo(() => {
      return favoriteTags
        .map((tag) => allComponents.find((comp) => comp.tag === tag))
        .filter(
          (comp): comp is (typeof allComponents)[0] => comp !== undefined
        );
    }, [favoriteTags, allComponents]);

    // 검색 시 검색 결과가 있는 카테고리 자동 펼치기
    useEffect(() => {
      if (searchQuery && filteredGroups) {
        const categoriesToExpand = Object.keys(filteredGroups);
        expandCategories(categoriesToExpand);
      }
    }, [searchQuery, filteredGroups, expandCategories]);

    return (
      <div className="componentsPanel">
        <div className="panel-header">
          <h3 className="panel-title">Components</h3>
          <div className="header-actions">
            <button className="iconButton" aria-label="filter components">
              <Settings2
                color={iconProps.color}
                strokeWidth={iconProps.stroke}
                size={iconProps.size}
              />
            </button>
          </div>
        </div>

        {/* 검색바 */}
        <ComponentSearch onSearchChange={setSearchQuery} />

        {/* Recent 컴포넌트 - 검색 시 숨김 */}
        {!searchQuery && recentComponents.length > 0 && (
          <div className="component_element">
            <div className="panel-header">
              <div className="category-info">
                <h3 className="panel-title">Recently Used</h3>
                <span className="category-count">
                  {recentComponents.length}
                </span>
              </div>
              <div className="header-actions">
                <button
                  className="iconButton"
                  aria-label="Clear Recent History"
                  onClick={clearRecentComponents}
                >
                  <Trash2
                    color={iconProps.color}
                    strokeWidth={iconProps.stroke}
                    size={iconProps.size}
                  />
                </button>
                <button
                  className="iconButton"
                  aria-label="Toggle Recently Used"
                >
                  <Clock
                    color={iconProps.color}
                    strokeWidth={iconProps.stroke}
                    size={iconProps.size}
                  />
                </button>
              </div>
            </div>
            <div className="component-list">
              {recentComponents.map((component) => (
                <ComponentItem
                  key={component.tag}
                  component={component}
                  onAdd={handleComponentAdd}
                  selectedElementId={selectedElementId}
                  isRecent={true}
                  count={getComponentCount(component.tag)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Favorites 컴포넌트 - 항상 표시 */}
        {favoriteComponents.length > 0 && (
          <div className="component_element">
            <div className="panel-header">
              <div className="category-info">
                <Star size={14} className="category-icon-small" />
                <h3 className="panel-title">Favorites</h3>
                <span className="category-count">
                  {favoriteComponents.length}
                </span>
              </div>
            </div>
            <div className="component-list">
              {favoriteComponents.map((component) => (
                <ComponentItem
                  key={component.tag}
                  component={component}
                  onAdd={handleComponentAdd}
                  selectedElementId={selectedElementId}
                />
              ))}
            </div>
          </div>
        )}

        {/* 카테고리별 컴포넌트 */}
        {searchQuery && filteredGroups ? (
          // 검색 모드: 필터링된 카테고리만 표시 (검색 결과가 있는 카테고리는 자동 펼침)
          Object.entries(filteredGroups).map(([groupName, components]) => {
            const categoryKey = groupName as keyof typeof categoryConfig;
            const config = categoryConfig[categoryKey];
            // 검색 모드에서는 항상 펼쳐진 상태로 표시 (사용자가 수동으로 접을 수도 있음)
            const expanded = isExpanded(categoryKey);

            if (!components || components.length === 0) return null;

            return (
              <div key={groupName} className="component_element">
                <div className="panel-header">
                  <div className="category-info">
                    <h3 className="panel-title">{config.label}</h3>
                    <span className="category-count">{components.length}</span>
                  </div>
                  <div className="header-actions">
                    <button
                      className="iconButton"
                      aria-label={`Toggle ${config.label}`}
                      onClick={() => toggleCategory(categoryKey)}
                    >
                      {expanded ? (
                        <ChevronUp
                          color={iconProps.color}
                          strokeWidth={iconProps.stroke}
                          size={iconProps.size}
                        />
                      ) : (
                        <ChevronDown
                          color={iconProps.color}
                          strokeWidth={iconProps.stroke}
                          size={iconProps.size}
                        />
                      )}
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="component-list">
                    {components.map((component) => (
                      <ComponentItem
                        key={component.tag}
                        component={component}
                        onAdd={handleComponentAdd}
                        selectedElementId={selectedElementId}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : !searchQuery ? (
          // 일반 모드: 모든 카테고리 표시
          Object.entries(componentGroups).map(([groupName, components]) => {
            const categoryKey = groupName as keyof typeof categoryConfig;
            const config = categoryConfig[categoryKey];
            const expanded = isExpanded(categoryKey);

            return (
              <div key={groupName} className="component_element">
                <div className="panel-header">
                  <div className="category-info">
                    <h3 className="panel-title">{config.label}</h3>
                    <span className="category-count">{components.length}</span>
                  </div>
                  <div className="header-actions">
                    <button
                      className="iconButton"
                      aria-label={`Toggle ${config.label}`}
                      onClick={() => toggleCategory(categoryKey)}
                    >
                      {expanded ? (
                        <ChevronUp
                          color={iconProps.color}
                          strokeWidth={iconProps.stroke}
                          size={iconProps.size}
                        />
                      ) : (
                        <ChevronDown
                          color={iconProps.color}
                          strokeWidth={iconProps.stroke}
                          size={iconProps.size}
                        />
                      )}
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="component-list">
                    {components.map((component) => (
                      <ComponentItem
                        key={component.tag}
                        component={component}
                        onAdd={handleComponentAdd}
                        selectedElementId={selectedElementId}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          // 검색 결과 없음
          <div className="component_element">
            <div className="search-no-results">
              <Search size={24} color={iconProps.color} />
              <p className="no-results-title">No components found</p>
              <p className="no-results-hint">
                Try 'button', 'input', or 'table'
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }
);

ComponentList.displayName = "ComponentList";

export default ComponentList;
