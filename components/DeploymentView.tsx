import React, { useRef, useEffect, useState } from 'react';
import { GithubWorkflowRun, DeploymentStatus } from '../types';
import { ExternalLinkIcon, CheckCircleIcon, XCircleIcon, ClockIcon, SpinnerIcon, ExclamationTriangleIcon, CopyIcon } from './icons';

interface DeploymentsViewProps {
  runs: GithubWorkflowRun[];
  liveDeploymentUrl: string | null;
  deploymentStatus: DeploymentStatus;
  deploymentLogs: string | null;
  error: string | null;
}

const Card: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className }) => (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
        {children}
    </div>
);
const CardHeader: React.FC<{children: React.ReactNode, actions?: React.ReactNode}> = ({ children, actions }) => (
    <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-3">
            {children}
        </div>
        {actions}
    </div>
);
const CardContent: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className }) => (
    <div className={`p-4 sm:p-6 text-sm ${className}`}>
        {children}
    </div>
);

const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 5) return "just now";
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

const getStatusInfo = (run: GithubWorkflowRun) => {
    if (run.status === 'completed') {
        if (run.conclusion === 'success') {
            return { icon: <CheckCircleIcon className="w-5 h-5 text-green-500" />, text: "Success" };
        }
        return { icon: <XCircleIcon className="w-5 h-5 text-red-500" />, text: run.conclusion || "Failed" };
    }
    if (run.status === 'in_progress') {
        return { icon: <SpinnerIcon className="w-5 h-5 text-yellow-500" />, text: "In Progress" };
    }
    return { icon: <ClockIcon className="w-5 h-5 text-gray-500" />, text: "Queued" };
};

const workflowYaml = `name: Deploy from EdgeDeploy

on:
  repository_dispatch:
    types: [deploy-from-app]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          # Use the branch that triggered the dispatch event
          ref: \${{ github.event.client_payload.ref }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build
        env:
          # Pass any necessary environment variables here
          # For Next.js, you might need NEXT_PUBLIC_ variables
          CI: true

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          # Adjust this path to your framework's build output directory
          # - Next.js: './out'
          # - Create React App: './build'
          # - Vite: './dist'
          path: './out'

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

const WorkflowInstructions = () => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(workflowYaml.trim());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardHeader>
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />
                <h2 className="text-xl font-semibold text-card-foreground">Action Required: Setup Deployment Workflow</h2>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-4">
                    To deploy this project, you need to add a GitHub Actions workflow file to its repository. This workflow will run automatically when you click the "Deploy" button here.
                </p>
                <p className="text-muted-foreground mb-4">
                    Create a file named <code className="font-mono bg-muted px-1.5 py-1 rounded-md text-sm">.github/workflows/deploy.yml</code> in your repository and paste the following content into it.
                </p>
                <div className="bg-black/80 rounded-lg relative">
                    <button onClick={handleCopy} className="absolute top-3 right-3 p-1.5 bg-white/10 rounded-md text-gray-300 hover:bg-white/20 transition-colors" aria-label="Copy workflow code">
                        {copied ? <CheckCircleIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
                    </button>
                    <pre className="p-4 text-sm text-gray-300 overflow-auto font-mono text-xs">
                        <code>{workflowYaml.trim()}</code>
                    </pre>
                </div>
                 <p className="text-xs text-muted-foreground mt-4">
                    <strong>Note:</strong> You may need to adjust the <code className="font-mono bg-muted px-1 py-0.5 rounded">'path'</code> in the "Upload artifact" step to match your project's build output directory. You may also need to <a href="https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#configuring-a-publishing-source-for-your-site" target="_blank" rel="noopener noreferrer" className="text-primary underline">enable GitHub Pages</a> in your repository settings and set the source to "GitHub Actions".
                 </p>
            </CardContent>
        </Card>
    )
}


const LiveTerminal: React.FC<{ logs: string }> = ({ logs }) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const formatLogs = (logText: string) => {
    return logText.split('\n').map((line, index) => {
        let className = "text-gray-300";
        if (line.toLowerCase().includes('error')) className = "text-red-400";
        if (line.toLowerCase().includes('warning')) className = "text-yellow-400";
        if (line.startsWith('>')) className = "text-cyan-400";
        
        const cleanedLine = line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s/, '');

        return <div key={index} className={className}><span className="text-gray-500 mr-4 select-none">{index+1}</span>{cleanedLine}</div>;
    });
  }

  return (
    <div ref={terminalRef} className="bg-black font-mono text-xs p-4 rounded-lg h-96 overflow-y-auto">
      {formatLogs(logs)}
    </div>
  );
};


const LiveDeploymentProgress: React.FC<{ logs: string | null }> = ({ logs }) => {
    return (
        <Card>
            <CardHeader>
                <SpinnerIcon className="w-5 h-5" />
                <h2 className="text-xl font-semibold text-card-foreground">Deployment in Progress</h2>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Build Logs</p>
                        <LiveTerminal logs={logs || "Triggering workflow, waiting for logs..."} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};


export const DeploymentsView: React.FC<DeploymentsViewProps> = ({
  runs,
  liveDeploymentUrl,
  deploymentStatus,
  deploymentLogs,
  error
}) => {
  
  const isDeploying = deploymentStatus === DeploymentStatus.IN_PROGRESS || deploymentStatus === DeploymentStatus.TRIGGERED;
  const latestSuccessfulRun = runs.find(r => r.status === 'completed' && r.conclusion === 'success');

  return (
    <div className="space-y-6">
        {error === "NO_WORKFLOW_DETECTED" && <WorkflowInstructions />}

        {isDeploying && <LiveDeploymentProgress logs={deploymentLogs} />}

        <Card>
            <CardHeader actions={
                liveDeploymentUrl && (
                    <a href={liveDeploymentUrl} target="_blank" rel="noopener noreferrer" className="bg-primary text-primary-foreground hover:opacity-90 text-sm font-semibold px-4 py-2 rounded-md transition-colors flex items-center gap-1.5">
                        Visit Site <ExternalLinkIcon className="w-4 h-4" />
                    </a>
                )
            }>
                <h2 className="text-xl font-semibold text-card-foreground">Production Deployment</h2>
            </CardHeader>
            <CardContent>
                {latestSuccessfulRun ? (
                    liveDeploymentUrl ? (
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <a href={liveDeploymentUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-card-foreground hover:underline break-all">
                                    {liveDeploymentUrl.replace('https://', '').replace(/\/$/, '')}
                                </a>
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                                    <CheckCircleIcon className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                    <span>Deployed {timeAgo(latestSuccessfulRun.created_at)}</span>
                                    <span className="text-muted-foreground/50">|</span>
                                    <span>from <a href={latestSuccessfulRun.html_url} target="_blank" rel="noopener noreferrer" className="hover:underline font-mono">{latestSuccessfulRun.head_sha.substring(0,7)}</a></span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-card-foreground">Deployment URL Not Available</p>
                                <p className="text-muted-foreground text-xs">The last deployment succeeded, but we couldn't retrieve the live URL. It may still be propagating.</p>
                            </div>
                        </div>
                    )
                ) : (
                    <p className="text-muted-foreground">No successful deployment for this branch yet. Trigger a deployment to get a live URL.</p>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <h2 className="text-xl font-semibold text-card-foreground">Deployment History</h2>
            </CardHeader>
            <CardContent className="!p-0">
                <div className="divide-y divide-border">
                {runs.length > 0 ? runs.map(run => {
                    const status = getStatusInfo(run);
                    return (
                        <div key={run.id} className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
                            <div className="col-span-2 sm:col-span-3">
                                <div className="flex items-center gap-3">
                                    {status.icon}
                                    <div>
                                        <p className="font-semibold text-card-foreground capitalize">{status.text}</p>
                                        <p className="text-muted-foreground text-xs">{timeAgo(run.created_at)}</p>
                                    </div>
                                </div>
                            </div>
                             <div className="col-span-1 text-right">
                                <a href={run.html_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors text-xs font-mono inline-flex items-center gap-1.5 justify-end">
                                    Logs <ExternalLinkIcon className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="p-8 text-center text-muted-foreground">
                        No deployments found for this branch.
                    </div>
                )}
                </div>
            </CardContent>
        </Card>
    </div>
  );
};
