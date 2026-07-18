import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './Pages/Home';
import EditorPage from './Pages/EditorPage';
import { AppThemeProvider, useAppTheme } from './theme/AppThemeContext';

const AppShell = () => {
    const { theme } = useAppTheme();
    const isDark = theme === 'dark';

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900 antialiased selection:bg-sync selection:text-[#07141a] dark:bg-canvas dark:text-white">
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3500,
                    style: {
                        background: isDark ? '#0b0e22' : '#ffffff',
                        color: isDark ? '#ffffff' : '#172033',
                        border: isDark
                            ? '1px solid rgba(104, 227, 176, 0.16)'
                            : '1px solid rgba(30, 41, 59, 0.1)',
                        borderRadius: '12px',
                        boxShadow: isDark
                            ? '0 18px 50px rgba(0, 0, 0, 0.38)'
                            : '0 18px 50px rgba(35, 50, 75, 0.14)',
                    },
                    success: {
                        iconTheme: {
                            primary: '#53e29c',
                            secondary: isDark ? '#080a1b' : '#ffffff',
                        },
                    },
                }}
            />
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/editor/:roomId" element={<EditorPage />} />
                </Routes>
            </BrowserRouter>
        </div>
    );
};

function App() {
    return (
        <AppThemeProvider>
            <AppShell />
        </AppThemeProvider>
    );
}

export default App;
