/** Legger ut skjermleser-annonseringer i en skjult aria-live-region. */
export function announce(text: string): void {
  const el = document.getElementById("announcer");
  if (!el) return;
  el.textContent = "";
  void el.offsetWidth;
  el.textContent = text;
}
