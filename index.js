#!/usr/bin/env node
// agentwikis-mcp — public MCP server for Agent Wikis (https://agentwikis.com).
// A thin stdio<->HTTP bridge over the site's /api endpoints, so agents get the
// same payloads (formatting, provenance footers, calibrated `confident` flag)
// as the self-hosted server. Read-only; no API key required.
//
// Point at a different instance with AGENTWIKIS_URL (e.g. a self-hosted app).

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const BASE = (process.env.AGENTWIKIS_URL || 'https://agentwikis.com').replace(/\/$/, '');
const VERSION = '0.1.0';

const server = new Server(
  { name: 'agentwikis', version: VERSION },
  { capabilities: { tools: {} } }
);

const TOOLS = [
  {
    name: 'list_wikis',
    description:
      'List all available wikis with metadata: slug, title, description, ' +
      'tags, status, last updated, document count, and `scope` (what each wiki ' +
      'covers, what it does NOT cover, and how current it is — use this to pick a ' +
      'wiki and to decide when to fall back to web search). Includes "coming soon" ' +
      'placeholders, marked by status.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'open_wiki',
    description:
      'Orient yourself in one wiki, in a single call: returns its metadata, '
      + '`scope` (coverage / not-covered / freshness), document count, the entry '
      + 'document, and a `map` of all documents (paths + titles, grouped by folder) so '
      + 'you can pick what to read_document next. Use a slug from list_wikis.',
    inputSchema: {
      type: 'object',
      properties: {
        wiki: { type: 'string', description: 'Wiki slug, e.g. "hermes".' },
      },
      required: ['wiki'],
      additionalProperties: false,
    },
  },
  {
    name: 'read_document',
    description:
      'Read one document in a wiki. Without `section`, returns the full ' +
      'Markdown (frontmatter stripped) plus a provenance footer. To save tokens on ' +
      'a long page, pass `section` (a heading title as it appears in the page body, ' +
      'or its slug anchor) to retrieve ONLY that section and its subsections. ' +
      'The Markdown may contain [[wikilinks]] to related docs — follow one by ' +
      'calling read_document with path "wiki/<target>.md".',
    inputSchema: {
      type: 'object',
      properties: {
        wiki: { type: 'string', description: 'Wiki slug, e.g. "llama-cpp".' },
        path: {
          type: 'string',
          description: 'Document path within the wiki, e.g. "wiki/concepts/setup.md".',
        },
        section: {
          type: 'string',
          description:
            'Optional. A section anchor or heading title to read just that part.',
        },
      },
      required: ['wiki', 'path'],
      additionalProperties: false,
    },
  },
  {
    name: 'search',
    description:
      'Find the best-matching PAGES for a query, ranked by how many of your query '
      + 'terms each page covers. Searches one wiki if `wiki` is given, otherwise every '
      + 'active wiki. Each result has its wiki, path, matched terms, and a short snippet '
      + 'for orientation — then read_document the page to get the answer. Returns a '
      + '`confident` flag: if false, the wiki(s) likely lack this — fall back to web search.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural-language or keyword query.' },
        wiki: {
          type: 'string',
          description: 'Optional wiki slug to restrict the search. Omit to search all wikis.',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
];

function ok(textOrObj) {
  const text = typeof textOrObj === 'string' ? textOrObj : JSON.stringify(textOrObj);
  return { content: [{ type: 'text', text }] };
}

function fail(message) {
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

// GET a JSON endpoint. On non-200, surfaces the API's own `error` message (plus
// any hints like available slugs or section anchors) so agents can self-correct.
async function api(pathname, params = {}) {
  const url = new URL(BASE + pathname);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: { 'User-Agent': `agentwikis-mcp/${VERSION}` },
    signal: AbortSignal.timeout(30_000),
  });
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const parts = [body?.error || `HTTP ${res.status} from ${url.pathname}`];
    if (body?.available) parts.push(`Available: ${body.available.join(', ')}.`);
    if (body?.sections) parts.push(`Available sections: ${body.sections.join(', ')}.`);
    throw new Error(parts.join(' '));
  }
  if (body === null) throw new Error(`Unexpected non-JSON response from ${url.pathname}`);
  return body;
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name } = req.params;
  const args = req.params.arguments || {};
  try {
    switch (name) {
      case 'list_wikis':
        return ok(await api('/api/wikis'));

      case 'open_wiki': {
        if (!args.wiki) return fail('Missing required argument "wiki".');
        return ok(await api(`/api/wiki/${encodeURIComponent(args.wiki)}/open`));
      }

      case 'read_document': {
        if (!args.wiki || !args.path) return fail('Both "wiki" and "path" are required.');
        const doc = await api(`/api/wiki/${encodeURIComponent(args.wiki)}/doc`, {
          path: args.path,
          section: args.section,
        });
        return ok(doc.text);
      }

      case 'search': {
        if (!args.query) return fail('Missing required argument "query".');
        return ok(await api('/api/search', { q: args.query, wiki: args.wiki }));
      }

      default:
        return fail(`Unknown tool "${name}".`);
    }
  } catch (err) {
    return fail(`Tool "${name}" failed: ${err.message}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Agent Wikis MCP bridge running on stdio (${BASE}).`);
}

main().catch((err) => {
  console.error('Fatal MCP server error:', err);
  process.exit(1);
});
