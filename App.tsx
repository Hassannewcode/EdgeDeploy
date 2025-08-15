import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    fetchBranches, 
    fetchFileTree, 
    fetchFileContent,
    fetchUser,
    fetchRepos,
    triggerDeployment,
    getWorkflowRuns,
    getWorkflowJobs,
    getJobLogs,
    forkRepo,
    getLatestSuccessDeploymentUrl,
} from './services/githubService';
import { explainCode } from './services/geminiService';
import type { GithubBranch, GithubTreeItem, GithubUser, GithubRepo, GithubWorkflowRun } from './types';
import { DeploymentStatus, View } from './types';
import { 
    EdgeDeployLogo, 
    ChevronDownIcon, 
    SunIcon, 
    MoonIcon,
    LayoutDashboardIcon,
    FileCodeIcon,
    SettingsIcon,
    PlusIcon,
    TrashIcon,
    MoreHorizontalIcon,
    SpinnerIcon,
    RepoIcon,
    LockClosedIcon,
    SearchIcon,
    BellIcon,
    BookOpenIcon,
    ListIcon,
    LayoutGridIcon,
    CloudUploadIcon,
    PlusCircleIcon,
    NextjsIcon,
    CommerceIcon,
    SparklesIcon,
    GithubIcon
} from './components/icons';
import { FileTree } from './components/FileTree';
import { CodeViewer } from './components/CodeViewer';
import { DeploymentsView } from './components/DeploymentView';
import { AuthScreen } from './components/AuthScreen';
import { StatusView } from './components/StatusView';

type Theme = 'light' | 'dark';

const timeAgo = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 5) return "just now";
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)}y ago`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)}mo ago`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)}d ago`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}h ago`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}m ago`;
    return `${Math.floor(seconds)}s ago`;
}

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

const ImportProjectModal: React.FC<{
    repos: GithubRepo[];
    projects: GithubRepo[];
    onAddProject: (repo: GithubRepo) => void;
    onClose: () => void;
}> = ({ repos, projects, onAddProject, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const availableRepos = repos
        .filter(repo => !projects.some(p => p.id === repo.id))
        .filter(repo => repo.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-border flex-shrink-0">
                    <h2 className="text-lg font-semibold">Import Project</h2>
                    <p className="text-sm text-muted-foreground">Select a repository to import from your GitHub account.</p>
                </div>
                <div className="p-4 border-b border-border flex-shrink-0">
                    <div className="relative">
                        <SearchIcon className="w-4 h-4 absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                            placeholder="Search repositories..." 
                            className="pl-9" 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {availableRepos.length > 0 ? (
                        <div className="divide-y divide-border">
                            {availableRepos.map(repo => (
                                <div key={repo.id} className="p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <RepoIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                        <div className="truncate">
                                            <p className="font-semibold truncate">{repo.full_name}</p>
                                            {repo.private && <span className="text-xs text-muted-foreground">Private</span>}
                                        </div>
                                    </div>
                                    <Button variant="secondary" size="sm" onClick={() => onAddProject(repo)}>Import</Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="p-8 text-center text-muted-foreground">{repos.length > 0 ? 'All repositories have been imported.' : 'No repositories found.'}</p>
                    )}
                </div>
                 <div className="p-4 border-t border-border bg-muted/50 text-right flex-shrink-0">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

const TemplateModal: React.FC<{
    onDeployTemplate: (owner: string, repo: string) => void;
    onClose: () => void;
    isDeploying: boolean;
}> = ({ onDeployTemplate, onClose, isDeploying }) => {
    const [deployingTemplate, setDeployingTemplate] = useState<string | null>(null);

    const templates = [
        {
            owner: 'Hassannewcode',
            repo: 'Gemini-Toolkit-AI-Chat-Template',
            name: 'Gemini AI Chat Template',
            description: 'A Next.js template for building a full-featured, hackable AI chatbot with the Gemini API.',
            icon: <SparklesIcon className="w-8 h-8 text-primary" />
        },
    ];

    const handleDeploy = (owner: string, repo: string) => {
        setDeployingTemplate(`${owner}/${repo}`);
        onDeployTemplate(owner, repo);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card border border-border rounded-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border">
                    <h2 className="text-lg font-semibold">Start with a Template</h2>
                    <p className="text-sm text-muted-foreground">Select a template to fork to your account and deploy.</p>
                </div>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {templates.map(template => (
                        <div key={template.repo} className="border border-border rounded-lg p-4 flex justify-between items-center">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className="bg-secondary p-3 rounded-lg flex-shrink-0">{template.icon}</div>
                                <div className="truncate">
                                    <p className="font-semibold truncate">{template.name}</p>
                                    <p className="text-sm text-muted-foreground truncate">{template.description}</p>
                                </div>
                            </div>
                            <Button 
                                onClick={() => handleDeploy(template.owner, template.repo)}
                                disabled={isDeploying}
                                size="sm"
                                variant="secondary"
                                className="flex-shrink-0"
                            >
                                {isDeploying && deployingTemplate === `${template.owner}/${template.repo}` ? <SpinnerIcon className="w-4 h-4 mr-2" /> : null}
                                Deploy
                            </Button>
                        </div>
                    ))}
                </div>
                 <div className="p-6 border-t border-border bg-muted/50 text-right">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                </div>
            </div>
        </div>
    );
};


const SettingsView: React.FC = () => {
    const [envVars, setEnvVars] = useState([{id: 1, key: 'NEXT_PUBLIC_API_URL', value: 'https://api.example.com'}]);
    
    return (
        <div className="space-y-8">
            <div className="bg-card border border-border rounded-lg">
                <div className="p-6 border-b border-border">
                    <h2 className="text-xl font-semibold">Environment Variables</h2>
                    <p className="text-muted-foreground text-sm mt-1">These variables are exposed to your project during the build process.</p>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        {envVars.map(v => (
                            <div key={v.id} className="flex items-center gap-2">
                                <Input value={v.key} className="font-mono" />
                                <Input value={v.value} type="password" />
                                <Button variant="ghost"><TrashIcon className="w-4 h-4" /></Button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-6 border-t border-border bg-muted/50 flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Add a new environment variable.</p>
                    <Button><PlusIcon className="w-4 h-4 mr-2" /> Add</Button>
                </div>
            </div>
             <div className="bg-card border border-border rounded-lg">
                <div className="p-6 border-b border-border">
                    <h2 className="text-xl font-semibold">Domains</h2>
                    <p className="text-muted-foreground text-sm mt-1">Manage your project's domains.</p>
                </div>
                <div className="divide-y divide-border">
                   <div className="p-6 flex justify-between items-center">
                       <div>
                           <p className="font-semibold">edgedeploy-preview.dev</p>
                           <p className="text-xs text-muted-foreground">Default domain</p>
                       </div>
                       <div className="flex items-center gap-2">
                            <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">Valid Configuration</span>
                           <Button variant="ghost"><MoreHorizontalIcon className="w-4 h-4"/></Button>
                       </div>
                   </div>
                </div>
                <div className="p-6 border-t border-border bg-muted/50 flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Add a new domain to your project.</p>
                    <div className="flex gap-2">
                        <Input placeholder="example.com" />
                        <Button>Add</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [githubToken, setGithubToken] = useState<string | null>(localStorage.getItem('github_token'));
    const [user, setUser] = useState<GithubUser | null>(null);
    const [theme, setTheme] = useState<Theme>((localStorage.getItem('edgedeploy-theme') as Theme) || 'light');
    const [currentView, setCurrentView] = useState<View>(View.DEPLOYMENTS);
    const [activeDashboardTab, setActiveDashboardTab] = useState('Overview');
    
    const [projects, setProjects] = useState<GithubRepo[]>(() => JSON.parse(localStorage.getItem('edgedeploy_projects') || '[]'));
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const addMenuRef = useRef<HTMLDivElement>(null);
    const [repos, setRepos] = useState<GithubRepo[]>([]); // All user repos for import modal

    const [selectedRepo, setSelectedRepo] = useState<string | null>(localStorage.getItem('selected_repo'));
    const [owner, setOwner] = useState<string | null>(null);
    const [repo, setRepo] = useState<string | null>(null);

    const [branches, setBranches] = useState<GithubBranch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
    const [fileTree, setFileTree] = useState<GithubTreeItem[]>([]);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string | null>(null);
    
    const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);

    const [isExplaining, setIsExplaining] = useState<boolean>(false);
    const [explanation, setExplanation] = useState<string | null>(null);

    const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>(DeploymentStatus.IDLE);
    const [workflowRuns, setWorkflowRuns] = useState<GithubWorkflowRun[]>([]);
    const [deploymentLogs, setDeploymentLogs] = useState<string | null>(null);
    const [liveDeploymentUrl, setLiveDeploymentUrl] = useState<string | null>(null);
    const [lastKnownRunId, setLastKnownRunId] = useState<number | null>(null);

    const deploymentPollTimer = useRef<number | null>(null);
    const pollAttempts = useRef(0);
    
    const isDeploying = deploymentStatus === DeploymentStatus.TRIGGERED || deploymentStatus === DeploymentStatus.IN_PROGRESS;

    useEffect(() => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
        localStorage.setItem('edgedeploy-theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('edgedeploy_projects', JSON.stringify(projects));
    }, [projects]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
                setIsAddMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

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
        localStorage.removeItem('selected_repo');
        setGithubToken(null);
        setUser(null);
        setRepos([]);
        setSelectedRepo(null);
        setBranches([]);
        setFileTree([]);
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
                .then(userRepos => {
                    setRepos(userRepos);
                    const lastSelectedRepo = localStorage.getItem('selected_repo');
                    if(lastSelectedRepo && projects.some(p => p.full_name === lastSelectedRepo)) {
                        handleRepoChange(lastSelectedRepo);
                    } else {
                        setSelectedRepo(null);
                        localStorage.removeItem('selected_repo');
                    }
                })
                .catch(err => setError(err.message))
                .finally(() => setLoading('repos', false));
        }
    }, [user, githubToken]);

    const handleRepoChange = async (repoFullName: string) => {
        if (!githubToken) return;
        setSelectedRepo(repoFullName);
        localStorage.setItem('selected_repo', repoFullName);

        const [owner, repo] = repoFullName.split('/');
        setOwner(owner);
        setRepo(repo);

        setFileTree([]);
        setSelectedFile(null);
        setFileContent(null);
        setDeploymentStatus(DeploymentStatus.IDLE);
        setWorkflowRuns([]);
        setLiveDeploymentUrl(null);
        setDeploymentLogs(null);
        setCurrentView(View.DEPLOYMENTS);
        
        setLoading('branches', true);
        try {
            const fetchedBranches = await fetchBranches(githubToken, owner, repo);
            setBranches(fetchedBranches);
            if (fetchedBranches.length > 0) {
                const mainBranch = fetchedBranches.find(b => b.name === 'main') || fetchedBranches.find(b => b.name === 'master') || fetchedBranches[0];
                handleBranchChange(mainBranch.name, owner, repo);
            } else {
                setSelectedBranch(null);
            }
        } catch(err) {
            setError(err instanceof Error ? err.message : "Failed to fetch branches.");
        } finally {
            setLoading('branches', false);
        }
    }
    
    const handleAddProject = (repo: GithubRepo) => {
        if (!projects.some(p => p.id === repo.id)) {
            const newProjects = [...projects, repo];
            setProjects(newProjects);
        }
        setIsImportModalOpen(false);
        handleRepoChange(repo.full_name);
    };

    const handleBranchChange = async (branchName: string, currentOwner: string, currentRepo: string) => {
        if (!githubToken || !owner || !repo) return;
        setSelectedBranch(branchName);
        setFileTree([]);
        setSelectedFile(null);
        setFileContent(null);
        setLiveDeploymentUrl(null);
        setDeploymentLogs(null);
        setLoading('tree', true);
        setLoading('runs', true);
        setError(null);
        try {
            const tree = await fetchFileTree(githubToken, currentOwner, currentRepo, branchName);
            setFileTree(tree);

            const runsData = await getWorkflowRuns(githubToken, currentOwner, currentRepo, branchName);
            setWorkflowRuns(runsData.workflow_runs);

            const latestSuccess = runsData.workflow_runs.find(r => r.conclusion === 'success');
            if (latestSuccess) {
                const url = await getLatestSuccessDeploymentUrl(githubToken, owner, repo, latestSuccess.head_sha);
                setLiveDeploymentUrl(url);
            } else {
                setLiveDeploymentUrl(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch project data.");
        } finally {
            setLoading('tree', false);
            setLoading('runs', false);
        }
    };

    const handleFileSelect = useCallback(async (path: string) => {
        if (!owner || !repo || !selectedBranch || !githubToken) return;
        setSelectedFile(path);
        setFileContent(null);
        setExplanation(null);
        setLoading('file', true);
        setError(null);
        try {
            const content = await fetchFileContent(githubToken, owner, repo, path, selectedBranch);
            setFileContent(content);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch file content.");
        } finally {
            setLoading('file', false);
        }
    }, [owner, repo, selectedBranch, githubToken]);
    
    const handleExplainCode = useCallback(async () => {
        if (!fileContent || !selectedFile) return;
        setIsExplaining(true);
        setExplanation(null);
        try {
            const result = await explainCode(fileContent, selectedFile);
            setExplanation(result);
        } catch (err) {
            setExplanation(err instanceof Error ? `Error: ${err.message}` : "An unknown error occurred.");
        } finally {
            setIsExplaining(false);
        }
    }, [fileContent, selectedFile]);

    const cleanupPolling = () => {
        if (deploymentPollTimer.current) {
            window.clearInterval(deploymentPollTimer.current);
            deploymentPollTimer.current = null;
        }
    };

    useEffect(() => {
      return cleanupPolling;
    }, []);

    const pollDeploymentStatus = useCallback(async () => {
        if (!githubToken || !owner || !repo || !selectedBranch || deploymentStatus === DeploymentStatus.IDLE) return;

        pollAttempts.current += 1;

        if (pollAttempts.current > 60) { // Timeout after 5 mins (60 attempts * 5s)
            cleanupPolling();
            setDeploymentStatus(DeploymentStatus.FAILED);
            setDeploymentLogs(prev => (prev || '') + "\n\nError: Deployment timed out after 5 minutes.");
            setError("Deployment timed out.");
            setLastKnownRunId(null);
            return;
        }

        try {
            const { workflow_runs } = await getWorkflowRuns(githubToken, owner, repo, selectedBranch);
            setWorkflowRuns(workflow_runs);

            // Find the first run that is newer than the last known run.
            // The API returns runs newest first.
            const relevantRun = workflow_runs.find(run => lastKnownRunId === null || run.id > lastKnownRunId);
            
            if (relevantRun) {
                if (relevantRun.status === 'in_progress' || relevantRun.status === 'queued') {
                    setDeploymentStatus(DeploymentStatus.IN_PROGRESS);
                    try {
                        const { jobs } = await getWorkflowJobs(githubToken, owner, repo, relevantRun.id);
                        const buildJob = jobs.find(job => job.status === 'in_progress') || jobs[0];
                        if (buildJob) {
                            const logs = await getJobLogs(githubToken, owner, repo, buildJob.id);
                            setDeploymentLogs(logs);
                        } else {
                            setDeploymentLogs(prev => prev || "Workflow job is queued. Waiting for logs...");
                        }
                    } catch (logError) {
                        console.error("Could not fetch job logs:", logError);
                        setDeploymentLogs(prev => prev || "Waiting for build logs...");
                    }
                } else { // It's completed
                    cleanupPolling();
                    setDeploymentStatus(DeploymentStatus.IDLE);
                    setDeploymentLogs(null);
                    setLastKnownRunId(null);
                    
                    if (relevantRun.conclusion === 'success') {
                        // Wait a moment for deployment to register, then fetch URL
                        setTimeout(async () => {
                             const url = await getLatestSuccessDeploymentUrl(githubToken, owner, repo, relevantRun.head_sha);
                             setLiveDeploymentUrl(url);
                        }, 2000); // 2s delay
                    }
                }
            } else if (pollAttempts.current > 4) { // Timeout after ~20s if no workflow detected
                cleanupPolling();
                setDeploymentStatus(DeploymentStatus.FAILED);
                setLastKnownRunId(null);
                setError("NO_WORKFLOW_DETECTED"); // Special error code
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error polling deployment status.");
            setDeploymentStatus(DeploymentStatus.FAILED);
            setDeploymentLogs(null);
            cleanupPolling();
            setLastKnownRunId(null);
        }
    }, [githubToken, owner, repo, selectedBranch, lastKnownRunId, deploymentStatus]);


    const handleDeployTemplate = async (templateOwner: string, templateRepo: string) => {
        if (!githubToken) return;

        setLoading('deployTemplate', true);
        setError(null);
        try {
            const newRepo = await forkRepo(githubToken, templateOwner, templateRepo);
            
            // Forking can take a moment for the repo to be available via API.
            await new Promise(resolve => setTimeout(resolve, 3000));

            const updatedRepos = await fetchRepos(githubToken);
            setRepos(updatedRepos);

            if (!projects.some(p => p.id === newRepo.id)) {
                setProjects(prev => [...prev, newRepo]);
            }

            setIsTemplateModalOpen(false);
            handleRepoChange(newRepo.full_name);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fork the template repository. It may already exist in your account.");
        } finally {
            setLoading('deployTemplate', false);
        }
    };

    const handleDeploy = async () => {
        if (!githubToken || !owner || !repo || !selectedBranch) return;
        
        cleanupPolling();
        setError(null);
        setDeploymentStatus(DeploymentStatus.TRIGGERED);
        setDeploymentLogs("Triggering deployment workflow...");
        setCurrentView(View.DEPLOYMENTS);
        pollAttempts.current = 0;

        try {
            // Get the latest run ID before triggering a new one
            const { workflow_runs } = await getWorkflowRuns(githubToken, owner, repo, selectedBranch);
            if (workflow_runs.length > 0) {
                // Runs are sorted newest first by the API by default
                setLastKnownRunId(workflow_runs[0].id);
            } else {
                setLastKnownRunId(null);
            }

            await triggerDeployment(githubToken, owner, repo, selectedBranch);
            setTimeout(() => pollDeploymentStatus(), 2000); // Poll after 2s to allow run to be created
            deploymentPollTimer.current = window.setInterval(pollDeploymentStatus, 5000);
        } catch(err) {
             setError(err instanceof Error ? err.message : "Unknown error");
             setDeploymentStatus(DeploymentStatus.FAILED);
             setLastKnownRunId(null);
        }
    };

    const renderProjectView = () => {
        switch(currentView) {
            case View.DEPLOYMENTS:
                return <DeploymentsView 
                    runs={workflowRuns}
                    liveDeploymentUrl={liveDeploymentUrl}
                    deploymentStatus={deploymentStatus}
                    deploymentLogs={deploymentLogs}
                    error={error}
                />;
            case View.SOURCE:
                 return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
                        <div className="lg:col-span-1 bg-card border border-border rounded-lg p-4 flex flex-col h-full">
                             <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-1">File Explorer</h2>
                            {isLoading['tree'] || isLoading['runs'] ? (
                                <p className="text-muted-foreground text-sm">Loading file tree...</p>
                            ) : fileTree.length > 0 ? (
                                <FileTree treeData={fileTree} onFileSelect={handleFileSelect} selectedFile={selectedFile} />
                            ) : (
                                <p className="text-muted-foreground text-sm text-center px-4">
                                  {selectedRepo ? 'No files in this branch.' : 'Select a repository to see files.'}
                                </p>
                            )}
                        </div>
                        <div className="lg:col-span-2 h-full">
                            <CodeViewer 
                               fileName={selectedFile}
                               content={fileContent}
                               isLoading={isLoading['file']}
                               onExplain={handleExplainCode}
                               isExplaining={isExplaining}
                               explanation={explanation}
                           />
                        </div>
                    </div>
                )
            case View.SETTINGS:
                return <SettingsView />;
            default:
                return null;
        }
    }
    
    if (!githubToken || !user) {
        return <AuthScreen onConnect={handleConnect} isLoading={isLoading['auth']} error={error} />;
    }
    
    const projectNavItems = [
        { name: 'Deployments', view: View.DEPLOYMENTS, icon: LayoutDashboardIcon },
        { name: 'Source', view: View.SOURCE, icon: FileCodeIcon },
        { name: 'Settings', view: View.SETTINGS, icon: SettingsIcon },
    ];
    
    const dashboardNavItems = ['Overview', 'Integrations', 'Deployments', 'Activity', 'Domains', 'Usage', 'Storage', 'Settings', 'Status'];

    const renderDashboardContent = () => {
        if (activeDashboardTab === 'Status') {
            return <StatusView user={user} />;
        }

        // Default to Overview content
        return (
            <div>
                 <div className="flex justify-between items-center mb-6">
                    <div className="relative w-full max-w-sm">
                        <SearchIcon className="w-4 h-4 absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Search Projects..." className="pl-9" />
                    </div>
                    <div className="relative" ref={addMenuRef}>
                        <Button onClick={() => setIsAddMenuOpen(prev => !prev)}>
                            Add New
                            <ChevronDownIcon className={`w-4 h-4 ml-2 transition-transform ${isAddMenuOpen ? 'rotate-180' : ''}`} />
                        </Button>
                        {isAddMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-popover border border-border z-10 text-popover-foreground animate-in fade-in-0 zoom-in-95">
                                <div className="p-1">
                                    <button onClick={() => { setIsTemplateModalOpen(true); setIsAddMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-accent">
                                        <SparklesIcon className="w-4 h-4 text-muted-foreground" />
                                        <span>Start with a Template</span>
                                    </button>
                                    <button onClick={() => { setIsImportModalOpen(true); setIsAddMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-accent">
                                        <GithubIcon className="w-4 h-4 text-muted-foreground" />
                                        <span>Import Repository</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                 </div>
                
                {projects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map(project => (
                             <div key={project.id} onClick={() => handleRepoChange(project.full_name)} className="bg-card border border-border rounded-lg flex flex-col cursor-pointer group transition-all hover:shadow-lg hover:-translate-y-1">
                                <div className="p-6 flex-grow">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2.5 bg-secondary rounded-full">
                                           <RepoIcon className="w-5 h-5 text-secondary-foreground" />
                                        </div>
                                        <span className="font-semibold text-card-foreground group-hover:text-primary transition-colors truncate text-lg">
                                            {project.name}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4 truncate">{project.full_name}</p>
                                     {project.private && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <LockClosedIcon className="w-3 h-3" />
                                            <span>Private</span>
                                        </div>
                                    )}
                                </div>
                                <div className="px-6 py-4 bg-muted/30 border-t border-border">
                                    <div className="flex items-center justify-between text-sm">
                                         <div className="flex items-center gap-2">
                                             <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                             <span className="text-muted-foreground truncate">{project.name}.edgedeploy.app</span>
                                         </div>
                                        <span className="text-muted-foreground">{timeAgo(project.updated_at)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-card border border-border rounded-lg text-center p-12">
                        <div className="mx-auto w-16 h-16 bg-secondary rounded-lg flex items-center justify-center mb-4">
                            <CloudUploadIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-semibold mb-2">Deploy your first project</h2>
                        <p className="text-muted-foreground mb-8 max-w-md mx-auto">Start by deploying a template or importing an existing repository from your Git provider.</p>
                        <div className="max-w-xs mx-auto flex flex-col gap-4">
                            <Button size="lg" onClick={() => setIsTemplateModalOpen(true)}>
                                <SparklesIcon className="w-5 h-5 mr-2" />
                                Start with a Template
                            </Button>
                            <div className="flex items-center">
                                <div className="flex-grow border-t border-border"></div>
                                <span className="flex-shrink-0 mx-4 text-xs text-muted-foreground uppercase">Or</span>
                                <div className="flex-grow border-t border-border"></div>
                            </div>
                            <Button variant="secondary" size="lg" onClick={() => setIsImportModalOpen(true)}>
                                <GithubIcon className="w-5 h-5 mr-2" />
                                Import Repository
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <header className="flex items-center justify-between px-4 sm:px-6 h-16 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => { setSelectedRepo(null); localStorage.removeItem('selected_repo'); setActiveDashboardTab('Overview');}} className="flex items-center gap-4">
                        <EdgeDeployLogo className="text-foreground h-6 w-6"/>
                    </button>
                    <span className="text-muted-foreground">/</span>
                     <div className="relative">
                        {selectedRepo ? (
                             <select
                                value={selectedRepo}
                                onChange={(e) => handleRepoChange(e.target.value)}
                                className="appearance-none bg-transparent text-foreground font-semibold text-md focus:outline-none pr-8"
                            >
                                {projects.map(p => (
                                    <option key={p.id} value={p.full_name}>{p.name}</option>
                                ))}
                            </select>
                        ) : (
                             <div className="font-semibold text-md">{user.name || user.login}'s Projects</div>
                        )}
                        <ChevronDownIcon className="w-4 h-4 text-muted-foreground absolute top-1/2 right-0 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4">
                     {selectedRepo ? (
                         <Button
                            onClick={handleDeploy}
                            disabled={isDeploying || !selectedBranch}
                        >
                            {isDeploying ? (
                                <>
                                    <SpinnerIcon className="w-4 h-4 mr-2" />
                                    Deploying...
                                </>
                            ) : 'Deploy'}
                        </Button>
                    ) : (
                         <div className="flex items-center gap-2">
                            <Button variant="secondary" size="sm">Feedback</Button>
                            <ThemeToggle theme={theme} setTheme={setTheme} />
                            <button className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground"><BellIcon className="w-5 h-5"/></button>
                            <button className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground"><BookOpenIcon className="w-5 h-5"/></button>
                         </div>
                    )}
                    <button onClick={handleLogout} title="Log out">
                        <img src={user.avatar_url} alt={user.login} className="w-8 h-8 rounded-full border-2 border-border" />
                    </button>
                </div>
            </header>
            
            <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                {error && error !== "NO_WORKFLOW_DETECTED" && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-2 mb-6 rounded-md text-sm">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {selectedRepo ? (
                    <>
                    <nav className="border-b border-border mb-8">
                        <div className="-mb-px flex space-x-6">
                            {projectNavItems.map(item => (
                                <button key={item.name} onClick={() => setCurrentView(item.view)}
                                    className={`flex items-center gap-2 px-1 py-3 border-b-2 text-sm font-medium transition-colors ${
                                        currentView === item.view 
                                        ? 'border-primary text-primary' 
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.name}
                                </button>
                            ))}
                        </div>
                    </nav>
                    {renderProjectView()}
                    </>
                ) : (
                    <>
                     <nav className="border-b border-border mb-8">
                        <div className="flex space-x-6 overflow-x-auto -mb-px">
                            {dashboardNavItems.map(item => (
                                <button key={item}
                                    onClick={() => setActiveDashboardTab(item)}
                                    className={`flex items-center gap-2 px-1 py-3 border-b-2 text-sm font-medium transition-colors ${
                                        activeDashboardTab === item
                                        ? 'border-primary text-primary' 
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </nav>
                    {renderDashboardContent()}
                    </>
                )}
            </main>
            {isImportModalOpen && (
                <ImportProjectModal
                    repos={repos}
                    projects={projects}
                    onAddProject={handleAddProject}
                    onClose={() => setIsImportModalOpen(false)}
                />
            )}
            {isTemplateModalOpen && (
                <TemplateModal
                    onDeployTemplate={handleDeployTemplate}
                    onClose={() => setIsTemplateModalOpen(false)}
                    isDeploying={!!isLoading['deployTemplate']}
                />
            )}
        </div>
    );
};

export default App;