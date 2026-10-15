import { Outlet } from 'react-router-dom';
import { NavRail } from './NavRail';
import { TopStrip } from './TopStrip';

export function AppShell() {
  return (
    <>
      <TopStrip />
      <div className="app-layout">
        <NavRail />
        <main className="main-content" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </>
  );
}
