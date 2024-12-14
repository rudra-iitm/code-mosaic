import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button.tsx";
import { TerminalIcon } from "lucide-react";
import Terminal from "@/components/terminal";
import { MiniBrowserDialog } from "./miniBrowserDialog";

interface TerminalDrawerProps {
  projectSlug: string;
}

export const TerminalDrawer = ({ projectSlug }: TerminalDrawerProps) => {
  return (
    <Drawer>
    <DrawerTrigger asChild>
      <Button variant="outline" className="h-8 w-8"><TerminalIcon /></Button>
    </DrawerTrigger>
    <DrawerContent>
      <div className="w-full h-full px-16">
        <DrawerHeader>
          <DrawerTitle>
            <div className="flex items-center justify-between">
              <div>
                Terminal
              </div>
              <MiniBrowserDialog />
            </div>
          </DrawerTitle>
        </DrawerHeader>
        <div className="w-full h-[calc(100%-140px)]">
          <Terminal projectSlug={projectSlug} />
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </div>
    </DrawerContent>
  </Drawer>
  )
}
