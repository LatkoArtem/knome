/* Custom inline SVG illustrations — dark-theme, minimal geometric style */

export function IllustrationChat() {
  return (
    <svg width="160" height="130" viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Main bubble */}
      <rect x="20" y="24" width="90" height="58" rx="14" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.2)" strokeWidth="1.5"/>
      {/* Tail */}
      <path d="M30 82 L24 96 L48 82Z" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.2)" strokeWidth="1.5" strokeLinejoin="round"/>
      {/* Lines inside bubble */}
      <rect x="32" y="38" width="40" height="4" rx="2" fill="rgba(59,130,246,0.35)"/>
      <rect x="32" y="48" width="56" height="4" rx="2" fill="rgba(59,130,246,0.2)"/>
      <rect x="32" y="58" width="32" height="4" rx="2" fill="rgba(59,130,246,0.2)"/>
      {/* Reply bubble */}
      <rect x="50" y="60" width="90" height="44" rx="14" fill="rgba(99,102,241,0.08)" stroke="rgba(99,102,241,0.2)" strokeWidth="1.5"/>
      <rect x="62" y="72" width="44" height="4" rx="2" fill="rgba(99,102,241,0.35)"/>
      <rect x="62" y="82" width="28" height="4" rx="2" fill="rgba(99,102,241,0.2)"/>
      {/* Sparkle */}
      <circle cx="136" cy="20" r="3" fill="rgba(59,130,246,0.4)"/>
      <circle cx="146" cy="32" r="2" fill="rgba(99,102,241,0.3)"/>
      <circle cx="128" cy="36" r="1.5" fill="rgba(59,130,246,0.3)"/>
    </svg>
  )
}

export function IllustrationFinance() {
  return (
    <svg width="160" height="130" viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Card */}
      <rect x="20" y="30" width="120" height="72" rx="14" fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.2)" strokeWidth="1.5"/>
      {/* Card chip */}
      <rect x="34" y="46" width="24" height="18" rx="4" fill="rgba(16,185,129,0.2)" stroke="rgba(16,185,129,0.35)" strokeWidth="1"/>
      {/* Card lines */}
      <rect x="34" y="76" width="48" height="4" rx="2" fill="rgba(16,185,129,0.25)"/>
      <rect x="34" y="84" width="32" height="4" rx="2" fill="rgba(16,185,129,0.15)"/>
      {/* Amount top right */}
      <rect x="88" y="44" width="40" height="8" rx="4" fill="rgba(16,185,129,0.3)"/>
      <rect x="88" y="56" width="28" height="5" rx="2.5" fill="rgba(16,185,129,0.15)"/>
      {/* Coins floating */}
      <circle cx="136" cy="24" r="10" fill="rgba(251,191,36,0.1)" stroke="rgba(251,191,36,0.3)" strokeWidth="1.5"/>
      <text x="136" y="28" textAnchor="middle" fontSize="10" fill="rgba(251,191,36,0.6)">₴</text>
      <circle cx="22" cy="108" r="7" fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.25)" strokeWidth="1.2"/>
    </svg>
  )
}

export function IllustrationHealth() {
  return (
    <svg width="160" height="130" viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Heart */}
      <path d="M80 100 C80 100 30 68 30 42 C30 28 42 18 56 22 C64 24 72 30 80 38 C88 30 96 24 104 22 C118 18 130 28 130 42 C130 68 80 100 80 100Z"
        fill="rgba(244,63,94,0.08)" stroke="rgba(244,63,94,0.3)" strokeWidth="1.5"/>
      {/* ECG line */}
      <polyline points="30,65 50,65 58,48 66,80 74,55 82,65 100,65 108,55 116,65 135,65"
        stroke="rgba(244,63,94,0.5)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Pulse dots */}
      <circle cx="58" cy="48" r="3" fill="rgba(244,63,94,0.4)"/>
      <circle cx="74" cy="55" r="2.5" fill="rgba(244,63,94,0.3)"/>
    </svg>
  )
}

export function IllustrationLearning() {
  return (
    <svg width="160" height="130" viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Book */}
      <rect x="36" y="28" width="56" height="72" rx="6" fill="rgba(99,102,241,0.08)" stroke="rgba(99,102,241,0.25)" strokeWidth="1.5"/>
      <rect x="36" y="28" width="8" height="72" rx="4" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.3)" strokeWidth="1"/>
      {/* Lines */}
      <rect x="52" y="44" width="28" height="3" rx="1.5" fill="rgba(99,102,241,0.3)"/>
      <rect x="52" y="52" width="36" height="3" rx="1.5" fill="rgba(99,102,241,0.2)"/>
      <rect x="52" y="60" width="22" height="3" rx="1.5" fill="rgba(99,102,241,0.2)"/>
      <rect x="52" y="68" width="30" height="3" rx="1.5" fill="rgba(99,102,241,0.15)"/>
      {/* Cap */}
      <path d="M80 20 L110 34 L80 46 L50 34 Z" fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" strokeLinejoin="round"/>
      <line x1="110" y1="34" x2="110" y2="52" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="110" cy="54" r="3" fill="rgba(99,102,241,0.4)" stroke="rgba(99,102,241,0.5)" strokeWidth="1"/>
      {/* Stars */}
      <circle cx="130" cy="24" r="2.5" fill="rgba(251,191,36,0.4)"/>
      <circle cx="140" cy="38" r="1.5" fill="rgba(251,191,36,0.3)"/>
      <circle cx="128" cy="44" r="2" fill="rgba(251,191,36,0.35)"/>
    </svg>
  )
}

export function IllustrationEmpty() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="46" r="32" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>
      <circle cx="60" cy="46" r="20" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
      <path d="M52 42 L60 34 L68 42" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="60" y1="34" x2="60" y2="54" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="52" y1="58" x2="68" y2="58" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}
