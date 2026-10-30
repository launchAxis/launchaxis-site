export const footerJokes = [
  "What were you expecting? More stuff? I'm not that crazy... maybe.",
  "You scrolled all the way down here? I admire your dedication. Now go back up.",
  "That’s it. There is no secret level. You won’t find a prize down here.",
  "End of the line. If you’re looking for a hidden footer menu, it’s hiding really well.",
  "All rights reserved. Some lefts, too.",
  "Made by an AI assisted human. (Unless you're reading this in the future, in which case: beep boop)."
];

export function chooseFooterJoke(previous, random = Math.random) {
  const candidates = footerJokes.map((_, i) => i).filter(i => i !== previous);
  return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
}

// Choose once per document load. Scrolling and hash navigation never change it.
if (typeof document !== 'undefined') {
  const node = document.querySelector('#footer-joke');
  if (node) {
    let previous = -1;
    try {
      const saved = sessionStorage.getItem('launchaxis-footer-joke');
      if (saved !== null && /^\d+$/.test(saved)) previous = Number(saved);
    } catch { /* Storage may be unavailable; a fresh random choice still works. */ }
    const chosen = chooseFooterJoke(previous);
    node.textContent = footerJokes[chosen];
    try { sessionStorage.setItem('launchaxis-footer-joke', String(chosen)); } catch {}
  }
}
