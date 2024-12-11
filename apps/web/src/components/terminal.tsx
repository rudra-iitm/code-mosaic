import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

interface TerminalProps {
    projectSlug: string;
  }

export default function Terminal({projectSlug}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const commandRef = useRef('')
  const wsRef = useRef<WebSocket | null>(null)

  console.log('Project Slug:', projectSlug);

  useEffect(() => {
    if (terminalRef.current) {
      xtermRef.current = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#ffffff',
        },
      })

      const fitAddon = new FitAddon()
      xtermRef.current.loadAddon(fitAddon)
      xtermRef.current.open(terminalRef.current)
      fitAddon.fit()

      xtermRef.current.writeln('Welcome to the frontend terminal!')
      xtermRef.current.writeln('Type "help" for a list of available commands.')
      promptUser()

      xtermRef.current.onKey(({ key, domEvent }) => {
        const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

        if (domEvent.key === 'Enter') {
          processCommand(commandRef.current);
        } else if (domEvent.key === 'Backspace' || domEvent.keyCode === 8) {
          if (commandRef.current.length > 0) {
            commandRef.current = commandRef.current.slice(0, -1);
            xtermRef.current?.write('\b \b');
          }
        } else if (domEvent.ctrlKey && domEvent.key === 'c') {
          xtermRef.current?.writeln('^C');
          commandRef.current = '';
          promptUser();
        } else if (printable) {
          commandRef.current += key;
          console.log('Command:', commandRef.current);
          xtermRef.current?.write(key);
        }
      });

      wsRef.current = new WebSocket('ws://localhost:8000')
      wsRef.current.onopen = () => {
        xtermRef.current?.writeln('Connected to server')
      }
      wsRef.current.onmessage = (event) => {
        xtermRef.current?.writeln(event.data)
      }
      wsRef.current.onerror = () => {
        xtermRef.current?.writeln('Error: Could not connect to server')
      }
      wsRef.current.onclose = () => {
        xtermRef.current?.writeln('Disconnected from server')
      }

      return () => {
        xtermRef.current?.dispose()
        wsRef.current?.close()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const promptUser = () => {
    xtermRef.current?.write('\r\n$ ')
  }

  const processCommand = (currentCommand: string = '') => {
    xtermRef.current?.writeln('');
    console.log('Command:', currentCommand);
    if (currentCommand.trim() !== '') {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ projectSlug: projectSlug, command: currentCommand.split(' ') })
        );
      } else {
        xtermRef.current?.writeln('Error: Not connected to server');
      }
    }
    commandRef.current = '';
    promptUser();
  };

  return (
    <div className="w-full h-full min-h-[400px] bg-gray-900 p-2 overflow-hidden shadow-lg">
      <div ref={terminalRef} className="w-full h-full" />
    </div>
  )
}
