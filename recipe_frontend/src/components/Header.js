import React from "react";

// PUBLIC_INTERFACE
export default function Header({ activeView, onNavigate, onOpenMealPlanner }) {
  /** Top navigation with primary actions. */
  return (
    <header className="rh-header" role="banner">
      <div className="rh-header__left">
        <div className="rh-brand" aria-label="Recipe Hub">
          <div className="rh-brand__mark" aria-hidden="true">
            RH
          </div>
          <div className="rh-brand__text">
            <div className="rh-brand__title">Recipe Hub</div>
            <div className="rh-brand__subtitle">Browse • Plan • Cook</div>
          </div>
        </div>
      </div>

      <nav className="rh-nav" aria-label="Primary navigation">
        <button
          className={`rh-nav__item ${activeView === "browse" ? "is-active" : ""}`}
          onClick={() => onNavigate("browse")}
          type="button"
        >
          Browse
        </button>
        <button
          className={`rh-nav__item ${activeView === "admin" ? "is-active" : ""}`}
          onClick={() => onNavigate("admin")}
          type="button"
        >
          Admin
        </button>
      </nav>

      <div className="rh-header__right">
        <button className="rh-btn rh-btn--primary" type="button" onClick={onOpenMealPlanner}>
          Meal Planner
        </button>
      </div>
    </header>
  );
}
