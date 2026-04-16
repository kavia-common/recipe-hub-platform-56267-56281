import React from "react";

function getInitials(title) {
  const parts = String(title || "Recipe")
    .trim()
    .split(/\s+/)
    .slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "R";
}

// PUBLIC_INTERFACE
export default function RecipeCard({ recipe, onAddToPlan, onOpen }) {
  const title = recipe?.title || recipe?.name || "Untitled recipe";
  const minutes = recipe?.minutes || recipe?.totalMinutes || recipe?.timeMinutes;
  const tags = recipe?.tags || recipe?.labels || [];

  return (
    <article className="rh-card" aria-label={title}>
      <button className="rh-card__media" type="button" onClick={onOpen} aria-label={`Open ${title}`}>
        {recipe?.imageUrl ? (
          // If backend returns absolute URL, keep it; otherwise show fallback.
          <img className="rh-card__img" src={recipe.imageUrl} alt={title} />
        ) : (
          <div className="rh-card__fallback" aria-hidden="true">
            {getInitials(title)}
          </div>
        )}
      </button>

      <div className="rh-card__body">
        <div className="rh-card__titleRow">
          <h3 className="rh-card__title">{title}</h3>
          {minutes ? <span className="rh-badge">{minutes} min</span> : null}
        </div>

        {tags?.length ? (
          <div className="rh-card__tags" aria-label="Recipe tags">
            {tags.slice(0, 3).map((t) => (
              <span key={String(t)} className="rh-pill">
                {String(t)}
              </span>
            ))}
            {tags.length > 3 ? <span className="rh-pill rh-pill--muted">+{tags.length - 3}</span> : null}
          </div>
        ) : (
          <div className="rh-muted">No tags</div>
        )}

        <div className="rh-card__actions">
          <button className="rh-btn rh-btn--ghost" type="button" onClick={onOpen}>
            Details
          </button>
          <button className="rh-btn rh-btn--primary" type="button" onClick={onAddToPlan}>
            Add to plan
          </button>
        </div>
      </div>
    </article>
  );
}
