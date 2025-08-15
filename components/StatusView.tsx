import React, { useState, useEffect } from 'react';
import { SystemStatus, GithubUser } from '../types';
import * as statusService from '../services/statusService';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, SpinnerIcon } from './icons';

interface StatusViewProps {
    user: GithubUser | null;
}

// These functions perform LIVE checks against real infrastructure and dependencies.
const systemChecks = (user: GithubUser | null) => ({
    'Core APIs': [
        { id: 'githubApi', name: 'GitHub API', check: () => statusService.checkGitHubApi() },
        { id: 'geminiApi', name: 'Gemini AI Services', check: () => statusService.checkGeminiApi() },
    ],
    'CI/CD': [
        { id: 'githubActions', name: 'Deployments (GitHub Actions)', check: () => statusService.checkGitHubActions() },
    ],
    'Platform': [
        { id: 'dashboard', name: 'Dashboard Services', check: () => statusService.checkDashboardServices(user) },
        { id: 'auth', name: 'Authentication Services', check: () => statusService.checkGitHubApi() }, // Auth depends on GitHub API
        { id: 'storage', name: 'Client Health (Browser Storage)', check: () => statusService.checkBrowserStorage() },
    ]
});


const getStatusAppearance = (status: SystemStatus) => {
    switch (status) {
        case SystemStatus.OPERATIONAL:
            return {
                icon: <CheckCircleIcon className="w-5 h-5 text-green-500" />,
                color: 'text-green-400',
            };
        case SystemStatus.DEGRADED:
            return {
                icon: <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />,
                color: 'text-yellow-400',
            };
        case SystemStatus.OUTAGE:
            return {
                icon: <XCircleIcon className="w-5 h-5 text-red-500" />,
                color: 'text-red-400',
            };
        default:
             return {
                icon: <SpinnerIcon className="w-5 h-5 text-muted-foreground" />,
                color: 'text-muted-foreground',
            };
    }
};

export const StatusView: React.FC<StatusViewProps> = ({ user }) => {
    const allSystems = systemChecks(user);
    const initialStatuses = Object.values(allSystems).flat().reduce((acc, system) => {
        acc[system.id] = SystemStatus.CHECKING;
        return acc;
    }, {} as Record<string, SystemStatus>);
    
    const [statuses, setStatuses] = useState<Record<string, SystemStatus>>(initialStatuses);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        const runChecks = async () => {
            const checks = Object.values(allSystems).flat().map(system => 
                system.check().then(status => ({ id: system.id, status }))
            );
            const results = await Promise.all(checks);
            
            setStatuses(prev => {
                const newStatuses = { ...prev };
                results.forEach(({ id, status }) => {
                    newStatuses[id] = status;
                });
                return newStatuses;
            });

            setLastUpdated(new Date());
        };
        runChecks();
    }, [user]);

    const overallStatus = Object.values(statuses).some(s => s === SystemStatus.OUTAGE) ? 'Major Outage Detected'
        : Object.values(statuses).some(s => s === SystemStatus.DEGRADED) ? 'Degraded Performance Detected'
        : Object.values(statuses).some(s => s === SystemStatus.CHECKING) ? 'Checking Systems...'
        : 'All Systems Operational';
        
    const overallColor = overallStatus.includes('Outage') ? 'text-red-400' 
        : overallStatus.includes('Degraded') ? 'text-yellow-400' 
        : overallStatus.includes('Checking') ? 'text-muted-foreground' 
        : 'text-green-400';

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">System Status</h1>
                     <p className={`mt-1 font-semibold ${overallColor}`}>{overallStatus}</p>
                </div>
                <p className="text-sm text-muted-foreground self-start sm:self-center">
                    {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading status...'}
                </p>
            </div>
            {Object.entries(allSystems).map(([category, systems]) => (
                <div key={category} className="bg-card border border-border rounded-lg">
                    <h2 className="p-4 text-lg font-semibold text-card-foreground border-b border-border">{category}</h2>
                    <div className="divide-y divide-border">
                        {systems.map(system => {
                            const status = statuses[system.id];
                            const { icon, color } = getStatusAppearance(status);

                            return (
                                <div key={system.id} className="p-4 flex justify-between items-center">
                                    <span className="font-medium text-foreground">{system.name}</span>
                                    <div className="flex items-center gap-3">
                                        <span className={`font-semibold ${color}`}>{status}</span>
                                        {icon}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};
