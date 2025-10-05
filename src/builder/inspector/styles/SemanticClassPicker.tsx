import { useState } from "react";
import {
  Button,
  TagGroup,
  TagList,
  Tag,
  Label,
  TextField,
  Input,
} from "react-aria-components";
import { semanticClassCategories } from "./semantic-classes";

export interface SemanticClassPickerProps {
  selectedClasses: string[];
  onChange: (classes: string[]) => void;
}

export function SemanticClassPicker({
  selectedClasses,
  onChange,
}: SemanticClassPickerProps) {
  const [activeCategory, setActiveCategory] = useState(
    semanticClassCategories[0].id
  );
  const [searchQuery, setSearchQuery] = useState("");

  const currentCategory = semanticClassCategories.find(
    (cat) => cat.id === activeCategory
  );

  // 검색 필터링
  const filteredClasses = searchQuery
    ? currentCategory?.classes.filter(
        (cls) =>
          cls.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cls.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cls.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentCategory?.classes;

  const handleToggleClass = (classValue: string) => {
    const isSelected = selectedClasses.includes(classValue);
    const updated = isSelected
      ? selectedClasses.filter((c) => c !== classValue)
      : [...selectedClasses, classValue];
    onChange(updated);
  };

  return (
    <div className="semantic-class-picker">
      {/* 검색 */}
      <TextField
        className="class-search"
        value={searchQuery}
        onChange={setSearchQuery}
      >
        <Label className="search-label">클래스 검색</Label>
        <Input
          className="search-input"
          placeholder="클래스 이름 또는 설명..."
        />
      </TextField>

      {/* 카테고리 탭 */}
      <div className="category-tabs">
        {semanticClassCategories.map((category) => (
          <Button
            key={category.id}
            className={`category-tab ${
              activeCategory === category.id ? "active" : ""
            }`}
            onPress={() => setActiveCategory(category.id)}
          >
            <span className="category-icon">{category.icon}</span>
            <span className="category-label">{category.label}</span>
          </Button>
        ))}
      </div>

      {/* 선택된 클래스 표시 */}
      {selectedClasses.length > 0 && (
        <div className="selected-classes">
          <TagGroup
            className="tag-group"
            onRemove={(keys) => {
              const keysArray = Array.from(keys);
              onChange(selectedClasses.filter((c) => !keysArray.includes(c)));
            }}
          >
            <Label className="section-label">선택된 클래스</Label>
            <TagList className="tag-list">
              {selectedClasses.map((cls) => (
                <Tag key={cls} id={cls} className="class-tag">
                  {cls}
                </Tag>
              ))}
            </TagList>
          </TagGroup>
        </div>
      )}

      {/* 클래스 그리드 */}
      <div className="class-grid">
        {filteredClasses?.map((cls) => {
          const isSelected = selectedClasses.includes(cls.value);
          return (
            <button
              key={cls.value}
              type="button"
              className={`class-item ${isSelected ? "selected" : ""}`}
              onClick={() => handleToggleClass(cls.value)}
            >
              <div className="class-header">
                <span className="class-value">{cls.value}</span>
                {isSelected && <span className="selected-indicator">✓</span>}
              </div>
              {cls.description && (
                <span className="class-description">{cls.description}</span>
              )}
            </button>
          );
        })}
      </div>

      {filteredClasses?.length === 0 && (
        <div className="empty-state">
          <p className="empty-message">검색 결과가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
