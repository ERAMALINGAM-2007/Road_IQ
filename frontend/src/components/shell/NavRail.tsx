import { NavLink } from 'react-router-dom';
import {
  HouseSimple,
  Scan,
  MapPin,
  ListBullets,
  Checks,
  Kanban,
  Wrench,
  LineSegments,
  Flask,
  UserCircle,
  Gear,
  Palette,
} from 'phosphor-react';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',           icon: <HouseSimple size={20} weight="regular" />, label: 'Briefing' },
  { to: '/scan',       icon: <Scan size={20} weight="regular" />,        label: 'Scan' },
  { to: '/map',        icon: <MapPin size={20} weight="regular" />,      label: 'Map' },
  { to: '/queue',      icon: <ListBullets size={20} weight="regular" />, label: 'Queue' },
  { to: '/review',     icon: <Checks size={20} weight="regular" />,      label: 'Review' },
  { to: '/work-orders',icon: <Kanban size={20} weight="regular" />,      label: 'Work Orders' },
  { to: '/planner',    icon: <Wrench size={20} weight="regular" />,      label: 'Planner' },
  { to: '/segments',   icon: <LineSegments size={20} weight="regular" />, label: 'Segments' },
  { to: '/model-lab',  icon: <Flask size={20} weight="regular" />,       label: 'Model Lab' },
  { to: '/citizen',    icon: <UserCircle size={20} weight="regular" />,  label: 'Citizen' },
];

const BOTTOM_ITEMS: NavItem[] = [
  { to: '/design',   icon: <Palette size={20} weight="regular" />,  label: 'Design' },
  { to: '/settings', icon: <Gear size={20} weight="regular" />,     label: 'Settings' },
];

function RailItem({ to, icon, label }: NavItem) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      title={label}
      aria-label={label}
      className={({ isActive }) =>
        [
          'group relative flex flex-col items-center justify-center w-full py-3 transition-colors duration-100',
          'text-[rgba(236,232,221,0.5)] hover:text-[var(--marking)]',
          isActive ? 'text-[var(--marking)]' : '',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {/* Active yellow dashed segment indicator */}
          {isActive && (
            <span
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8"
              style={{
                backgroundImage: 'repeating-linear-gradient(180deg, var(--marking) 0, var(--marking) 6px, transparent 6px, transparent 10px)',
              }}
              aria-hidden="true"
            />
          )}
          <span className="flex items-center justify-center">{icon}</span>
          {/* Label tooltip on hover */}
          <span className="absolute left-full ml-2 px-2 py-1 bg-[var(--asphalt)] text-[var(--marking)] text-xs font-medium rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-100 border border-[rgba(255,255,255,0.08)] z-50 font-sans">
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export function NavRail() {
  return (
    <nav className="nav-rail" aria-label="Main navigation">
      {/* Logomark */}
      <div className="flex items-center justify-center w-full py-3 mb-1 border-b border-[rgba(255,255,255,0.06)]">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Marga logo">
          {/* Two converging lane lines forming an M */}
          <path d="M4 24 L14 6 L24 24" stroke="#F2C230" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          <path d="M9 24 L14 14 L19 24" stroke="#F2C230" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          {/* Road stud dots */}
          <circle cx="14" cy="6" r="1.5" fill="#F2C230"/>
        </svg>
      </div>

      {/* Main nav */}
      <div className="flex flex-col w-full flex-1 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => (
          <RailItem key={item.to} {...item} />
        ))}
      </div>

      {/* Bottom items */}
      <div className="flex flex-col w-full border-t border-[rgba(255,255,255,0.06)]">
        {BOTTOM_ITEMS.map((item) => (
          <RailItem key={item.to} {...item} />
        ))}
      </div>
    </nav>
  );
}
