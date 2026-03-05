// ============================================================
// Confetti — creates falling confetti pieces on correct answer
// ============================================================
const COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#9B59B6', '#FF9A9A', '#85B8FF'];

export function launchConfetti(count = 60) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => createPiece(), i * 20);
  }
}

function createPiece() {
  const el = document.createElement('div');
  el.className = 'confetti-piece';
  el.style.cssText = `
    left: ${Math.random() * 100}vw;
    top: -10px;
    background: ${COLORS[Math.floor(Math.random() * COLORS.length)]};
    width: ${6 + Math.random() * 10}px;
    height: ${6 + Math.random() * 10}px;
    border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    animation-duration: ${1.5 + Math.random() * 2}s;
    animation-delay: ${Math.random() * 0.3}s;
  `;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

// XP pop-up floating number
export function showXPPop(amount, anchorEl) {
  if (!anchorEl) return;
  const rect = anchorEl.getBoundingClientRect();
  const el = document.createElement('div');
  el.textContent = `+${amount} XP`;
  el.style.cssText = `
    position: fixed;
    left: ${rect.left + rect.width / 2}px;
    top: ${rect.top}px;
    transform: translateX(-50%);
    font-family: 'Fredoka One', cursive;
    font-size: 1.5rem;
    color: #4D96FF;
    font-weight: bold;
    pointer-events: none;
    z-index: 9999;
    animation: xpFloat 1.2s ease-out forwards;
  `;
  // Inline keyframe
  const style = document.createElement('style');
  style.textContent = `
    @keyframes xpFloat {
      0%   { transform: translateX(-50%) translateY(0); opacity: 1; }
      100% { transform: translateX(-50%) translateY(-80px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(el);
  setTimeout(() => { el.remove(); style.remove(); }, 1200);
}
