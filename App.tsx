import React, { useState, useEffect, useCallback } from 'react';
import { 
    fetchUser, 
    fetchRepos, 
    fetchBranches, 
    fetchFileTree, 
    fetchFileContent,
    getWorkflowRuns,
} from './services/githubService';
import { explainCode } from './services/geminiService';
import type { GithubUser, GithubRepo, GithubBranch, GithubTreeItem, GithubWorkflowRun } from './types';
import { View } from './types';
import { 
    EdgeDeployLogo, 
    SunIcon, 
    MoonIcon,
    SpinnerIcon,
    GithubIcon,
    LayoutDashboardIcon,
    FileCodeIcon,
    SettingsIcon,
    RepoIcon,
    LockClosedIcon,
    SearchIcon,
    ChevronDownIcon,
    ExternalLinkIcon,
} from './components/icons';
import { AuthScreen } from './components/AuthScreen';
import { FileTree } from './components/FileTree';
import { CodeViewer } from './components/CodeViewer';
import { DeploymentsView } from './components/DeploymentView';
import { StatusView } from './components/StatusView';

type Theme = 'light' | 'dark';

// --- Reusable UI Components ---
const Button = ({children, variant = 'primary', size = 'default', ...props}: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: 'primary' | 'secondary' | 'ghost' | 'destructive', size?: 'default' | 'sm' | 'icon' | 'lg', asChild?: boolean }) => {
    const variants = {
        primary: 'bg-primary text-primary-foreground hover:opacity-90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
    };
    const sizes = {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        icon: 'h-10 w-10',
        lg: 'h-11 px-8 text-base',
    }
    const El = props.asChild ? 'span' : 'button';
    return (
        <El className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${sizes[size]} ${variants[variant]}`} {...props}>
            {children}
        </El>
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

    // Dashboard State
    const [repos, setRepos] = useState<GithubRepo[]>([]);
    const [filteredRepos, setFilteredRepos] = useState<GithubRepo[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Project View State
    const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
    const [view, setView] = useState<View>(View.DEPLOYMENTS);
    const [branches, setBranches] = useState<GithubBranch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
    
    // Source View State
    const [tree, setTree] = useState<GithubTreeItem[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [codeExplanation, setCodeExplanation] = useState<string | null>(null);

    // Deployment View State
    const [runs, setRuns] = useState<GithubWorkflowRun[]>([]);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
        localStorage.setItem('edgedeploy-theme', theme);
    }, [theme]);

    const setLoading = (key: string, value: boolean) => setIsLoading(prev => ({...prev, [key]: value}));
    const clearError = () => setError(null);

    const handleConnect = async (token: string) => {
        setLoading('auth', true);
        clearError();
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
        setSelectedRepo(null);
        setRepos([]);
        setError(null);
    };

    // Initial auth check
    useEffect(() => {
        if (githubToken && !user) {
            handleConnect(githubToken);
        }
    }, [githubToken, user]);

    // Fetch repos on login
    useEffect(() => {
        if (user && githubToken) {
            setLoading('repos', true);
            fetchRepos(githubToken)
                .then(setRepos)
                .catch(err => setError(err.message))
                .finally(() => setLoading('repos', false));
        }
    }, [user, githubToken]);

    // Filter repos on search
    useEffect(() => {
        setFilteredRepos(
            repos.filter(repo => repo.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [searchTerm, repos]);

    // Fetch branches when a repo is selected
    useEffect(() => {
        if (selectedRepo && githubToken) {
            setLoading('branches', true);
            fetchBranches(githubToken, selectedRepo.owner.login, selectedRepo.name)
                .then(branchData => {
                    setBranches(branchData);
                    // Attempt to set main/master as default, or first branch
                    const defaultBranch = branchData.find(b => b.name === 'main') || branchData.find(b => b.name === 'master') || branchData[0];
                    if (defaultBranch) {
                        setSelectedBranch(defaultBranch.name);
                    }
                })
                .catch(err => setError(`Failed to fetch branches: ${err.message}`))
                .finally(() => setLoading('branches', false));
        }
    }, [selectedRepo, githubToken]);

    // Fetch data for the selected branch (deployments, files)
    const fetchBranchData = useCallback(async () => {
        if (!selectedRepo || !selectedBranch || !githubToken) return;

        setLoading('branchData', true);
        clearError();
        // Reset file view state
        setSelectedFile(null);
        setFileContent(null);
        setCodeExplanation(null);

        try {
            const [runsData, treeData] = await Promise.all([
                getWorkflowRuns(githubToken, selectedRepo.owner.login, selectedRepo.name, selectedBranch),
                fetchFileTree(githubToken, selectedRepo.owner.login, selectedRepo.name, selectedBranch)
            ]);
            setRuns(runsData.workflow_runs);
            setTree(treeData);
            
            const latestSuccess = runsData.workflow_runs.find(r => r.status === 'completed' && r.conclusion === 'success');
            if (latestSuccess) {
                setPreviewUrl(`https://stackblitz.com/github/${selectedRepo.full_name}/tree/${selectedBranch}`);
            } else {
                setPreviewUrl(null);
            }

        } catch (err) {
            setError(`Failed to load data for branch "${selectedBranch}": ${err.message}`);
            setRuns([]);
            setTree([]);
        } finally {
            setLoading('branchData', false);
        }
    }, [selectedRepo, selectedBranch, githubToken]);

    useEffect(() => {
        fetchBranchData();
    }, [fetchBranchData]);

    const handleFileSelect = async (path: string) => {
        if (!selectedRepo || !selectedBranch || !githubToken) return;
        setLoading('file', true);
        setSelectedFile(path);
        setCodeExplanation(null);
        try {
            const content = await fetchFileContent(githubToken, selectedRepo.owner.login, selectedRepo.name, path, selectedBranch);
            setFileContent(content);
        } catch (err) {
            setError(`Failed to load file content: ${err.message}`);
            setFileContent('Could not load file.');
        } finally {
            setLoading('file', false);
        }
    };

    const handleExplainCode = async () => {
        if (!fileContent || !selectedFile) return;
        setLoading('explain', true);
        setCodeExplanation(''); // Clear previous explanation
        try {
            const explanation = await explainCode(fileContent, selectedFile);
            setCodeExplanation(explanation);
        } catch (err) {
            setError(`AI analysis failed: ${err.message}`);
        } finally {
            setLoading('explain', false);
        }
    };
    
    const handleRepoSelect = (repo: GithubRepo) => {
        setSelectedRepo(repo);
        setView(View.DEPLOYMENTS); // Default to deployments view
    };

    const handleBackToDashboard = () => {
        setSelectedRepo(null);
        // Clear project-specific state
        setBranches([]);
        setSelectedBranch(null);
        setTree([]);
        setSelectedFile(null);
        setFileContent(null);
        setRuns([]);
        clearError();
    };

    if (!githubToken || !user) {
        return <AuthScreen onConnect={handleConnect} isLoading={isLoading['auth']} error={error} />;
    }
    
    const renderProjectView = () => {
        if (!selectedRepo) return null;
        
        const NavItem: React.FC<{
            targetView: View,
            icon: React.ReactNode,
            label: string
        }> = ({ targetView, icon, label }) => (
            <button 
                onClick={() => setView(targetView)}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${view === targetView ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
            >
                {icon} {label}
            </button>
        );

        return (
            <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <button onClick={handleBackToDashboard} className="text-sm text-muted-foreground hover:text-foreground mb-1">&larr; All Projects</button>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                           <RepoIcon className="w-5 h-5 text-muted-foreground"/> {selectedRepo.full_name}
                        </h1>
                    </div>
                    {branches.length > 0 && (
                        <div className="relative">
                            <select
                                value={selectedBranch || ''}
                                onChange={e => setSelectedBranch(e.target.value)}
                                className="pl-4 pr-8 py-2 text-sm font-medium bg-card border border-border rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                                disabled={isLoading['branches'] || isLoading['branchData']}
                            >
                               {branches.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                            </select>
                            <ChevronDownIcon className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                        </div>
                    )}
                </div>

                <div className="border-b border-border mt-6 mb-6">
                    <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
                        <button onClick={() => setView(View.DEPLOYMENTS)} className={`py-3 border-b-2 ${view === View.DEPLOYMENTS ? 'border-primary text-primary' : 'border-transparent hover:text-foreground'}`}>Deployments</button>
                        <button onClick={() => setView(View.SOURCE)} className={`py-3 border-b-2 ${view === View.SOURCE ? 'border-primary text-primary' : 'border-transparent hover:text-foreground'}`}>Source</button>
                        <button onClick={() => setView(View.SETTINGS)} className={`py-3 border-b-2 ${view === View.SETTINGS ? 'border-primary text-primary' : 'border-transparent hover:text-foreground'}`}>Settings</button>
                    </nav>
                </div>
                
                {isLoading['branchData'] && (
                     <div className="flex justify-center items-center py-20">
                        <SpinnerIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                )}

                {!isLoading['branchData'] && (
                    <div className="animate-fade-in">
                        {view === View.DEPLOYMENTS && <DeploymentsView runs={runs} previewUrl={previewUrl} />}
                        {view === View.SOURCE && (
                            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 h-[calc(100vh-250px)]">
                                <div className="bg-card border border-border rounded-lg p-2 overflow-y-auto">
                                    <FileTree treeData={tree} onFileSelect={handleFileSelect} selectedFile={selectedFile} />
                                </div>
                                <CodeViewer 
                                    fileName={selectedFile} 
                                    content={fileContent}
                                    isLoading={isLoading['file']}
                                    onExplain={handleExplainCode}
                                    isExplaining={!!isLoading['explain']}
                                    explanation={codeExplanation}
                                />
                            </div>
                        )}
                        {view === View.SETTINGS && <StatusView user={user} />}
                    </div>
                )}
            </>
        )
    }

    const renderDashboard = () => (
         <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-2xl font-bold text-foreground">Projects</h1>
                <div className="relative w-full sm:w-64">
                    <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input 
                        type="text" 
                        placeholder="Search projects..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-card border border-input rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>
            </div>
            
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading['repos'] && Array.from({length: 6}).map((_, i) => (
                     <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
                        <div className="h-5 bg-muted rounded w-3/4 mb-3"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                    </div>
                ))}

                {!isLoading['repos'] && filteredRepos.map(repo => (
                    <button key={repo.id} onClick={() => handleRepoSelect(repo)} className="text-left bg-card border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
                        <div className="flex items-center gap-2 font-semibold text-card-foreground">
                            <RepoIcon className="w-4 h-4 text-muted-foreground"/>
                            {repo.name}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            {repo.private && <LockClosedIcon className="w-3 h-3"/>}
                            <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                        </div>
                    </button>
                ))}
            </div>
        </>
    )

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <header className="flex items-center justify-between px-4 sm:px-6 h-16 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                <a href="#" onClick={(e) => { e.preventDefault(); handleBackToDashboard(); }} className="flex items-center gap-4">
                    <EdgeDeployLogo className="text-foreground h-6 w-6"/>
                    <h1 className="font-semibold text-lg hidden sm:block">EdgeDeploy</h1>
                </a>
                <div className="flex items-center space-x-2 sm:space-x-4">
                     <ThemeToggle theme={theme} setTheme={setTheme} />
                     <a href={user.html_url} target="_blank" rel="noopener noreferrer" title={`View ${user.login} on GitHub`}>
                        <img src={user.avatar_url} alt={user.login} className="w-8 h-8 rounded-full border-2 border-border" />
                    </a>
                </div>
            </header>
            
            <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                 {selectedRepo ? renderProjectView() : renderDashboard()}
                {error && (
                    <div className="fixed bottom-4 right-4 bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-md text-sm max-w-md shadow-lg">
                        <div className="flex justify-between items-center">
                            <span><strong>Error:</strong> {error}</span>
                            <button onClick={clearError} className="ml-4 text-red-200 hover:text-white">&times;</button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
