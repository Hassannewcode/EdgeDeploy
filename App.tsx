import React, { useState, useEffect } from 'react';
import { 
    fetchUser,
    forkRepo,
} from './services/githubService';
import type { GithubUser, GithubRepo } from './types';
import { 
    EdgeDeployLogo, 
    SunIcon, 
    MoonIcon,
    SpinnerIcon,
    SparklesIcon,
    GithubIcon,
    CheckCircleIcon,
    ExternalLinkIcon,
} from './components/icons';
import { AuthScreen } from './components/AuthScreen';

type Theme = 'light' | 'dark';

// --- Reusable UI Components ---
const Button = ({children, variant = 'primary', size = 'default', ...props}: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: 'primary' | 'secondary' | 'ghost' | 'destructive', size?: 'default' | 'sm' | 'icon' | 'lg' }) => {
    const variants = {
        primary: 'bg-primary text-primary-foreground hover:opacity-90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
    };
    const sizes = {
        default: 'px-4 py-2',
        sm: 'h-9 px-3',
        icon: 'h-10 w-10',
        lg: 'h-11 px-8 text-base',
    }
    return (
        <button className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${sizes[size]} ${variants[variant]}`} {...props}>
            {children}
        </button>
    )
}

const ThemeToggle: React.FC<{ theme: Theme; setTheme: (theme: Theme) => void }> = ({ theme, setTheme }) => {
    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
    return (
        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground">
            <SunIcon className="w-5 h-5 dark:hidden" />
            <MoonIcon className="w-5 h-5 hidden dark:block" />
        </button>
    );
};

const App: React.FC = () => {
    const [githubToken, setGithubToken] = useState<string | null>(localStorage.getItem('github_token'));
    const [user, setUser] = useState<GithubUser | null>(null);
    const [theme, setTheme] = useState<Theme>((localStorage.getItem('edgedeploy-theme') as Theme) || 'light');
    
    const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);
    const [newlyCreatedRepo, setNewlyCreatedRepo] = useState<GithubRepo | null>(null);

    useEffect(() => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
        localStorage.setItem('edgedeploy-theme', theme);
    }, [theme]);

    const setLoading = (key: string, value: boolean) => setIsLoading(prev => ({...prev, [key]: value}));

    const handleConnect = async (token: string) => {
        setLoading('auth', true);
        setError(null);
        try {
            const userData = await fetchUser(token);
            setUser(userData);
            setGithubToken(token);
            localStorage.setItem('github_token', token);
        } catch(err) {
            setError(err instanceof Error ? err.message : "Failed to verify token.");
            localStorage.removeItem('github_token');
        } finally {
            setLoading('auth', false);
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('github_token');
        setGithubToken(null);
        setUser(null);
        setNewlyCreatedRepo(null);
        setError(null);
    };

    useEffect(() => {
        if (githubToken && !user) {
            handleConnect(githubToken);
        }
    }, [githubToken, user]);

    const handleDeploy = async () => {
        if (!githubToken) return;

        setLoading('deploy', true);
        setError(null);
        try {
            // Forking can take a moment for the repo to be available via API.
            const newRepo = await forkRepo(githubToken, 'Hassannewcode', 'Gemini-Toolkit-AI-Chat-Template');
            await new Promise(resolve => setTimeout(resolve, 2000));
            setNewlyCreatedRepo(newRepo);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fork the template repository. It may already exist in your account.");
        } finally {
            setLoading('deploy', false);
        }
    };
    
    if (!githubToken || !user) {
        return <AuthScreen onConnect={handleConnect} isLoading={isLoading['auth']} error={error} />;
    }
    
    const renderContent = () => {
        if (newlyCreatedRepo) {
            return (
                <div className="bg-card border border-border rounded-lg">
                    <div className="p-8 flex flex-col items-center text-center">
                        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Deployment Initiated!</h2>
                        <p className="text-muted-foreground mb-4">
                            We've successfully created your new project repository.
                        </p>
                        <div className="bg-secondary p-3 rounded-md font-mono text-sm mb-6 w-full text-center">
                            {newlyCreatedRepo.full_name}
                        </div>
                        <p className="text-muted-foreground mb-6 text-sm">
                            A deployment workflow has been automatically started. You can monitor its progress in the "Actions" tab of your new repository.
                        </p>
                        <a href={`https://github.com/${newlyCreatedRepo.full_name}`} target="_blank" rel="noopener noreferrer">
                            <Button size="lg">
                                View on GitHub <ExternalLinkIcon className="w-4 h-4 ml-2" />
                            </Button>
                        </a>
                    </div>
                </div>
            )
        }

        return (
             <div className="bg-card border border-border rounded-lg">
                <div className="p-8 flex flex-col items-center text-center">
                    <div className="bg-secondary p-4 rounded-lg mb-6">
                        <SparklesIcon className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Deploy Gemini AI Chat Template</h2>
                    <p className="text-muted-foreground mb-8 max-w-md">
                        A Next.js template for building a full-featured, hackable AI chatbot with the Gemini API. One click to fork and deploy.
                    </p>
                    <Button size="lg" onClick={handleDeploy} disabled={isLoading['deploy']}>
                        {isLoading['deploy'] ? <SpinnerIcon className="w-5 h-5 mr-2" /> : <GithubIcon className="w-5 h-5 mr-2" />}
                        {isLoading['deploy'] ? 'Deploying to Your GitHub...' : 'Deploy with GitHub'}
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <header className="flex items-center justify-between px-4 sm:px-6 h-16 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                <div className="flex items-center gap-4">
                    <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }} className="flex items-center gap-4">
                        <EdgeDeployLogo className="text-foreground h-6 w-6"/>
                         <h1 className="font-semibold text-lg">EdgeDeploy</h1>
                    </a>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4">
                     <ThemeToggle theme={theme} setTheme={setTheme} />
                    <button onClick={handleLogout} title="Log out">
                        <img src={user.avatar_url} alt={user.login} className="w-8 h-8 rounded-full border-2 border-border" />
                    </button>
                </div>
            </header>
            
            <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
                 {renderContent()}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 mt-6 rounded-md text-sm text-center">
                        <strong>Error:</strong> {error}
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;