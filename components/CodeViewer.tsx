import React from 'react';
import { SparklesIcon } from './icons';

interface CodeViewerProps {
  fileName: string | null;
  content: string | null;
  isLoading: boolean;
  onExplain: () => void;
  isExplaining: boolean;
  explanation: string | null;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  fileName,
  content,
  isLoading,
  onExplain,
  isExplaining,
  explanation,
}) => {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-6">
            <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
        </div>
      );
    }

    if (!content) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>Select a file to view its content.</p>
        </div>
      );
    }

    return (
      <pre className="p-4 text-sm text-foreground/80 overflow-auto font-mono h-full">
        <code>{content}</code>
      </pre>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0">
        <h3 className="font-mono text-sm text-muted-foreground">{fileName || 'No file selected'}</h3>
        {content && (
          <button
            onClick={onExplain}
            disabled={isExplaining}
            className="flex items-center px-3 py-1 text-xs font-semibold text-foreground bg-secondary rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SparklesIcon className="w-4 h-4 mr-1.5 text-blue-400" />
            {isExplaining ? 'Analyzing...' : 'Explain Code'}
          </button>
        )}
      </div>
      <div className="flex-grow overflow-auto relative">
        {explanation || isExplaining ? (
          <div className="grid grid-cols-2 h-full divide-x divide-border">
            <div className="overflow-auto">{renderContent()}</div>
            <div className="overflow-auto p-6">
              <h4 className="text-lg font-bold text-card-foreground mb-3">AI Code Explanation</h4>
              {isExplaining && !explanation ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-5/6"></div>
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert text-foreground/90 max-w-none" dangerouslySetInnerHTML={{ __html: explanation || '' }} />
              )}
            </div>
          </div>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
};