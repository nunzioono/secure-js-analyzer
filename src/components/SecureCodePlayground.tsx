import React, { useState, useRef } from "react";
import * as monaco from "monaco-editor";
import prettier from "prettier/standalone";
import parserBabel from "prettier/parser-babel";
import { analyzeAndInstrument } from "@analyzer/analyzer";
import { createWorkerScript } from "@analyzer/workerTemplate";

import { Toolbar } from "./Toolbar";
import { ExecutionLogPanel } from "./ExecutionLogPanel";
import { TimelinePanel } from "./TimelinePanel";
import { EditorContainer } from "./EditorContainer";
import { LogEntry } from "./types";

/**
 * SecureCodePlayground
 * 
 * Wires up the editor, formatting, analysis, execution, and logging.
 */
export function SecureCodePlayground() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  function handleEditorMount(editor: monaco.editor.IStandaloneCodeEditor) {
    editorRef.current = editor;

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      formatCode();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      analyzeAndRunCode();
    });

    editor.onDidChangeModelContent(() => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        formatCode();
      }, 2000);
    });
  }

  function formatCode() {
    if (editorRef.current) {
      const raw = editorRef.current.getValue();
      try {
        const formatted = prettier.format(raw, {
          parser: "babel",
          plugins: [parserBabel],
          semi: true,
          singleQuote: true,
          tabWidth: 2,
        });
        editorRef.current.setValue(formatted);
      } catch (err) {
        console.error("Prettier format error:", err);
      }
    }
  }

  function analyzeAndRunCode() {
    if (editorRef.current) {
      const userCode = editorRef.current.getValue();
      try {
        const instrumentedCode = analyzeAndInstrument(userCode);
        const workerCode = createWorkerScript(instrumentedCode);

        const blob = new Blob([workerCode], { type: "application/javascript" });
        const worker = new Worker(URL.createObjectURL(blob));

        setLogs([]); // Clear previous logs

        worker.onmessage = (event) => {
          setLogs((prev) => [...prev, event.data as LogEntry]);
        };

        worker.onerror = (error) => {
          setLogs((prev) => [
            ...prev,
            { type: "error", payload: { message: error.message } } as LogEntry,
          ]);
        };
      } catch (e: any) {
        setLogs([{ type: "error", payload: { message: e.message } }]);
      }
    }
  }

  return (
    <div className="p-4 space-y-4">
      <Toolbar onFormat={formatCode} onRun={analyzeAndRunCode} />
      <EditorContainer onEditorMount={handleEditorMount} initialCode={`function greet(name) {\nreturn 'Hello,'+name;\n}`} />
      <ExecutionLogPanel logs={logs} />
      <TimelinePanel logs={logs} />
    </div>
  );
}

