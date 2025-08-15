import type { GithubBranch, GithubTreeItem, GithubFileContent, GithubUser, GithubRepo, GithubWorkflowRun, GithubWorkflowJob, GithubDeployment, GithubDeploymentStatus } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

const getHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Accept': 'application/vnd.github.v3+json',
});

const handleResponse = async <T,>(response: Response): Promise<T> => {
  if (!response.ok) {
    if (response.status === 401) throw new Error("Unauthorized: Invalid GitHub token.");
    const errorData = await response.json();
    throw new Error(errorData.message || `API request failed with status ${response.status}`);
  }
   if (response.headers.get('Content-Length') === '0' || response.status === 204) {
    return null as T;
  }
  return response.json();
};

export const fetchUser = async (token: string): Promise<GithubUser> => {
    const response = await fetch(`${GITHUB_API_BASE}/user`, { headers: getHeaders(token) });
    return handleResponse<GithubUser>(response);
}

export const fetchRepos = async (token: string): Promise<GithubRepo[]> => {
    const response = await fetch(`${GITHUB_API_BASE}/user/repos?sort=updated&per_page=100`, { headers: getHeaders(token) });
    return handleResponse<GithubRepo[]>(response);
}

export const fetchBranches = async (token: string, owner: string, repo: string): Promise<GithubBranch[]> => {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/branches`, { headers: getHeaders(token) });
  return handleResponse<GithubBranch[]>(response);
};

export const fetchFileTree = async (token: string, owner: string, repo: string, branch: string): Promise<GithubTreeItem[]> => {
  const branchDetails = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/branches/${branch}`, { headers: getHeaders(token) });
  const branchData = await handleResponse<GithubBranch>(branchDetails);
  const treeSha = branchData.commit.sha;

  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`, { headers: getHeaders(token) });
  const data = await handleResponse<{ tree: GithubTreeItem[] }>(response);
  return data.tree;
};


export const fetchFileContent = async (token: string, owner: string, repo: string, path: string, branch: string): Promise<string> => {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, { headers: getHeaders(token) });
  const data = await handleResponse<GithubFileContent>(response);
  // Decode content from base64
  return atob(data.content);
};

export const triggerDeployment = async (token: string, owner: string, repo: string, ref: string): Promise<void> => {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/dispatches`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({
            event_type: 'deploy-from-app',
            client_payload: { ref }
        }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to trigger workflow. Ensure the repo has a workflow with 'on: repository_dispatch'.`);
    }
};

export const getWorkflowRuns = async (token: string, owner: string, repo: string, branch: string): Promise<{ workflow_runs: GithubWorkflowRun[] }> => {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs?branch=${branch}&event=repository_dispatch&per_page=20`, { headers: getHeaders(token) });
    return handleResponse(response);
}

export const getWorkflowJobs = async (token: string, owner: string, repo: string, runId: number): Promise<{ jobs: GithubWorkflowJob[] }> => {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${runId}/jobs`, { headers: getHeaders(token) });
    return handleResponse(response);
}

export const getJobLogs = async (token: string, owner: string, repo: string, jobId: number): Promise<string> => {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`, { 
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3.raw',
        }
    });
     if (!response.ok) {
        throw new Error(`Failed to fetch logs with status ${response.status}`);
    }
    return response.text();
}

export const forkRepo = async (token: string, owner: string, repo: string): Promise<GithubRepo> => {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/forks`, {
        method: 'POST',
        headers: getHeaders(token),
    });
    // The fork API returns 202 Accepted with the new repo object in the body.
    return handleResponse<GithubRepo>(response);
};

export const getLatestSuccessDeploymentUrl = async (token: string, owner: string, repo: string, sha: string): Promise<string | null> => {
    try {
        const deploymentResponse = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/deployments?sha=${sha}&environment=github-pages`, { headers: getHeaders(token) });
        // Fail gracefully if no deployments found, might be a timing issue
        if (deploymentResponse.status !== 200) return null;
        const deployments = await handleResponse<GithubDeployment[]>(deploymentResponse);
        
        if (!deployments || deployments.length === 0) return null;

        // Sort by creation date to get the most recent one for this commit
        deployments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latestDeployment = deployments[0];

        const statusResponse = await fetch(latestDeployment.statuses_url, { headers: getHeaders(token) });
        if (statusResponse.status !== 200) return null;
        const statuses = await handleResponse<GithubDeploymentStatus[]>(statusResponse);

        const successStatus = statuses.find(s => s.state === 'success');
        return successStatus?.environment_url || null;
    } catch (error) {
        console.error("Error fetching deployment URL:", error);
        return null; // Return null on any error to not break the UI
    }
}