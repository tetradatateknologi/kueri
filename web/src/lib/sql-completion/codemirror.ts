import { autocompletion, type CompletionContext as CmCompletionContext } from "@codemirror/autocomplete";
import { Compartment, type Extension } from "@codemirror/state";

import { getCompletionReplaceRange, getSqlCompletionContext } from "./context";
import { buildSqlCompletions } from "./suggestions";
import type { SqlCompletionSchema } from "./types";

export const sqlCompletionCompartment = new Compartment();

export function createSqlCompletionExtension(getSchema: () => SqlCompletionSchema | null): Extension {
  return sqlCompletionCompartment.of(
    autocompletion({
      activateOnTyping: true,
      maxRenderedOptions: 50,
      override: [
        (context: CmCompletionContext) => {
          const schema = getSchema();
          if (!schema || schema.isLoading || schema.connectionId <= 0) {
            return null;
          }

          const sql = context.state.doc.toString();
          const completionContext = getSqlCompletionContext({
            sql,
            cursorOffset: context.pos,
          });

          if (completionContext.type === "none") {
            return null;
          }

          const replaceRange = getCompletionReplaceRange(sql, context.pos);
          const word = context.matchBefore(/[\w."`]*$/);
          const from = word ? word.from : replaceRange.from;

          const options = buildSqlCompletions({
            schema,
            sql,
            cursorOffset: context.pos,
            context: completionContext,
          });

          if (options.length === 0) {
            return null;
          }

          return {
            from,
            to: context.pos,
            options,
            validFor: /^[\w."`]*$/,
          };
        },
      ],
    }),
  );
}

export function getSqlDialect(driver: string | undefined) {
  switch (driver) {
    case "postgres":
      return "postgres";
    case "mysql":
      return "mysql";
    default:
      return "postgres";
  }
}
