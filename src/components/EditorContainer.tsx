import React, { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";

/**
 * Props for the EditorContainer component.
 */
export interface EditorContainerProps {
  /**
   * Called when the editor instance is created and ready.
   */
  onEditorMount: (editor: monaco.editor.IStandaloneCodeEditor) => void;

  /**
   * Initial code content to display in the editor.
   */
  initialCode: string;
}

/**
 * Editor Container
 * 
 * Renders Monaco Editor inside a div and notifies when ready.
 */
export function EditorContainer({ onEditorMount, initialCode }: EditorContainerProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current) {
      const modelUri = monaco.Uri.parse("inmemory://model.js");
      const model = monaco.editor.createModel(
        initialCode,
        "javascript",
        modelUri
      );

      const instance = monaco.editor.create(editorRef.current, {
        model,
        theme: "vs-dark",
        automaticLayout: true,
      });

      onEditorMount(instance);

      return () => {
        instance.dispose();
      };
    }
  }, [onEditorMount, initialCode]);

  return <div ref={editorRef} style={{ height: "500px", width: "100%" }} />;
}

