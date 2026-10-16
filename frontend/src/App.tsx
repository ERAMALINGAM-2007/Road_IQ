import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/shell/AppShell';
import { BriefingPage } from '@/routes/briefing/BriefingPage';
import { ScanPage } from '@/routes/scan/ScanPage';
import { MapPage } from '@/routes/map/MapPage';
import { QueuePage } from '@/routes/queue/QueuePage';
import { ReviewPage } from '@/routes/review/ReviewPage';
import { WorkOrdersPage } from '@/routes/workorders/WorkOrdersPage';
import { PlannerPage } from '@/routes/planner/PlannerPage';
import { ModelLabPage } from '@/routes/modellab/ModelLabPage';
import { CitizenPage } from '@/routes/citizen/CitizenPage';
import { SegmentsPage } from '@/routes/segments/SegmentsPage';
import { SettingsPage } from '@/routes/settings/SettingsPage';
import { DesignPage } from '@/routes/design/DesignPage';

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
      { path: 'work-orders', element: <WorkOrdersPage /> },
      { path: 'planner',     element: <PlannerPage /> },
      { path: 'segments',    element: <SegmentsPage /> },
      { path: 'model-lab',   element: <ModelLabPage /> },
      { path: 'citizen',     element: <CitizenPage /> },
      { path: 'settings',    element: <SettingsPage /> },
      { path: 'design',      element: <DesignPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}

