import { useRef } from 'react'
import Editor from '@monaco-editor/react'

const CodeEditor = ({ code, onChange, language = 'javascript' }) => {
    const editorRef = useRef(null)
    
    let monacoLang = 'javascript';
    if (language === 'cpp') monacoLang = 'cpp';
    if (language === 'python') monacoLang = 'python';

    return (
        <div className="code-editor-container h-full">
            <Editor
                height="100%"
                language={monacoLang}
                value={code}
                onChange={onChange}
                onMount={(editor) => { editorRef.current = editor }}
                theme="vs-dark"
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                    wordWrap: 'on',
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontLigatures: true,
                    cursorBlinking: 'smooth',
                    smoothScrolling: true,
                    padding: { top: 12, bottom: 12 }
                }}
            />
        </div>
    )
}

export default CodeEditor
