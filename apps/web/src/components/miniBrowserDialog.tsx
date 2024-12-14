import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { GlobeLock } from 'lucide-react';
import { MiniBrowser } from "./mini-browser";

export function MiniBrowserDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-8 w-8"><GlobeLock /></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Mini Browser</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <MiniBrowser />
        </div>
      </DialogContent>
    </Dialog>
  )
}
