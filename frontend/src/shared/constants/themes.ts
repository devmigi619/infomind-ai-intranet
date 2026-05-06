export interface ThemePalette {
  bg: {
    app: string;
    surface: string;
    surfaceAlt: string;
    surfaceMute: string;
  };
  text: {
    primary: string;
    body: string;
    muted: string;
    subtle: string;
    onBrand: string;
  };
  border: {
    default: string;
    subtle: string;
    strong: string;
  };
  brand: {
    primary: string;
    primaryTint: string;
    primaryTintSoft: string;
  };
  semantic: {
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
  semanticTint: {
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
  shadow: {
    card: string;
    modal: string;
  };
}

export const lightTheme: ThemePalette = {
  bg: {
    app: '#F9F9F9',
    surface: '#FFFFFF',
    surfaceAlt: '#FAFAFA',
    surfaceMute: 'rgba(0,0,0,0.04)',
  },
  text: {
    primary: '#000000',
    body: 'rgba(0,0,0,0.85)',
    muted: 'rgba(0,0,0,0.55)',
    subtle: 'rgba(0,0,0,0.35)',
    onBrand: '#FFFFFF',
  },
  border: {
    default: 'rgba(0,0,0,0.08)',
    subtle: 'rgba(0,0,0,0.06)',
    strong: 'rgba(0,0,0,0.12)',
  },
  brand: {
    primary: '#0A2463',
    primaryTint: 'rgba(10,36,99,0.08)',
    primaryTintSoft: 'rgba(10,36,99,0.04)',
  },
  semantic: {
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#0A2463',
  },
  semanticTint: {
    success: 'rgba(16,185,129,0.12)',
    warning: 'rgba(245,158,11,0.12)',
    danger: 'rgba(239,68,68,0.12)',
    info: 'rgba(10,36,99,0.10)',
  },
  shadow: {
    card: '0 2px 12px rgba(0,0,0,0.06)',
    modal: '0 16px 48px rgba(0,0,0,0.18)',
  },
};

export const darkTheme: ThemePalette = {
  bg: {
    app: '#050810',
    surface: '#0f1419',
    surfaceAlt: '#1a1f29',
    surfaceMute: 'rgba(255,255,255,0.04)',
  },
  text: {
    primary: '#f1f5f9',
    body: '#cbd5e1',
    muted: '#94a3b8',
    subtle: '#64748b',
    onBrand: '#FFFFFF',
  },
  border: {
    default: 'rgba(255,255,255,0.12)',
    subtle: 'rgba(255,255,255,0.08)',
    strong: 'rgba(255,255,255,0.18)',
  },
  brand: {
    primary: '#4d6db5',
    primaryTint: 'rgba(77,109,181,0.18)',
    primaryTintSoft: 'rgba(77,109,181,0.10)',
  },
  semantic: {
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
    info: '#60a5fa',
  },
  semanticTint: {
    success: 'rgba(52,211,153,0.16)',
    warning: 'rgba(251,191,36,0.16)',
    danger: 'rgba(248,113,113,0.16)',
    info: 'rgba(96,165,250,0.16)',
  },
  shadow: {
    card: '0 2px 12px rgba(0,0,0,0.4)',
    modal: '0 16px 48px rgba(0,0,0,0.6)',
  },
};

// 관리자 액센트 — admin 모드 시 brand.primary 계열을 빨간으로 대체
export const adminAccent = {
  light: {
    primary: '#DC2626',
    primaryTint: 'rgba(220,38,38,0.08)',
    primaryTintSoft: 'rgba(220,38,38,0.04)',
  },
  dark: {
    primary: '#ef4444',
    primaryTint: 'rgba(239,68,68,0.18)',
    primaryTintSoft: 'rgba(239,68,68,0.10)',
  },
};
