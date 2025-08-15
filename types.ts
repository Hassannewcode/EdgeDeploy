export interface GithubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GithubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface GithubFileContent {
  name:string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  content: string;
  encoding: string;
}

export interface FileTreeNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: { [key: string]: FileTreeNode };
}

export enum DeploymentStatus {
    IDLE = 'IDLE',
    TRIGGERED = 'TRIGGERED',
    IN_PROGRESS = 'IN_PROGRESS',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
}

export interface GithubUser {
  login: string;
  avatar_url: string;
  html_url: string;
  name: string;
}

export interface GithubRepo {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    owner: {
        login: string;
    };
    private: boolean;
    updated_at: string;
}

export interface GithubWorkflowRun {
    id: number;
    status: 'queued' | 'in_progress' | 'completed';
    conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
    html_url: string;
    jobs_url: string;
    created_at: string;
}

export interface GithubWorkflowJob {
    id: number;
    run_id: number;
    status: 'queued' | 'in_progress' | 'completed';
    conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
    name: string;
}

export enum View {
  DEPLOYMENTS,
  SOURCE,
  SETTINGS,
}

export enum SystemStatus {
  OPERATIONAL = 'Operational',
  DEGRADED = 'Degraded Performance',
  OUTAGE = 'Major Outage',
  CHECKING = 'Checking...',
}