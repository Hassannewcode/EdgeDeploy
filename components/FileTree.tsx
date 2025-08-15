import React, { useState, useMemo } from 'react';
import type { FileTreeNode, GithubTreeItem } from '../types';
import { FolderIcon, FileIcon, ChevronRightIcon } from './icons';

interface FileTreeProps {
  treeData: GithubTreeItem[];
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
}

const buildFileTree = (items: GithubTreeItem[]): FileTreeNode => {
  const root: FileTreeNode = { name: 'root', type: 'directory', path: '', children: {} };

  items.forEach(item => {
    let currentLevel = root.children!;
    const pathParts = item.path.split('/');
    
    pathParts.forEach((part, index) => {
      if (index === pathParts.length - 1) {
        if (!currentLevel[part]) {
          currentLevel[part] = { 
            name: part, 
            type: item.type === 'blob' ? 'file' : 'directory', 
            path: item.path,
            children: item.type === 'tree' ? {} : undefined,
          };
        }
      } else {
        if (!currentLevel[part]) {
          const parentPath = pathParts.slice(0, index + 1).join('/');
          currentLevel[part] = { 
            name: part, 
            type: 'directory', 
            path: parentPath,
            children: {} 
          };
        }
        if(currentLevel[part].children){
          currentLevel = currentLevel[part].children!;
        }
      }
    });
  });

  return root;
};


const TreeNode: React.FC<{ node: FileTreeNode; onFileSelect: (path: string) => void; selectedFile: string | null; depth: number; }> = ({ node, onFileSelect, selectedFile, depth }) => {
  const [isOpen, setIsOpen] = useState(depth < 1);

  if (node.type === 'file') {
    const isSelected = selectedFile === node.path;
    return (
      <div
        className={`flex items-center pl-2 pr-2 py-1.5 cursor-pointer rounded-md transition-colors text-sm ${
          isSelected ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
        }`}
        style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
        onClick={() => onFileSelect(node.path)}
      >
        <FileIcon className="w-4 h-4 mr-2 flex-shrink-0" />
        <span className="truncate">{node.name}</span>
      </div>
    );
  }

  const sortedChildren = Object.values(node.children || {}).sort((a: FileTreeNode, b: FileTreeNode) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'directory' ? -1 : 1;
  });

  return (
    <div>
      <div
        className="flex items-center pl-2 pr-2 py-1.5 cursor-pointer rounded-md text-foreground hover:bg-accent/50 transition-colors text-sm"
        style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <ChevronRightIcon className={`w-3.5 h-3.5 mr-1.5 flex-shrink-0 transition-transform text-muted-foreground ${isOpen ? 'rotate-90' : 'rotate-0'}`} />
        <FolderIcon className="w-4 h-4 mr-2 flex-shrink-0 text-yellow-500" />
        <span className="font-medium truncate">{node.name}</span>
      </div>
      {isOpen && (
        <div className="border-l border-border/50" style={{ marginLeft: `${depth * 1.25 + 1.25}rem`}}>
          {sortedChildren.map(child => (
            <TreeNode key={child.path} node={child} onFileSelect={onFileSelect} selectedFile={selectedFile} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({ treeData, onFileSelect, selectedFile }) => {
  const fileTree = useMemo(() => buildFileTree(treeData), [treeData]);

  const sortedRoot = Object.values(fileTree.children || {}).sort((a: FileTreeNode, b: FileTreeNode) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'directory' ? -1 : 1;
  });

  return (
    <div className="flex-grow overflow-y-auto pr-1">
      {sortedRoot.map(node => (
        <TreeNode key={node.path} node={node} onFileSelect={onFileSelect} selectedFile={selectedFile} depth={0} />
      ))}
    </div>
  );
};