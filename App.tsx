import React, { useState, useEffect } from 'react';
import { 
    fetchUser,
    fetchRepos,
    forkRepo,
} from './services/githubService';
import type { GithubUser, GithubRepo } from './types';
import { 
    EdgeDeployLogo, 
    SunIcon, 
    MoonIcon,
    SpinnerIcon,
    RepoIcon,
    LockClosedIcon,
    SearchIcon,
    SparklesIcon,
    GithubIcon,
    ExternalLinkIcon,
    CheckCircleIcon,
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

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" {...props} />
);

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
    const [repos, setRepos] = useState<GithubRepo[]>([]);
    const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [isDeployingTemplate, setIsDeployingTemplate] = useState(false);
    const [deployedRepoInfo, setDeployedRepoInfo] = useState<{ name: string; githubUrl: string; liveUrl: string } | null>(null);

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
        setRepos([]);
        setDeployedRepoInfo(null);
    };

    useEffect(() => {
        if (githubToken && !user) {
            handleConnect(githubToken);
        }
    }, [githubToken, user]);

    useEffect(() => {
        if (user && githubToken) {
            setLoading('repos', true);
            fetchRepos(githubToken)
                .then(setRepos)
                .catch(err => setError(err.message))
                .finally(() => setLoading('repos', false));
        }
    }, [user, githubToken]);

    const handleDeployTemplate = async (templateOwner: string, templateRepo: string) => {
        if (!githubToken) return;

        setIsDeployingTemplate(true);
        setError(null);
        setDeployedRepoInfo(null);
        try {
            const newRepo = await forkRepo(githubToken, templateOwner, templateRepo);
            
            // Forking can take a moment for the repo to be available via API.
            await new Promise(resolve => setTimeout(resolve, 3000));

            setDeployedRepoInfo({
                name: newRepo.full_name,
                githubUrl: newRepo.html_url,
                liveUrl: `https://stackblitz.com/github/${newRepo.full_name}`
            });
            // Refresh repo list in background
            fetchRepos(githubToken).then(setRepos);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fork the template repository. It may already exist in your account.");
        } finally {
            setIsDeployingTemplate(false);
        }
    };
    
    const handleDeployExistingRepo = (repo: GithubRepo) => {
        setDeployedRepoInfo({
            name: repo.full_name,
            githubUrl: repo.html_url,
            liveUrl: `https://stackblitz.com/github/${repo.full_name}`
        });
    };

    if (!githubToken || !user) {
        return <AuthScreen onConnect={handleConnect} isLoading={isLoading['auth']} error={error} />;
    }
    
    const filteredRepos = repos.filter(repo => repo.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const template = {
        owner: 'Hassannewcode',
        repo: 'Gemini-Toolkit-AI-Chat-Template',
        name: 'Gemini AI Chat Template',
        description: 'A Next.js template for building a full-featured, hackable AI chatbot with the Gemini API.',
        icon: <SparklesIcon className="w-8 h-8 text-primary" />
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <header className="flex items-center justify-between px-4 sm:px-6 h-16 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                <div className="flex items-center gap-4">
                    <EdgeDeployLogo className="text-foreground h-6 w-6"/>
                    <span className="font-semibold text-md">{user.name || user.login}'s Deployer</span>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4">
                     <ThemeToggle theme={theme} setTheme={setTheme} />
                    <button onClick={handleLogout} title="Log out">
                        <img src={user.avatar_url} alt={user.login} className="w-8 h-8 rounded-full border-2 border-border" />
                    </button>
                </div>
            </header>
            
            <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 mb-6 rounded-md text-sm" role="alert">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {deployedRepoInfo ? (
                    <div className="bg-card border border-border rounded-lg text-center p-8 sm:p-12 animate-in fade-in-0 zoom-in-95">
                        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Deployment Ready!</h2>
                        <p className="text-muted-foreground mb-6">
                            Your project <span className="font-semibold text-foreground">{deployedRepoInfo.name}</span> is ready to view.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <a href={deployedRepoInfo.liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none h-11 px-8 text-base bg-primary text-primary-foreground hover:opacity-90">
                                <ExternalLinkIcon className="w-4 h-4 mr-2" />
                                Open Live Preview
                            </a>
                            <a href={deployedRepoInfo.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none h-11 px-8 text-base bg-secondary text-secondary-foreground hover:bg-accent">
                                <GithubIcon className="w-4 h-4 mr-2" />
                                View on GitHub
                            </a>
                        </div>
                        <Button variant="ghost" onClick={() => setDeployedRepoInfo(null)} className="mt-8">
                            Deploy another project
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-12">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight mb-2">Deploy a Project</h1>
                            <p className="text-muted-foreground">Start with a template or deploy an existing repository from your GitHub account.</p>
                        </div>

                        <div className="bg-card border-2 border-primary/50 rounded-lg p-6 flex flex-col sm:flex-row justify-between items-center gap-6 shadow-lg shadow-primary/10">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className="bg-secondary p-3 rounded-lg flex-shrink-0">{template.icon}</div>
                                <div className="truncate">
                                    <p className="font-semibold text-lg truncate">{template.name}</p>
                                    <p className="text-sm text-muted-foreground truncate">{template.description}</p>
                                </div>
                            </div>
                            <Button 
                                size="lg"
                                onClick={() => handleDeployTemplate(template.owner, template.repo)}
                                disabled={isDeployingTemplate}
                                className="w-full sm:w-auto flex-shrink-0"
                            >
                                {isDeployingTemplate ? (
                                    <>
                                        <SpinnerIcon className="w-4 h-4 mr-2" />
                                        Deploying...
                                    </>
                                ) : 'Deploy Template'}
                            </Button>
                        </div>
                        
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight mb-4">Your Repositories</h2>
                            <div className="relative mb-4">
                                <SearchIcon className="w-4 h-4 absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                                <Input 
                                    placeholder="Search your repositories..." 
                                    className="pl-9" 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="bg-card border border-border rounded-lg">
                                {isLoading['repos'] ? (
                                    <p className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                                        <SpinnerIcon className="w-4 h-4" /> Loading repositories...
                                    </p>
                                ) : filteredRepos.length > 0 ? (
                                    <div className="divide-y divide-border">
                                        {filteredRepos.map(repo => (
                                            <div key={repo.id} className="p-4 flex justify-between items-center">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <RepoIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                                    <div className="truncate">
                                                        <p className="font-semibold truncate">{repo.full_name}</p>
                                                        {repo.private && (
                                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                <LockClosedIcon className="w-3 h-3" />
                                                                <span>Private</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button variant="secondary" size="sm" onClick={() => handleDeployExistingRepo(repo)} className="flex-shrink-0">
                                                    Deploy
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="p-8 text-center text-muted-foreground">
                                        {searchTerm ? 'No repositories match your search.' : 'No repositories found.'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;