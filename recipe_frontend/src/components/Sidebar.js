import React from "react";

const DEFAULT_TAGS = ["Quick", "Vegetarian", "Vegan", "Gluten-Free", "Dessert", "High-Protein"];

// PUBLIC_INTERFACE
export default function Sidebar({
  searchValue,
  onSearchChange,
  selectedTags,
  onToggleTag,
  collections,
  activeCollection,
  onSelectCollection,
}) {
  const tags = DEFAULT_TAGS;

  return (
    <aside className="rh-sidebar" aria-label="Filters">
      <div className="rh-panel">
        <div className="rh-panel__title">Search</div>
        <label className="rh-field">
          <span className="rh-field__label">Keyword</span>
          <input
            className="rh-input"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="e.g., chicken, pasta, salad…"
            type="search"
          />
        </label>
      </div>

      <div className="rh-panel">
        <div className="rh-panel__title">Tags</div>
        <div className="rh-chipset" role="list" aria-label="Tag filters">
          {tags.map((t) => {
            const active = selectedTags.includes(t);
            return (
              <button
                key={t}
                type="button"
                className={`rh-chip ${active ? "is-active" : ""}`}
                onClick={() => onToggleTag(t)}
                aria-pressed={active}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rh-panel">
        <div className="rh-panel__title">Collections</div>
        <div className="rh-collectionList" role="list" aria-label="Collections">
          <button
            type="button"
            className={`rh-collectionList__item ${!activeCollection ? "is-active" : ""}`}
            onClick={() => onSelectCollection("")}
          >
            All recipes
          </button>
          {(collections || []).map((c) => {
            const id = c.id || c.slug || c.name;
            const name = c.name || String(id);
            const active = activeCollection && String(activeCollection) === String(id);
            return (
              <button
                key={String(id)}
                type="button"
                className={`rh-collectionList__item ${active ? "is-active" : ""}`}
                onClick={() => onSelectCollection(String(id))}
              >
                <span className="rh-collectionList__dot" aria-hidden="true" />
                {name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rh-sidebar__footer">
        <div className="rh-muted">
          API: <code className="rh-code">{process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL || "unset"}</code>
        </div>
      </div>
    </aside>
  );
}
