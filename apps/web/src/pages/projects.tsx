import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Search, Home, Box, Rocket, Users, Target, Book, FileText, Globe, Plus, RotateCcw } from 'lucide-react'
import { useState } from "react"
import { generateSlug } from 'random-word-slugs'
import { useNavigate } from "react-router-dom"
import { templates } from "@/utils/templates"

export function Projects() {
    const [tech, setTech] = useState<string | null>(null);
    const [projectSlug, setProjectSlug] = useState(generateSlug());
    const navigate = useNavigate();

    const handleRefreshSlug = () => {
        setProjectSlug(generateSlug());
    };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-zinc-900 border-r border-zinc-800 p-4">
        <Button variant="outline" className="text-black w-full mb-6 justify-start gap-2">
          <Plus size={16} />
          Create Mosaic
        </Button>

        <nav className="space-y-2">
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-800">
            <Home size={16} />
            Home
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-800">
            <Box size={16} />
            Mosaics
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-800">
            <Rocket size={16} />
            Deployments
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-800">
            <Target size={16} />
            Usage
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-800">
            <Users size={16} />
            Teams
          </a>
        </nav>

        <div className="mt-8">
          <h2 className="px-3 mb-2 text-sm text-zinc-500">Explore CodeMosaic</h2>
          <nav className="space-y-2">
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-800">
              <Target size={16} />
              Bounties
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-800">
              <Box size={16} />
              Templates
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-800">
              <Book size={16} />
              Learn
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-800">
              <FileText size={16} />
              Documentation
            </a>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <h1 className="text-3xl font-bold mb-8">Create a new Mosaic</h1>

        <Tabs defaultValue="template" className="w-full">
          <TabsList className="bg-zinc-900 border-b border-zinc-800 w-full justify-start rounded-none h-auto p-0">
            <TabsTrigger value="template" className="text-white rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent px-6 py-3">
              Choose a Template
            </TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={16} />
                  <Input 
                    placeholder="Search Templates" 
                    className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 h-[calc(100vh-300px)] overflow-y-auto pr-4 scrollbar-thin">
                    {templates.map((template) => (
                      <Card onClick={() => setTech(template.name)} key={template.name} className={`${template.name === tech ? 'bg-blue-400' : 'bg-zinc-900 hover:bg-zinc-800'} border-zinc-800 p-4 cursor-pointer`}>
                        <div className="flex items-center gap-3 text-white">
                          <span className="text-xl">{template.icon}</span>
                          <div>
                            <div className="font-medium">{template.name}</div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-zinc-400 mb-2 block">Title</label>
                <div className="flex justify-between items-center space-x-2 gap-2">
                    <Input 
                    placeholder={projectSlug}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                    readOnly
                    />
                    <RotateCcw onClick={handleRefreshSlug} className="text-zinc-400 hover:cursor-pointer" />
                </div>
              </div>

                <div>
                  <label className="text-sm font-medium text-zinc-400 mb-4 block">Privacy</label>
                  <RadioGroup defaultValue="public" className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="public" id="public" className="border-zinc-600" />
                      <Label htmlFor="public" className="flex items-center gap-2">
                        <Globe size={16} />
                        <div>
                          <div>Public</div>
                          <div className="text-sm text-zinc-400">Anyone can view and fork this Mosaic.</div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="pt-4">
                  <Button onClick={() => {
                    if (!tech) {
                        alert('Please select a template')
                    }else {
                        navigate(`/code-editor/${projectSlug}?tech=${tech}`)
                    }
                    }}
                     className="w-full bg-orange-600 hover:bg-orange-700">
                    <Plus size={16} className="mr-2" />
                    Create Mosaic
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}