export const setPath = (path, { replace = false } = {}) => {
  const nextPath = typeof path === "string" && path.trim() ? path : "/";

  if (replace) {
    window.history.replaceState({}, "", nextPath);
  } else {
    window.history.pushState({}, "", nextPath);
  }

  // pushState/replaceState do not trigger popstate; dispatch so App updates.
  window.dispatchEvent(new PopStateEvent("popstate"));
};
