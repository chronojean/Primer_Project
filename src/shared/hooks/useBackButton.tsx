import React, { createContext, useContext, useEffect, useState } from 'react';

type BackHandler = () => boolean | Promise<boolean>;

interface BackButtonContextType {
    handler: BackHandler | null;
    setHandler: (handler: BackHandler | null) => void;
}

const BackButtonContext = createContext<BackButtonContextType | undefined>(undefined);

export const BackButtonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [handler, setHandler] = useState<BackHandler | null>(null);

    return (
        <BackButtonContext.Provider value={{ handler, setHandler }}>
            {children}
        </BackButtonContext.Provider>
    );
};

export const useBackButton = (handler: BackHandler | null, deps: React.DependencyList = []) => {
    const context = useContext(BackButtonContext);
    if (!context) {
        throw new Error('useBackButton must be used within a BackButtonProvider');
    }
    const { setHandler } = context;

    useEffect(() => {
        setHandler(handler ? () => handler : null);
        return () => setHandler(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
};

export const useBackButtonHandler = () => {
    const context = useContext(BackButtonContext);
    if (!context) {
        throw new Error('useBackButtonHandler must be used within a BackButtonProvider');
    }
    return context.handler;
};
