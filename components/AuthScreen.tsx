import React, { useState } from 'react';
import { EdgeDeployLogo, GithubIcon } from './icons';

interface AuthScreenProps {
  onConnect: (token: string) => void;
  isLoading: boolean;
  error: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onConnect, isLoading, error }) => {
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) {
        onConnect(token);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <EdgeDeployLogo className="w-12 h-12 text-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-center text-foreground mb-2">Welcome to EdgeDeploy</h1>
        <p className="text-center text-muted-foreground mb-8">
          The Vercel-inspired dashboard for your GitHub projects.
        </p>
        
        <div className="bg-card border border-border rounded-lg p-8">
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive-foreground/80 text-sm p-3 rounded-md mb-6 text-center">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="token-input" className="text-sm font-medium text-muted-foreground">GitHub Personal Access Token</label>
                <input
                  id="token-input"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full mt-1 bg-background border border-input rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !token}
                className="w-full flex justify-center items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-md text-sm transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GithubIcon className="w-4 h-4" />
                {isLoading ? 'Verifying...' : 'Continue with GitHub'}
              </button>
            </form>
        </div>
        
        <div className="mt-6 border border-border rounded-lg p-6 bg-card/50">
            <h3 className="text-md font-semibold text-foreground mb-3">How to get a GitHub Token</h3>
            <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                <li>
                    <a href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=EdgeDeploy" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        Generate a new personal access token
                    </a> on GitHub.
                </li>
                <li>
                    Ensure the <code className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm text-xs font-mono">repo</code> and <code className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm text-xs font-mono">workflow</code> scopes are selected. This allows EdgeDeploy to access your projects and trigger deployments.
                </li>
                <li>
                    Copy the generated token and paste it into the field above.
                </li>
            </ol>
             <p className="mt-4 text-xs text-muted-foreground">
                Your token is stored securely in your browser's local storage and is never sent to our servers.
             </p>
        </div>
      </div>
    </div>
  );
};