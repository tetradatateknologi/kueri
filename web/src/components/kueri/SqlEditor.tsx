import { sql, PostgreSQL, MySQL } from "@codemirror/lang-sql";
import {
  defaultKeymap,
  history,
  historyKeymap,
  toggleComment,
} from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { Compartment, EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { useEffect, useRef } from "react";

import { useTheme } from "@/context/theme";
import { getEditorThemeExtensions } from "@/lib/codemirror-theme";
import {
  createSqlCompletionExtension,
  getSqlDialect,
  sqlCompletionCompartment,
  useSqlCompletionSchema,
} from "@/lib/sql-completion";
import { cn } from "@/lib/utils";

type SqlEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  onEditScript?: () => void;
  readOnly?: boolean;
  connectionId?: number | null;
  className?: string;
};

function getSqlLanguage(driver: string | undefined) {
  switch (getSqlDialect(driver)) {
    case "mysql":
      return sql({ dialect: MySQL });
    case "postgres":
    default:
      return sql({ dialect: PostgreSQL });
  }
}

export function SqlEditor({
  value,
  onChange,
  onRun,
  onEditScript,
  readOnly = false,
  connectionId = null,
  className,
}: SqlEditorProps) {
  const { resolvedTheme } = useTheme();
  const completionSchema = useSqlCompletionSchema(connectionId, value);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartmentRef = useRef(new Compartment());
  const completionSchemaRef = useRef(completionSchema);
  completionSchemaRef.current = completionSchema;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;
  const onEditScriptRef = useRef(onEditScript);
  onEditScriptRef.current = onEditScript;

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const runKeymap = keymap.of([
      {
        key: "Mod-Enter",
        run: () => {
          onRunRef.current?.();
          return true;
        },
      },
      {
        key: "Mod-/",
        run: toggleComment,
      },
      {
        key: "Mod-e",
        run: () => {
          onEditScriptRef.current?.();
          return true;
        },
      },
    ]);

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        getSqlLanguage(completionSchemaRef.current?.databaseType),
        createSqlCompletionExtension(() => completionSchemaRef.current),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        themeCompartmentRef.current.of(getEditorThemeExtensions(resolvedTheme)),
        Prec.high(runKeymap),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        EditorState.readOnly.of(readOnly),
        updateListener,
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, [readOnly]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartmentRef.current.reconfigure(getEditorThemeExtensions(resolvedTheme)),
    });
  }, [resolvedTheme]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: sqlCompletionCompartment.reconfigure(
        createSqlCompletionExtension(() => completionSchemaRef.current),
      ),
    });
  }, [completionSchema]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={cn("h-full min-h-0 overflow-hidden bg-surface-1", className)}
    />
  );
}
