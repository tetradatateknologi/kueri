import type { TableAliasMap } from "./types";

const TABLE_REF_PATTERN =
  /\b(?:FROM|JOIN)\s+(?:(?:"([^"]+)"|`([^`]+)`|([a-zA-Z_][\w$]*))\.)?(?:"([^"]+)"|`([^`]+)`|([a-zA-Z_][\w$]*))(?:\s+(?:AS\s+)?(?:"([^"]+)"|`([^`]+)`|([a-zA-Z_][\w$]*)))?/gi;

function pickIdentifier(...groups: (string | undefined)[]): string | undefined {
  return groups.find((g) => g != null && g.length > 0);
}

export function extractSimpleTableAliases(sql: string): TableAliasMap {
  const aliases: TableAliasMap = {};
  const pattern = new RegExp(TABLE_REF_PATTERN.source, "gi");

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    const schema = pickIdentifier(match[1], match[2], match[3]);
    const table = pickIdentifier(match[4], match[5], match[6]);
    const alias = pickIdentifier(match[7], match[8], match[9]);

    if (!table) continue;

    if (alias) {
      aliases[alias] = { schema, table };
    }

    aliases[table] = { schema, table };
  }

  return aliases;
}

export function extractReferencedTables(sql: string): Array<{ schema?: string; table: string }> {
  const aliases = extractSimpleTableAliases(sql);
  const seen = new Set<string>();
  const tables: Array<{ schema?: string; table: string }> = [];

  for (const entry of Object.values(aliases)) {
    const key = `${entry.schema ?? ""}\0${entry.table}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tables.push(entry);
  }

  return tables;
}
