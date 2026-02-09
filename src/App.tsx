import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Courses } from './pages/Courses';
import { CourseDetails } from './pages/CourseDetails';
import { Sections } from './pages/Sections';
import { SectionDetails } from './pages/SectionDetails';
import { Students } from './pages/Students';
import { Professors } from './pages/Professors';
import { Payments } from './pages/Payments';
import { Attendance } from './pages/Attendance';
import { Schedule } from './pages/Schedule';
import { ConfirmationProvider } from './context/ConfirmationContext';
import { BackButtonProvider } from './context/BackButtonContext';

const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout />,
        children: [
            { index: true, element: <Dashboard /> },
            { path: 'schedule', element: <Schedule /> },
            { path: 'courses', element: <Courses /> },
            { path: 'courses/:id', element: <CourseDetails /> },
            { path: 'sections', element: <Sections /> },
            { path: 'sections/:id', element: <SectionDetails /> },
            { path: 'attendance', element: <Attendance /> },
            { path: 'students', element: <Students /> },
            { path: 'professors', element: <Professors /> },
            { path: 'payments', element: <Payments /> },
        ]
    }
], {
    basename: import.meta.env.BASE_URL
});

function App() {
    return (
        <ConfirmationProvider>
            <BackButtonProvider>
                <RouterProvider router={router} />
            </BackButtonProvider>
        </ConfirmationProvider>
    );
}

export default App;
