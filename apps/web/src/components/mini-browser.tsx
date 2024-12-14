'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface MiniBrowserProps {
  containerPort?: number;
}

export function MiniBrowser({ containerPort = 3001 }: MiniBrowserProps) {
  const [url, setUrl] = useState(`http://localhost:${containerPort}`)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const navigate = (newUrl: string) => {
    try {
      const parsedUrl = new URL(newUrl)
      if (iframeRef.current) {
        setLoadFailed(false)
        setError(null)
        iframeRef.current.src = parsedUrl.toString()
      }
      setUrl(parsedUrl.toString())
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setError('Invalid URL. Please enter a valid URL including the protocol (e.g., http://)')
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    navigate(url)
  }

  const goBack = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.history.back()
    }
  }

  const goForward = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.history.forward()
    }
  }

  const refresh = () => {
    if (iframeRef.current) {
      navigate(iframeRef.current.src)
    }
  }

  useEffect(() => {
    // Initialize the browser with the container's URL
    navigate(`http://localhost:${containerPort}`)
  }, [containerPort])

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto border rounded-lg overflow-hidden shadow-lg">
      <div className="flex items-center space-x-2 p-2 bg-gray-100">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={goBack} 
          disabled={!canGoBack}
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={goForward} 
          disabled={!canGoForward}
          aria-label="Go forward"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={refresh}
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <form onSubmit={handleSubmit} className="flex-grow">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL"
            className="w-full"
          />
        </form>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {loadFailed && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load the content. This could be due to CORS restrictions or the server not being ready.
          </AlertDescription>
        </Alert>
      )}
      <iframe
        ref={iframeRef}
        src={url}
        className="w-full h-[500px] border-t"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        onLoad={(e) => {
          try {
            if (iframeRef.current && iframeRef.current.contentWindow) {
              const currentUrl = iframeRef.current.contentWindow.location.href
              setUrl(currentUrl)
              setLoadFailed(false)
            }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (err) {
            // If we can't access the contentWindow, the page likely blocked embedding
            setLoadFailed(true)
          }
        }}
        onError={() => {
          setLoadFailed(true)
        }}
      />
    </div>
  )
}

