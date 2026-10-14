// X-style launch splash. The overlay is static HTML in index.html (no white flash before JS);
// once React has mounted we play the hold -> shrink -> zoom/fade animation and remove the node.
// Runs once per page load (route changes never re-create it).
export function playSplash() {
  const el = document.getElementById("exo-splash");
  if (!el) return;
  let done = false;
  const remove = () => {
    if (done) return;
    done = true;
    el.remove();
  };
  // Two frames so the first app paint is underneath before we start revealing it.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      el.classList.add("go");
      el.addEventListener("animationend", (e) => {
        if (e.target === el) remove();
      });
      window.setTimeout(remove, 1600); // safety net
    }),
  );
}
