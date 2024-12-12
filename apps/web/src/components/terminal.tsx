import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebglAddon } from 'xterm-addon-webgl';
import 'xterm/css/xterm.css';

interface TerminalProps {
    projectSlug: string;
}

export default function Terminal({ projectSlug }: TerminalProps) {
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (terminalRef.current) {
            const terminal = new XTerm({
                cursorBlink: true,
                fontSize: 14,
                fontFamily: '"Cascadia Code", Menlo, Monaco, "Courier New", monospace',
                theme: {
                    background: '#282c34',
                    foreground: '#abb2bf',
                    black: '#282c34',
                    brightBlack: '#5c6370',
                    red: '#e06c75',
                    brightRed: '#e06c75',
                    green: '#98c379',
                    brightGreen: '#98c379',
                    yellow: '#d19a66',
                    brightYellow: '#d19a66',
                    blue: '#61afef',
                    brightBlue: '#61afef',
                    magenta: '#c678dd',
                    brightMagenta: '#c678dd',
                    cyan: '#56b6c2',
                    brightCyan: '#56b6c2',
                    white: '#abb2bf',
                    brightWhite: '#ffffff',
                },
                allowTransparency: true,
            });

            const fitAddon = new FitAddon();
            terminal.loadAddon(fitAddon);
            // terminal.loadAddon(new WebglAddon());
            terminal.open(terminalRef.current);
            fitAddon.fit();

            const ws = new WebSocket('ws://localhost:8000');

            ws.onopen = () => {
                terminal.writeln('Connected to server');
                ws.send(JSON.stringify({ projectSlug, command: 'init' }));
            };

            ws.onmessage = (event) => {
                if (event.data instanceof Blob) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        terminal.write(new Uint8Array(reader.result as ArrayBuffer));
                    };
                    reader.readAsArrayBuffer(event.data);
                } else if (typeof event.data === 'string') {
                    try {
                        const jsonData = JSON.parse(event.data);
                        if (jsonData.error) {
                            terminal.writeln(`Error: ${jsonData.error}`);
                        } else if (jsonData.message) {
                            terminal.writeln(jsonData.message);
                        }
                    } catch {
                        terminal.write(event.data);
                    }
                }
            };

            ws.onerror = () => {
                terminal.writeln('Error: Unable to connect to server');
            };

            ws.onclose = () => {
                terminal.writeln('Disconnected from server');
            };

            terminal.onData((data) => {
                ws.send(data);
            });

            const handleResize = () => {
                fitAddon.fit();
            };

            window.addEventListener('resize', handleResize);

            return () => {
                terminal.dispose();
                ws.close();
                window.removeEventListener('resize', handleResize);
            };
        }
    }, [projectSlug]);

    return (
        <div className="w-full h-full min-h-[400px] bg-[#282c34] p-4 rounded-lg overflow-hidden shadow-lg">
            <div ref={terminalRef} className="w-full h-full rounded-md overflow-hidden" />
        </div>
    );
}
