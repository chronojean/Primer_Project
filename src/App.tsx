import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { ConfirmationProvider } from './shared/hooks/useConfirmation';
import { BackButtonProvider } from './shared/hooks/useBackButton';

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
