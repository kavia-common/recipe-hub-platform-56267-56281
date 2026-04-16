const DEFAULT_TIMEOUT_MS = 15000;

function normalizeBaseUrl(url) {
  if (!url) return "";
  return String(url).replace(/\/+$/, "");
}

function getApiBaseUrl() {
  // Prefer explicit API base; fall back to backend URL.
  const env = process.env || {};
  return normalizeBaseUrl(env.REACT_APP_API_BASE || env.REACT_APP_BACKEND_URL || "");
}

async function requestJson(path, options = {}) {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error(
      "Missing API base URL. Set REACT_APP_API_BASE or REACT_APP_BACKEND_URL in the environment."
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

    if (!res.ok) {
      const message =
        (body && body.message) ||
        (typeof body === "string" && body) ||
        `Request failed with status ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      err.body = body;
      throw err;
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
}

// PUBLIC_INTERFACE
export const api = {
  /** Returns backend base URL resolved from env. Useful for debug panels. */
  getBaseUrl: () => getApiBaseUrl(),

  /** Search/browse recipes. Backend endpoint may vary; we try common patterns. */
  async listRecipes({ q = "", tags = [], collection = "", limit = 24 } = {}) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (collection) params.set("collection", collection);
    if (limit) params.set("limit", String(limit));
    (tags || []).forEach((t) => params.append("tags", t));

    // Try /recipes first; if backend differs, it should be updated in one place here.
    return requestJson(`/recipes?${params.toString()}`);
  },

  async getRecipe(id) {
    return requestJson(`/recipes/${encodeURIComponent(id)}`);
  },

  /** Collections/folders in sidebar. */
  async listCollections() {
    return requestJson(`/collections`);
  },

  /** Meal plan read/write. */
  async getMealPlan({ weekStart } = {}) {
    const params = new URLSearchParams();
    if (weekStart) params.set("weekStart", weekStart);
    return requestJson(`/mealplan?${params.toString()}`);
  },

  async saveMealPlan(payload) {
    return requestJson(`/mealplan`, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  },

  /** Admin: content/recipe upsert and delete. */
  async upsertRecipe(payload) {
    return requestJson(`/admin/recipes`, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  },

  async deleteRecipe(id) {
    return requestJson(`/admin/recipes/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};
