// Minimal inline SVG icon set (stroke-based, 1.6px) used across the app.
const S = ({ children, size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

export const IconLogo = () => (
  <S size={22}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <path d="M8 9h5M8 13h8M8 17h3" />
  </S>
);
export const IconSun = () => (
  <S>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </S>
);
export const IconCalendar = () => (
  <S>
    <rect x="3" y="4.5" width="18" height="16" rx="3" />
    <path d="M3 9h18M8 2.5v4M16 2.5v4" />
  </S>
);
export const IconList = () => (
  <S>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </S>
);
export const IconNote = () => (
  <S>
    <path d="M5 3h9l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M14 3v5h5" />
  </S>
);
export const IconTrash = () => (
  <S>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </S>
);
export const IconGear = () => (
  <S>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.3 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.5L3.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.7 1l.3 2.5h5l.3-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5a7 7 0 0 0 .1-1z" />
  </S>
);
export const IconSearch = () => (
  <S>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-3.5-3.5" />
  </S>
);
export const IconBoard = () => (
  <S>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M3 9h18M9 9v12" />
  </S>
);
export const IconDots = () => (
  <S>
    <circle cx="5" cy="12" r="1.4" />
    <circle cx="12" cy="12" r="1.4" />
    <circle cx="19" cy="12" r="1.4" />
  </S>
);
export const IconCheck = () => (
  <S size={14}>
    <path d="M4 12l5 5L20 6" />
  </S>
);
export const IconChevron = () => (
  <S size={18}>
    <path d="M6 9l6 6 6-6" />
  </S>
);
export const IconAa = () => (
  <S>
    <path d="M4 19l5-13 5 13M6 14h6" />
    <path d="M16 19l2.5-7 2.5 7M17 16h3" />
  </S>
);
export const IconChecklist = () => (
  <S>
    <path d="M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17M11 6h9M11 12h9M11 18h9" />
  </S>
);
export const IconTable = () => (
  <S>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18M9 4v16" />
  </S>
);
export const IconClip = () => (
  <S>
    <path d="M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 6" />
  </S>
);
export const IconPlus = () => (
  <S>
    <path d="M12 5v14M5 12h14" />
  </S>
);
export const IconRepeat = () => (
  <S size={15}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </S>
);
export const IconTimetable = () => (
  <S>
    <rect x="3" y="4.5" width="18" height="16" rx="3" />
    <path d="M3 9h18M8 2.5v4M16 2.5v4M8 13h3M13 13h3M8 17h3" />
  </S>
);
export const IconMenu = () => (
  <S>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </S>
);
export const IconRestore = () => (
  <S size={18}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </S>
);
export const IconX = () => (
  <S size={18}>
    <path d="M6 6l12 12M18 6L6 18" />
  </S>
);
export const IconCircle = ({ size = 22 }) => (
  <S size={size}>
    <circle cx="12" cy="12" r="9" />
  </S>
);
export const IconInfo = () => (
  <S size={19}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.6v.4" />
  </S>
);
export const IconBell = () => (
  <S>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </S>
);
