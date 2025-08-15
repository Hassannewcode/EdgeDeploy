import React from 'react';
import { GithubWorkflowRun } from '../types';
import { ExternalLinkIcon, CheckCircleIcon, XCircleIcon, ClockIcon, SpinnerIcon } from './icons';

interface DeploymentsViewProps {
  runs: GithubWorkflowRun[];
  liveDeploymentUrl: string | null;
}

const Card: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className }) => (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
        {children}
    </div>
);
const CardHeader: React.FC<{children: React.ReactNode, actions?: React.ReactNode}> = ({ children, actions }) => (
    <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center">
        <h2 className="text-xl font-semibold text-card-foreground">{children}</h2>
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


export const DeploymentsView: React.FC<DeploymentsViewProps> = ({
  runs,
  liveDeploymentUrl,
}) => {
  
  const latestSuccessfulRunId = runs.find(r => r.status === 'completed' && r.conclusion === 'success')?.id;

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>Deployments</CardHeader>
            <CardContent className="!p-0">
                <div className="divide-y divide-border">
                {runs.length > 0 ? runs.map(run => {
                    const status = getStatusInfo(run);
                    const isLatestSuccess = run.id === latestSuccessfulRunId;

                    return (
                        <div key={run.id} className="p-4 sm:p-6 grid grid-cols-3 sm:grid-cols-4 gap-4 items-center">
                            <div className="col-span-2 sm:col-span-2">
                                <div className="flex items-center gap-3">
                                    {status.icon}
                                    <div>
                                        <p className="font-semibold text-card-foreground capitalize">{status.text}</p>
                                        <p className="text-muted-foreground text-xs">{timeAgo(run.created_at)}</p>
                                    </div>
                                </div>
                            </div>
                             <div className="hidden sm:block col-span-1">
                                <a href={run.html_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors truncate text-xs font-mono flex items-center gap-1.5">
                                    View on GitHub <ExternalLinkIcon className="w-3.5 h-3.5" />
                                </a>
                            </div>
                            <div className="col-span-1 flex justify-end">
                               {isLatestSuccess && liveDeploymentUrl && (
                                    <a href={liveDeploymentUrl} target="_blank" rel="noopener noreferrer" className="bg-secondary text-secondary-foreground hover:bg-accent text-xs font-semibold px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5">
                                        Visit <ExternalLinkIcon className="w-3.5 h-3.5" />
                                    </a>
                               )}
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