import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { File, Folder, ChevronDown } from "lucide-react";

interface TreeItemProps {
  icon: React.ElementType
  label: string
  children?: React.ReactNode
  defaultExpanded?: boolean
  onSelect?: (file: string) => void
  active?: boolean
}

function TreeItem({ icon: Icon, label, children, defaultExpanded = false, onSelect, active }: TreeItemProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  return (
    <div>
      <motion.button
        onClick={() => {
          if (defaultExpanded) {
            setExpanded(!expanded);
          } else if (onSelect) {
            onSelect(label);
          }
        }}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors",
          defaultExpanded ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" : "hover:bg-blue-50 dark:hover:bg-blue-900",
          active && "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200"
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {defaultExpanded && (
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", !expanded && "-rotate-90")}
          />
        )}
        {!defaultExpanded && <div className="w-4" />}
        <Icon className="h-4 w-4" />
        {label}
      </motion.button>
      {defaultExpanded && expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="ml-6"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}


  function FileTree({ onFileSelect, activeFile, listObjects }: { 
    onFileSelect: (fileName: string) => void; 
    activeFile?: string; 
    listObjects: unknown[]; 
  }) {
    type TreeNode = {
      label: string | number;
      path: string;
      children: TreeNode[] | null;
  };
  
  const buildTree = (objects: unknown[]) => {
      const root: TreeNode[] = [];
      const map: { [key: string]: TreeNode } = {};
    
      objects.forEach((obj) => {
        const parts = (obj as { Key: string }).Key.split('/');
        const slicedParts = parts.slice(2);
  
        if (slicedParts.length === 0) {
          return;
        }
  
        let currentLevel = root;
    
        slicedParts.forEach((part: string | number, index: number) => {
          if (!map[part]) {
            const isFolder = index < parts.length - 1;
            const newNode = {
              label: part,
              path: parts.slice(0, index + 1).join('/'),
              Key: (obj as { Key: string }).Key,
              children: isFolder ? [] : null,
            };
    
            currentLevel.push(newNode);
            map[part] = newNode;
          }
    
          if (map[part].children) {
            currentLevel = map[part].children;
          }
        });
      });
  
      console.log(root);
    
      return root;
  };
  
    const renderTree = (nodes: any[]) => {
      return nodes.map((node) => {
        const isFolder = node.children && node.children.length > 0;
  
        return (
          <TreeItem
            key={node.Key}
            icon={isFolder ? Folder : File}
            label={node.label}
            defaultExpanded={isFolder}
            onSelect={() => !isFolder && onFileSelect(node.Key)}
            active={activeFile === node.Key}
          >
            {isFolder && renderTree(node.children)}
          </TreeItem>
        );
      });
    };
  
    const treeData = buildTree(listObjects);
  
    return <div className="space-y-1">{renderTree(treeData)}</div>;
  }

  export { FileTree }