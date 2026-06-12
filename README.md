# agentwikis-mcp

MCP server for [Agent Wikis](https://agentwikis.com) — maintained, agent-readable knowledge bases compiled from messy, fast-moving sources. Read-only, no API key, no account.

Four tools shaped for an agent's loop:

| Tool | What it does |
|---|---|
| `list_wikis` | Every wiki + its declared **scope** (covers / not covered / current-as-of) |
| `open_wiki` | One wiki's metadata + full document map — orient in a single call |
| `search` | Ranked pages with a calibrated **`confident` flag** — when `false`, fall back to web search |
| `read_document` | Full page or a single **section**, with a provenance footer |

The scope declarations and the `confident` flag exist so your agent knows when *not* to trust the wiki — measured ~94% correct abstention. Details and the full eval: [agentwikis.com/why-wikis](https://www.agentwikis.com/why-wikis).

## Install

**Claude Code**

```bash
claude mcp add agentwikis -- npx -y agentwikis-mcp
```

**Codex** (`~/.codex/config.toml`)

```toml
[mcp_servers.agentwikis]
command = "npx"
args = ["-y", "agentwikis-mcp"]
```

**Any MCP client** (JSON config)

```json
{ "mcpServers": { "agentwikis": { "command": "npx", "args": ["-y", "agentwikis-mcp"] } } }
```

## Self-hosted instances

Point the bridge at your own Agent Wikis deployment (e.g. a private-wiki install):

```bash
AGENTWIKIS_URL=https://wikis.internal.example npx -y agentwikis-mcp
```

## What's inside

The bridge talks to `agentwikis.com/api/*` and returns the same payloads as the self-hosted stdio server — same document formatting, same provenance footers, same search calibration. Requires Node 18+.

Agent Wikis also serves everything as plain Markdown + [llms.txt](https://www.agentwikis.com/llms.txt) if you'd rather skip MCP entirely: see [agentwikis.com/for-agents](https://www.agentwikis.com/for-agents).

## License

MIT
