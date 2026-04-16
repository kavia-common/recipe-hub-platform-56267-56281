import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import RecipeCard from "./components/RecipeCard";
import Drawer from "./components/Drawer";
import { api } from "./services/api";

function safeArray(x) {
  return Array.isArray(x) ? x : [];
}

function coerceRecipes(payload) {
  // Accept either {items: []} or [] or {data: []}.
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

function coerceCollections(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildWeek() {
  // Simple 7-day planner starting today.
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(start);
    d.setDate(start.getDate() + idx);
    const iso = d.toISOString().slice(0, 10);
    return { date: iso, slots: { breakfast: null, lunch: null, dinner: null } };
  });
}

// PUBLIC_INTERFACE
function App() {
  const [activeView, setActiveView] = useState("browse");

  // Browse UI state
  const [searchValue, setSearchValue] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [activeCollection, setActiveCollection] = useState("");
  const [collections, setCollections] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Drawers
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState(null);

  // Planner state
  const [plannerWeek, setPlannerWeek] = useState(() => buildWeek());
  const [plannerSaving, setPlannerSaving] = useState(false);

  // Admin state (simple content dashboard)
  const [adminForm, setAdminForm] = useState({
    id: "",
    title: "",
    minutes: "",
    tagsCsv: "",
    imageUrl: "",
  });
  const [adminBusy, setAdminBusy] = useState(false);

  const resolvedTags = useMemo(() => safeArray(selectedTags).filter(Boolean), [selectedTags]);

  useEffect(() => {
    let cancelled = false;

    async function loadCollections() {
      setLoadingCollections(true);
      setErrorMessage("");
      try {
        const payload = await api.listCollections();
        if (cancelled) return;
        setCollections(coerceCollections(payload));
      } catch (e) {
        if (cancelled) return;
        setErrorMessage(e?.message || "Failed to load collections.");
      } finally {
        if (!cancelled) setLoadingCollections(false);
      }
    }

    loadCollections();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRecipes() {
      setLoadingRecipes(true);
      setErrorMessage("");
      try {
        const payload = await api.listRecipes({
          q: searchValue,
          tags: resolvedTags,
          collection: activeCollection,
        });
        if (cancelled) return;
        setRecipes(coerceRecipes(payload));
      } catch (e) {
        if (cancelled) return;
        setErrorMessage(e?.message || "Failed to load recipes.");
      } finally {
        if (!cancelled) setLoadingRecipes(false);
      }
    }

    loadRecipes();
    return () => {
      cancelled = true;
    };
  }, [searchValue, resolvedTags, activeCollection]);

  const toggleTag = (tag) => {
    setSelectedTags((prev) => {
      const exists = prev.includes(tag);
      return exists ? prev.filter((t) => t !== tag) : [...prev, tag];
    });
  };

  const openRecipeDetails = (recipe) => {
    setActiveRecipe(recipe);
    setDetailsOpen(true);
  };

  const addRecipeToPlan = (recipe) => {
    // For simplicity: put into "dinner" of today if empty, otherwise next available dinner slot.
    setPlannerWeek((prev) => {
      const next = prev.map((d) => ({ ...d, slots: { ...d.slots } }));
      const idx = next.findIndex((d) => !d.slots.dinner);
      const target = idx >= 0 ? idx : 0;
      next[target].slots.dinner = {
        id: recipe?.id || recipe?.recipeId || recipe?.slug || recipe?.title,
        title: recipe?.title || recipe?.name || "Recipe",
      };
      return next;
    });
    setPlannerOpen(true);
  };

  const saveMealPlan = async () => {
    setPlannerSaving(true);
    setErrorMessage("");
    try {
      await api.saveMealPlan({
        weekStart: plannerWeek?.[0]?.date || todayIso(),
        days: plannerWeek,
      });
      setPlannerOpen(false);
    } catch (e) {
      setErrorMessage(e?.message || "Failed to save meal plan.");
    } finally {
      setPlannerSaving(false);
    }
  };

  const onAdminChange = (field, value) => {
    setAdminForm((p) => ({ ...p, [field]: value }));
  };

  const submitAdminRecipe = async () => {
    setAdminBusy(true);
    setErrorMessage("");
    try {
      const tags = adminForm.tagsCsv
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await api.upsertRecipe({
        id: adminForm.id || undefined,
        title: adminForm.title,
        minutes: adminForm.minutes ? Number(adminForm.minutes) : undefined,
        tags,
        imageUrl: adminForm.imageUrl || undefined,
      });

      // Refresh browse list after admin changes.
      const payload = await api.listRecipes({ q: searchValue, tags: resolvedTags, collection: activeCollection });
      setRecipes(coerceRecipes(payload));

      setAdminForm({ id: "", title: "", minutes: "", tagsCsv: "", imageUrl: "" });
    } catch (e) {
      setErrorMessage(e?.message || "Admin save failed.");
    } finally {
      setAdminBusy(false);
    }
  };

  const deleteAdminRecipe = async () => {
    if (!adminForm.id) {
      setErrorMessage("Enter a Recipe ID to delete.");
      return;
    }
    setAdminBusy(true);
    setErrorMessage("");
    try {
      await api.deleteRecipe(adminForm.id);
      const payload = await api.listRecipes({ q: searchValue, tags: resolvedTags, collection: activeCollection });
      setRecipes(coerceRecipes(payload));
      setAdminForm({ id: "", title: "", minutes: "", tagsCsv: "", imageUrl: "" });
    } catch (e) {
      setErrorMessage(e?.message || "Delete failed.");
    } finally {
      setAdminBusy(false);
    }
  };

  return (
    <div className="rh-app">
      <Header
        activeView={activeView}
        onNavigate={setActiveView}
        onOpenMealPlanner={() => setPlannerOpen(true)}
      />

      <div className="rh-shell">
        <Sidebar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          selectedTags={selectedTags}
          onToggleTag={toggleTag}
          collections={collections}
          activeCollection={activeCollection}
          onSelectCollection={setActiveCollection}
        />

        <main className="rh-main" aria-label="Content">
          <div className="rh-main__top">
            <div>
              <h1 className="rh-h1">{activeView === "admin" ? "Admin Dashboard" : "Recipes"}</h1>
              <div className="rh-subtitle">
                {activeView === "admin"
                  ? "Manage recipe content and collections."
                  : "Use filters to find something delicious."}
              </div>
            </div>

            <div className="rh-main__actions">
              {loadingCollections ? <span className="rh-muted">Loading collections…</span> : null}
              <button className="rh-btn rh-btn--ghost" type="button" onClick={() => setPlannerWeek(buildWeek())}>
                Reset plan
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="rh-alert" role="alert">
              <div className="rh-alert__title">Something went wrong</div>
              <div className="rh-alert__body">{errorMessage}</div>
            </div>
          ) : null}

          {activeView === "admin" ? (
            <section className="rh-admin">
              <div className="rh-admin__grid">
                <div className="rh-panel">
                  <div className="rh-panel__title">Upsert Recipe</div>

                  <div className="rh-formGrid">
                    <label className="rh-field">
                      <span className="rh-field__label">Recipe ID (optional)</span>
                      <input
                        className="rh-input"
                        value={adminForm.id}
                        onChange={(e) => onAdminChange("id", e.target.value)}
                        placeholder="e.g., 123"
                      />
                    </label>

                    <label className="rh-field">
                      <span className="rh-field__label">Title</span>
                      <input
                        className="rh-input"
                        value={adminForm.title}
                        onChange={(e) => onAdminChange("title", e.target.value)}
                        placeholder="e.g., Lemon Herb Chicken"
                      />
                    </label>

                    <label className="rh-field">
                      <span className="rh-field__label">Minutes</span>
                      <input
                        className="rh-input"
                        value={adminForm.minutes}
                        onChange={(e) => onAdminChange("minutes", e.target.value)}
                        placeholder="e.g., 35"
                        inputMode="numeric"
                      />
                    </label>

                    <label className="rh-field">
                      <span className="rh-field__label">Tags (comma separated)</span>
                      <input
                        className="rh-input"
                        value={adminForm.tagsCsv}
                        onChange={(e) => onAdminChange("tagsCsv", e.target.value)}
                        placeholder="Quick, High-Protein"
                      />
                    </label>

                    <label className="rh-field rh-field--full">
                      <span className="rh-field__label">Image URL</span>
                      <input
                        className="rh-input"
                        value={adminForm.imageUrl}
                        onChange={(e) => onAdminChange("imageUrl", e.target.value)}
                        placeholder="https://…"
                      />
                    </label>
                  </div>

                  <div className="rh-row">
                    <button
                      className="rh-btn rh-btn--primary"
                      type="button"
                      onClick={submitAdminRecipe}
                      disabled={adminBusy || !adminForm.title}
                    >
                      {adminBusy ? "Saving…" : "Save"}
                    </button>
                    <button
                      className="rh-btn rh-btn--danger"
                      type="button"
                      onClick={deleteAdminRecipe}
                      disabled={adminBusy || !adminForm.id}
                    >
                      {adminBusy ? "Working…" : "Delete by ID"}
                    </button>
                  </div>

                  <div className="rh-muted">
                    Note: Endpoint paths are assumed (<code>/admin/recipes</code>). If backend differs, update{" "}
                    <code>src/services/api.js</code>.
                  </div>
                </div>

                <div className="rh-panel">
                  <div className="rh-panel__title">Content Snapshot</div>
                  <div className="rh-muted">Total loaded recipes: {recipes.length}</div>
                  <div className="rh-muted">Active collection: {activeCollection || "All"}</div>
                  <div className="rh-muted">Active tags: {resolvedTags.join(", ") || "None"}</div>
                  <div className="rh-divider" />
                  <div className="rh-muted">API base: {api.getBaseUrl() || "unset"}</div>
                </div>
              </div>
            </section>
          ) : (
            <section className="rh-gridSection" aria-label="Recipe results">
              <div className="rh-gridSection__meta">
                <div className="rh-muted">
                  {loadingRecipes ? "Loading recipes…" : `${recipes.length} recipe(s)`}
                </div>
              </div>

              <div className="rh-grid">
                {loadingRecipes ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="rh-skeletonCard" aria-hidden="true" />
                  ))
                ) : recipes.length ? (
                  recipes.map((r) => (
                    <RecipeCard
                      key={String(r.id || r.recipeId || r.slug || r.title)}
                      recipe={r}
                      onOpen={() => openRecipeDetails(r)}
                      onAddToPlan={() => addRecipeToPlan(r)}
                    />
                  ))
                ) : (
                  <div className="rh-empty">
                    <div className="rh-empty__title">No recipes found</div>
                    <div className="rh-empty__body">Try adjusting filters or searching for something else.</div>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      <Drawer
        title="Meal Planner"
        open={plannerOpen}
        onClose={() => setPlannerOpen(false)}
        footer={
          <div className="rh-row rh-row--space">
            <div className="rh-muted">Plan is stored locally until you save.</div>
            <button className="rh-btn rh-btn--primary" type="button" onClick={saveMealPlan} disabled={plannerSaving}>
              {plannerSaving ? "Saving…" : "Save plan"}
            </button>
          </div>
        }
      >
        <div className="rh-planner">
          {plannerWeek.map((d) => (
            <div key={d.date} className="rh-plannerDay">
              <div className="rh-plannerDay__date">{d.date}</div>
              <div className="rh-plannerDay__slots">
                {["breakfast", "lunch", "dinner"].map((slot) => {
                  const item = d.slots?.[slot] || null;
                  return (
                    <div key={slot} className="rh-plannerSlot">
                      <div className="rh-plannerSlot__label">{slot}</div>
                      <div className={`rh-plannerSlot__value ${item ? "" : "is-empty"}`}>
                        {item ? item.title : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      <Drawer
        title={activeRecipe?.title || activeRecipe?.name || "Recipe Details"}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        footer={
          <div className="rh-row rh-row--space">
            <div className="rh-muted">Add this recipe to your plan.</div>
            <button
              className="rh-btn rh-btn--primary"
              type="button"
              onClick={() => {
                if (activeRecipe) addRecipeToPlan(activeRecipe);
                setDetailsOpen(false);
              }}
              disabled={!activeRecipe}
            >
              Add to plan
            </button>
          </div>
        }
      >
        {activeRecipe ? (
          <div className="rh-details">
            <div className="rh-details__hero">
              {activeRecipe.imageUrl ? (
                <img className="rh-details__img" src={activeRecipe.imageUrl} alt={activeRecipe.title || "Recipe"} />
              ) : (
                <div className="rh-details__img rh-details__img--fallback" aria-hidden="true">
                  No image
                </div>
              )}
            </div>

            <div className="rh-details__meta">
              <div className="rh-row">
                <span className="rh-badge">{activeRecipe.minutes || activeRecipe.totalMinutes || "—"} min</span>
                <span className="rh-badge rh-badge--soft">ID: {String(activeRecipe.id || activeRecipe.recipeId || "—")}</span>
              </div>

              <div className="rh-divider" />

              <div className="rh-details__section">
                <div className="rh-sectionTitle">Tags</div>
                <div className="rh-chipset">
                  {safeArray(activeRecipe.tags).length ? (
                    safeArray(activeRecipe.tags).map((t) => (
                      <span key={String(t)} className="rh-pill">
                        {String(t)}
                      </span>
                    ))
                  ) : (
                    <span className="rh-muted">No tags</span>
                  )}
                </div>
              </div>

              <div className="rh-details__section">
                <div className="rh-sectionTitle">Description</div>
                <div className="rh-muted">{activeRecipe.description || "No description provided."}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rh-muted">No recipe selected.</div>
        )}
      </Drawer>
    </div>
  );
}

export default App;
