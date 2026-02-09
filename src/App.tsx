import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { ConfirmationProvider } from './shared/hooks/useConfirmation';

function App() {
    return (
        <ConfirmationProvider>
            <RouterProvider router={router} />
        </ConfirmationProvider>
    );
}

export default App;
