import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/shell/AppShell';
import { BriefingPage } from '@/routes/briefing/BriefingPage';
import { ScanPage } from '@/routes/scan/ScanPage';
import { MapPage } from '@/routes/map/MapPage';
import { QueuePage } from '@/routes/queue/QueuePage';
import { ReviewPage } from '@/routes/review/ReviewPage';
import { DesignPage } from '@/routes/design/DesignPage';
import { ComingSoon } from '@/components/shell/ComingSoon';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true,         element: <BriefingPage /> },
      { path: 'scan',        element: <ScanPage /> },
      { path: 'map',         element: <MapPage /> },
      { path: 'queue',       element: <QueuePage /> },
      { path: 'review',      element: <ReviewPage /> },
      { path: 'work-orders', element: <ComingSoon name="Work Orders" /> },
      { path: 'planner',     element: <ComingSoon name="Planner" /> },
      { path: 'segments',    element: <ComingSoon name="Segments & Reports" /> },
      { path: 'model-lab',   element: <ComingSoon name="Model Lab" /> },
      { path: 'citizen',     element: <ComingSoon name="Citizen Portal" /> },
      { path: 'settings',    element: <ComingSoon name="Settings" /> },
      { path: 'design',      element: <DesignPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
