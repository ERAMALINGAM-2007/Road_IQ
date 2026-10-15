import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/shell/AppShell';
import { DesignPage } from '@/routes/design/DesignPage';
import { ComingSoon } from '@/components/shell/ComingSoon';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true,            element: <ComingSoon name="Briefing" /> },
      { path: 'scan',           element: <ComingSoon name="Scan" /> },
      { path: 'map',            element: <ComingSoon name="Map" /> },
      { path: 'queue',          element: <ComingSoon name="Priority Queue" /> },
      { path: 'review',         element: <ComingSoon name="Review Queue" /> },
      { path: 'work-orders',    element: <ComingSoon name="Work Orders" /> },
      { path: 'planner',        element: <ComingSoon name="Planner" /> },
      { path: 'segments',       element: <ComingSoon name="Segments & Reports" /> },
      { path: 'model-lab',      element: <ComingSoon name="Model Lab" /> },
      { path: 'citizen',        element: <ComingSoon name="Citizen Portal" /> },
      { path: 'settings',       element: <ComingSoon name="Settings" /> },
      { path: 'design',         element: <DesignPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
