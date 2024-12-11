import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from 'lucide-react'
import { motion } from "framer-motion"

interface TreeItemProps {
  icon: React.ElementType
  label: string
  children?: React.ReactNode
  defaultExpanded?: boolean
  onSelect?: (file: string) => void
  active?: boolean
}

function TreeItem({ icon: Icon, label, children, defaultExpanded = false, onSelect, active }: TreeItemProps) {
    const [expanded, setExpanded] = React.useState(defaultExpanded)
    const hasChildren = React.Children.count(children) > 0
  
    return (
      <div>
        <motion.button
          onClick={() => {
            if (hasChildren) {
              setExpanded(!expanded)
            } else if (onSelect) {
              onSelect(label)
            }
          }}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors",
            hasChildren ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" : "hover:bg-blue-50 dark:hover:bg-blue-900",
            active && "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {hasChildren ? (
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", !expanded && "-rotate-90")}
            />
          ) : (
            <div className="w-4" />
          )}
          <Icon className="h-4 w-4" />
          {label}
        </motion.button>
        {hasChildren && expanded && (
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
    )
  }

  export { TreeItem }