
import React, { useState, useCallback, useEffect } from 'react';
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
    GithubIcon,
    CheckCircleIcon,
    ExternalLinkIcon
} from './components/icons';
import { AuthScreen } from './components/AuthScreen';

type Theme = 'light' | 'dark';

const TEMPLATE_OWNER = 'Hassannewcode';
const TEMPLATE_REPO = 'Gemini-Toolkit-AI-Chat-Template';
const TEMPLATE_NAME = 'Gemini AI Chat Template';
const TEMPLATE_DESCRIPTION = 'A Next.js template for building a full-featured, hackable AI chatbot with the Gemini API.';

const App: React.FC = () => {
    const [githubToken, setGithubToken] = useState<string | null>(localStorage.getItem('github_token'));
    const [user, setUser] = useState<GithubUser | null>(null);
    const [theme, setTheme] = useState<Theme>((localStorage.getItem('edgedeploy-theme') as Theme) || 'light');
    
    const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);

    const [isDeploying, setIsDeploying] = useState<boolean>(false);
    const [deployedRepo, setDeployedRepo] = useState<GithubRepo | null>(null);

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
        setDeployedRepo(null);
        setError(null);
    };

    useEffect(() => {
        if (githubToken && !user) {
            handleConnect(githubToken);
        }
    }, [githubToken, user]);

    const handleDeploy = async () => {
        if (!githubToken) return;
        
        setIsDeploying(true);
        setError(null);
        setDeployedRepo(null);

        try {
            const newRepo = await forkRepo(githubToken, TEMPLATE_OWNER, TEMPLATE_REPO);
            
            // Forking can take a moment for the repo to be available via API.
            await new Promise(resolve => setTimeout(resolve, 3000));

            setDeployedRepo(newRepo);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fork the template repository. It may already exist in your account.");
        } finally {
            setIsDeploying(false);
        }
    };

    const handleDeployAnother = () => {
        setDeployedRepo(null);
        setError(null);
    }
    
    if (!githubToken || !user) {
        return <AuthScreen onConnect={handleConnect} isLoading={isLoading['auth']} error={error} />;
    }
    
    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <header className="flex items-center justify-between px-4 sm:px-6 h-16 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                <div className="flex items-center gap-4">
                    <EdgeDeployLogo className="text-foreground h-6 w-6"/>
                     <div className="font-semibold text-md">{user.name || user.login}'s Dashboard</div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4">
                     <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground">
                        <SunIcon className="w-5 h-5 dark:hidden" />
                        <MoonIcon className="w-5 h-5 hidden dark:block" />
                    </button>
                    <button onClick={handleLogout} title="Log out">
                        <img src={user.avatar_url} alt={user.login} className="w-8 h-8 rounded-full border-2 border-border" />
                    </button>
                </div>
            </header>
            
            <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
                 {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive-foreground/80 p-4 mb-8 rounded-md text-sm" role="alert">
                        <strong>Deployment Failed:</strong> {error}
                    </div>
                )}

                {deployedRepo ? (
                    <div className="bg-card border border-border rounded-lg text-center p-8 sm:p-12 animate-in fade-in-0 zoom-in-95">
                        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h1 className="text-3xl font-bold text-card-foreground mb-2">Deployment Successful!</h1>
                        <p className="text-muted-foreground mb-8">
                            Your new repository <a href={deployedRepo.html_url} target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline">{deployedRepo.full_name}</a> is ready.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <a 
                                href={`https://stackblitz.com/github/${deployedRepo.full_name}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-md text-base transition-colors hover:opacity-90 disabled:opacity-50"
                            >
                                View Live Deployment <ExternalLinkIcon className="w-4 h-4" />
                            </a>
                            <a 
                                href={deployedRepo.html_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground font-semibold px-6 py-3 rounded-md text-base transition-colors hover:bg-accent"
                            >
                                View on GitHub <GithubIcon className="w-4 h-4" />
                            </a>
                        </div>
                         <div className="mt-12">
                            <button onClick={handleDeployAnother} className="text-sm text-primary hover:underline">
                                Deploy another project
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-card border border-border rounded-lg p-8 sm:p-12">
                        <div className="text-center">
                            <h1 className="text-3xl font-bold text-card-foreground mb-2">{TEMPLATE_NAME}</h1>
                            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">{TEMPLATE_DESCRIPTION}</p>
                        </div>
                        <div className="bg-muted/50 border border-border rounded-lg p-6 flex flex-col items-center">
                             <p className="text-sm text-muted-foreground mb-4">Click the button below to fork the repository to your GitHub account.</p>
                            <button
                                onClick={handleDeploy}
                                disabled={isDeploying}
                                className="w-full max-w-xs flex justify-center items-center gap-3 bg-primary text-primary-foreground font-semibold px-4 py-3 rounded-md text-base transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                            {isDeploying ? (
                                <SpinnerIcon className="w-5 h-5" />
                            ) : (
                                <GithubIcon className="w-5 h-5" />
                            )}
                            {isDeploying ? 'Deploying...' : 'Deploy with One Click'}
                            </button>
                            {isDeploying && (
                                <p className="text-sm text-muted-foreground mt-4 animate-pulse">
                                    Creating repository in your account, this may take a moment...
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
