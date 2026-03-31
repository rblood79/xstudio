import { useMemo, useCallback, memo, useState, useEffect } from "react";
import { translations } from "../../../i18n";
import {
  AppWindowMac,
  SeparatorHorizontal,
  Square,
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
  BarChart3,
  ChevronRight,
  Star,
  Trash2,
  Link,
  Paintbrush,
  Layers,
  Box,
  Smile,
  ScrollText,
  Frame,
  Loader,
  Upload,
  FileUp,
  CircleUser,
  Users,
  CircleDot,
  AlertTriangle,
  CircleDashed,
  ImageIcon,
  ChevronsDownUp,
} from "lucide-react";
import { PanelHeader, Section } from "../../components";
import { ActionIconButton } from "../../components/ui/ActionIconButton";
import { useEditModeStore } from "../../stores/editMode";
import { iconProps } from "../../../utils/ui/uiConstants";
import { ComponentSearch } from "./ComponentSearch";
import { useRecentComponents } from "../../hooks/useRecentComponents";
import { useFavoriteComponents } from "../../hooks/useFavoriteComponents";
import { useSectionCollapse } from "../styles/hooks/useSectionCollapse";
import "@xstudio/shared/components/styles/ComponentList.css";
import { Badge } from "@xstudio/shared/components/Badge";
// import { ToggleButton, ToggleButtonGroup, Button, TextField, Label, Input, Description, FieldError, Checkbox, CheckboxGroup } from '../components/list';

interface ComponentListProps {
  handleAddElement: (tag: string, parentId?: string) => void;
  selectedElementId?: string | null;
}

// 컴포넌트 정의 (React Aria / Spectrum 공식 분류 기준, 실용적 병합)
const contentComp = [
  { tag: "Text", label: "text", icon: Text },
  { tag: "Icon", label: "icon", icon: Smile },
  { tag: "Separator", label: "separator", icon: SeparatorHorizontal },
  { tag: "Badge", label: "badge", icon: Star },
  { tag: "ProgressBar", label: "progress bar", icon: BarChart3 },
  { tag: "Skeleton", label: "skeleton", icon: Loader },
  { tag: "Avatar", label: "avatar", icon: CircleUser },
  { tag: "AvatarGroup", label: "avatar group", icon: Users },
  { tag: "StatusLight", label: "status light", icon: CircleDot },
  { tag: "InlineAlert", label: "inline alert", icon: AlertTriangle },
  { tag: "ProgressCircle", label: "progress circle", icon: CircleDashed },
  { tag: "Image", label: "image", icon: ImageIcon },
  { tag: "IllustratedMessage", label: "illustrated message", icon: ImageIcon },
] as const;

const layoutComp = [
  { tag: "Panel", label: "panel", icon: InspectionPanel },
  { tag: "Card", label: "card", icon: AppWindowMac },
  { tag: "Group", label: "group", icon: GroupIcon },
  { tag: "Tabs", label: "tabs", icon: AppWindow },
  { tag: "Breadcrumbs", label: "breadcrumbs", icon: ChevronRight },
  { tag: "Link", label: "link", icon: Link },
  { tag: "Nav", label: "navigation", icon: Menu },
  { tag: "ScrollBox", label: "scroll box", icon: ScrollText },
  { tag: "MaskedFrame", label: "masked frame", icon: Frame },
  { tag: "Accordion", label: "accordion", icon: ChevronDown },
  { tag: "Disclosure", label: "disclosure", icon: ChevronDown },
  { tag: "CardView", label: "card view", icon: Grid },
  { tag: "Slot", label: "slot", icon: Layers, layoutOnly: true },
] as const;

const buttonsComp = [
  { tag: "Button", label: "button", icon: MousePointer },
  { tag: "ToggleButton", label: "toggle button", icon: ToggleLeft },
  { tag: "ToggleButtonGroup", label: "toggle button group", icon: GroupIcon },
  { tag: "Toolbar", label: "toolbar", icon: Settings },
  { tag: "ButtonGroup", label: "button group", icon: GroupIcon },
  { tag: "Menu", label: "menu", icon: Menu },
] as const;

const formsComp = [
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
  { tag: "DropZone", label: "drop zone", icon: Upload },
  { tag: "FileTrigger", label: "file trigger", icon: FileUp },
  { tag: "Form", label: "form", icon: GroupIcon },
] as const;

const collectionsComp = [
  { tag: "Table", label: "table", icon: TableProperties },
  { tag: "ListBox", label: "list box", icon: ListIcon },
  { tag: "GridList", label: "grid list", icon: Grid },
  { tag: "Tree", label: "tree", icon: ListTree },
  { tag: "TagGroup", label: "tag group", icon: Tag },
  { tag: "Section", label: "section", icon: Square },
  { tag: "TableView", label: "table view", icon: TableProperties },
] as const;

const dateTimeComp = [
  { tag: "Calendar", label: "calendar", icon: Calendar },
  { tag: "DatePicker", label: "date picker", icon: CalendarCheck },
  { tag: "DateRangePicker", label: "date range picker", icon: CalendarDays },
  { tag: "DateField", label: "date field", icon: CalendarCheck },
  { tag: "TimeField", label: "time field", icon: ChevronDown },
  { tag: "RangeCalendar", label: "range calendar", icon: CalendarDays },
] as const;

const overlaysComp = [
  { tag: "Dialog", label: "dialog", icon: AppWindowMac },
  { tag: "Modal", label: "modal", icon: InspectionPanel },
  { tag: "Popover", label: "popover", icon: AppWindowMac },
  { tag: "Tooltip", label: "tooltip", icon: MessageSquare },
] as const;

// 카테고리 설정 (레이블 및 설명)
const categoryConfig = {
  content: { label: "Content", description: "Display and indicators" },
  layout: { label: "Layout", description: "Containers and navigation" },
  buttons: { label: "Buttons", description: "Actions and triggers" },
  forms: { label: "Forms", description: "Inputs and controls" },
  collections: { label: "Collections", description: "Lists and data display" },
  dateTime: { label: "Date & Time", description: "Date and time pickers" },
  overlays: { label: "Overlays", description: "Dialogs and popups" },
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
    <button
      className="list-item"
      onClick={handleClick}
      title={`Add ${component.label} element`}
    >
      <div className="list-item-icon">
        <component.icon strokeWidth={1.5} width={16} height={16} />
      </div>
      {isRecent && count > 0 && <Badge>{count}</Badge>}
      <span className="list-item-name">{component.label}</span>
    </button>
  );
};

ComponentItem.displayName = "ComponentItem";

// 메인 컴포넌트
const ComponentList = memo(
  ({ handleAddElement, selectedElementId }: ComponentListProps) => {
    const {
      recentTags,
      addRecentComponent,
      clearRecentComponents,
      getComponentCount,
    } = useRecentComponents();
    const { favoriteTags } = useFavoriteComponents();
    const [searchQuery, setSearchQuery] = useState("");

    // Edit Mode 상태 가져오기 (Layout 모드에서만 Slot 컴포넌트 표시)
    const editMode = useEditModeStore((state) => state.mode);
    const isLayoutMode = editMode === "layout";

    // 검색 시 카테고리 자동 펼치기 (Section 컴포넌트가 collapse 상태 자체를 관리)
    const expandSections = useSectionCollapse((s) => s.expandSections);
    const collapseAll = useSectionCollapse((s) => s.collapseAll);

    const compSectionIds = useMemo(
      () => Object.keys(categoryConfig).map((key) => `comp-${key}`),
      [],
    );

    const handleCollapseAll = useCallback(() => {
      collapseAll(compSectionIds);
    }, [collapseAll, compSectionIds]);

    // 이벤트 핸들러를 메모이제이션
    const handleComponentAdd = useCallback(
      (tag: string, parentId?: string) => {
        handleAddElement(tag, parentId);
        addRecentComponent(tag); // Recent에 추가
      },
      [handleAddElement, addRecentComponent],
    );

    // 컴포넌트 그룹을 메모이제이션 (7개 카테고리)
    // Layout 모드가 아닐 때는 layoutOnly 컴포넌트(Slot)를 필터링
    const componentGroups = useMemo(
      () => ({
        content: contentComp,
        layout: isLayoutMode
          ? layoutComp
          : layoutComp.filter(
              (comp) => !("layoutOnly" in comp && comp.layoutOnly),
            ),
        buttons: buttonsComp,
        forms: formsComp,
        collections: collectionsComp,
        dateTime: dateTimeComp,
        overlays: overlaysComp,
      }),
      [isLayoutMode],
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
        },
      );
    }, [componentGroups]);

    // Tag → i18n key 매핑 (모든 locale 번역으로 검색 가능)
    const i18nLabelsMap = useMemo(() => {
      const map = new Map<string, string[]>();
      const specialTagMap: Record<string, string> = {
        TailSwatch: "colorPicker",
      };
      const allLocales = Object.values(translations);

      for (const comp of allComponents) {
        const i18nKey =
          specialTagMap[comp.tag] ??
          comp.tag[0].toLowerCase() + comp.tag.slice(1);
        const labels: string[] = [];
        for (const locale of allLocales) {
          const label = (
            locale.components as Record<string, string | undefined>
          )[i18nKey];
          if (label) labels.push(label.toLowerCase());
        }
        map.set(comp.tag, labels);
      }
      return map;
    }, [allComponents]);

    // Fuzzy search results (다국어 지원)
    const searchResults = useMemo(() => {
      if (!searchQuery.trim()) return null;

      const lowerQuery = searchQuery.toLowerCase();

      const scored = allComponents.map((comp) => {
        const lowerLabel = comp.label.toLowerCase();
        const lowerTag = comp.tag.toLowerCase();
        const lowerCategory = comp.category.toLowerCase();
        const i18nLabels = i18nLabelsMap.get(comp.tag) ?? [];

        let score = 0;

        // Exact match (English)
        if (lowerLabel === lowerQuery || lowerTag === lowerQuery) {
          score += 100;
        }

        // Exact match (i18n)
        if (i18nLabels.some((l) => l === lowerQuery)) {
          score += 100;
        }

        // Starts with query (English)
        if (
          lowerLabel.startsWith(lowerQuery) ||
          lowerTag.startsWith(lowerQuery)
        ) {
          score += 50;
        }

        // Starts with query (i18n)
        if (i18nLabels.some((l) => l.startsWith(lowerQuery))) {
          score += 50;
        }

        // Contains query (English)
        if (lowerLabel.includes(lowerQuery)) {
          score += 30;
        }
        if (lowerTag.includes(lowerQuery)) {
          score += 25;
        }
        if (lowerCategory.includes(lowerQuery)) {
          score += 10;
        }

        // Contains query (i18n)
        if (i18nLabels.some((l) => l.includes(lowerQuery))) {
          score += 30;
        }

        // Multi-word matching
        const words = lowerQuery.split(" ").filter((w) => w.length > 0);
        const allWordsMatch = words.every(
          (word) =>
            lowerLabel.includes(word) ||
            lowerTag.includes(word) ||
            i18nLabels.some((l) => l.includes(word)),
        );
        if (allWordsMatch && words.length > 1) {
          score += 20;
        }

        return { ...comp, score };
      });

      return scored
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);
    }, [searchQuery, allComponents, i18nLabelsMap]);

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
          (comp): comp is (typeof allComponents)[0] => comp !== undefined,
        );
    }, [favoriteTags, allComponents]);

    // 검색 시 검색 결과가 있는 카테고리 자동 펼치기
    useEffect(() => {
      if (searchQuery && filteredGroups) {
        const sectionIds = Object.keys(filteredGroups).map(
          (key) => `comp-${key}`,
        );
        expandSections(sectionIds);
      }
    }, [searchQuery, filteredGroups, expandSections]);

    return (
      <div className="panel">
        <PanelHeader
          icon={<Box size={16} />}
          title="Components"
          actions={
            <>
              <ActionIconButton
                tooltip="Collapse all sections"
                onPress={handleCollapseAll}
              >
                <ChevronsDownUp
                  color={iconProps.color}
                  strokeWidth={iconProps.strokeWidth}
                  size={iconProps.size}
                />
              </ActionIconButton>
            </>
          }
        />

        {/* 검색바 */}
        <ComponentSearch onSearchChange={setSearchQuery} />

        <div className="panel-contents">
          {/* Recent 컴포넌트 - 검색 시 숨김 */}
          {!searchQuery && recentComponents.length > 0 && (
            <Section
              title="Recently Used"
              badge={
                <span className="category-count">
                  {recentComponents.length}
                </span>
              }
              actions={
                <button
                  className="iconButton"
                  aria-label="Clear Recent History"
                  onClick={clearRecentComponents}
                >
                  <Trash2
                    color={iconProps.color}
                    strokeWidth={iconProps.strokeWidth}
                    size={iconProps.size}
                  />
                </button>
              }
              collapsible={false}
            >
              <div className="list-group" role="list">
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
            </Section>
          )}

          {/* Favorites 컴포넌트 - 항상 표시 */}
          {favoriteComponents.length > 0 && (
            <Section
              title="Favorites"
              badge={
                <span className="category-count">
                  {favoriteComponents.length}
                </span>
              }
              collapsible={false}
            >
              <div className="list-group" role="list">
                {favoriteComponents.map((component) => (
                  <ComponentItem
                    key={component.tag}
                    component={component}
                    onAdd={handleComponentAdd}
                    selectedElementId={selectedElementId}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* 카테고리별 컴포넌트 */}
          {searchQuery && filteredGroups ? (
            // 검색 모드: 필터링된 카테고리만 표시
            Object.entries(filteredGroups).map(([groupName, components]) => {
              const categoryKey = groupName as keyof typeof categoryConfig;
              const config = categoryConfig[categoryKey];

              if (!components || components.length === 0) return null;

              return (
                <Section
                  key={groupName}
                  id={`comp-${categoryKey}`}
                  title={config.label}
                  badge={
                    <span className="category-count">{components.length}</span>
                  }
                >
                  <div className="list-group" role="list">
                    {components.map((component) => (
                      <ComponentItem
                        key={component.tag}
                        component={component}
                        onAdd={handleComponentAdd}
                        selectedElementId={selectedElementId}
                      />
                    ))}
                  </div>
                </Section>
              );
            })
          ) : !searchQuery ? (
            // 일반 모드: 모든 카테고리 표시
            Object.entries(componentGroups).map(([groupName, components]) => {
              const categoryKey = groupName as keyof typeof categoryConfig;
              const config = categoryConfig[categoryKey];

              return (
                <Section
                  key={groupName}
                  id={`comp-${categoryKey}`}
                  title={config.label}
                  badge={
                    <span className="category-count">{components.length}</span>
                  }
                >
                  <div className="list-group" role="list">
                    {components.map((component) => (
                      <ComponentItem
                        key={component.tag}
                        component={component}
                        onAdd={handleComponentAdd}
                        selectedElementId={selectedElementId}
                      />
                    ))}
                  </div>
                </Section>
              );
            })
          ) : (
            // 검색 결과 없음
            <div className="section">
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
      </div>
    );
  },
);

ComponentList.displayName = "ComponentList";

export default ComponentList;
