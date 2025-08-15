import { SystemStatus } from '../types';
import type { GithubUser } from '../types';

/**
 * Checks the status of the core GitHub API.
 */
export const checkGitHubApi = async (): Promise<SystemStatus> => {
  try {
    const response = await fetch('https://api.github.com/', { method: 'HEAD', cache: 'no-cache' });
    return response.ok ? SystemStatus.OPERATIONAL : SystemStatus.OUTAGE;
  } catch (error) {
    return SystemStatus.OUTAGE;
  }
};

/**
 * Checks the status of GitHub Actions via the official GitHub Status API.
 */
export const checkGitHubActions = async (): Promise<SystemStatus> => {
    try {
        const response = await fetch('https://www.githubstatus.com/api/v2/summary.json', { cache: 'no-cache' });
        if (!response.ok) return SystemStatus.DEGRADED;

        const data = await response.json();
        const actionsComponent = data.components.find((c: any) => c.name === 'Actions');
        
        if (!actionsComponent) return SystemStatus.DEGRADED;

        switch (actionsComponent.status) {
            case 'operational':
                return SystemStatus.OPERATIONAL;
            case 'degraded_performance':
            case 'partial_outage':
                return SystemStatus.DEGRADED;
            case 'major_outage':
                return SystemStatus.OUTAGE;
            default:
                return SystemStatus.DEGRADED;
        }
    } catch (error) {
        return SystemStatus.OUTAGE;
    }
};

/**
 * Checks the reachability of the Gemini API endpoint.
 * A no-cors fetch is used to check network-level reachability from the client.
 */
export const checkGeminiApi = async (): Promise<SystemStatus> => {
  try {
    // We expect an opaque response, but if it doesn't throw, the endpoint is reachable.
    await fetch('https://generativelanguage.googleapis.com', { mode: 'no-cors', cache: 'no-cache' });
    return SystemStatus.OPERATIONAL;
  } catch (error) {
    // This catches network errors (DNS, server down, etc.)
    return SystemStatus.OUTAGE;
  }
};

/**
 * Checks if the main dashboard services are functioning by verifying user data is loaded.
 */
export const checkDashboardServices = async (user: GithubUser | null): Promise<SystemStatus> => {
    // Simple check: if user data is loaded, the core dashboard service is working.
    return user ? SystemStatus.OPERATIONAL : SystemStatus.DEGRADED;
};

/**
 * Checks if browser local storage is available and working.
 */
export const checkBrowserStorage = async (): Promise<SystemStatus> => {
  try {
    const testKey = 'edgedeploy_status_check';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return SystemStatus.OPERATIONAL;
  } catch (e) {
    return SystemStatus.OUTAGE;
  }
};
