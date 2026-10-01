# agentwikis-mcp

MCP server for [Agent Wikis](https://agentwikis.com) — maintained, agent-readable knowledge bases compiled from messy, fast-moving sources. Read-only; no API key or account needed for the free tier, and an optional Pro key adds the XL tier.

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

## Pro (XL) access

Wikis ship in two tiers: the free `wiki/` pages, and an **XL** tier of deeper
per-item reference pages included with [Agent Wikis Pro](https://www.agentwikis.com/pro).

Set `AGENTWIKIS_API_KEY` to your Pro key and all three read tools widen to cover it:

```json
{
  "mcpServers": {
    "agentwikis": {
      "command": "npx",
      "args": ["-y", "agentwikis-mcp"],
      "env": { "AGENTWIKIS_API_KEY": "aw_..." }
    }
  }
}
```

**Hermes Agent:** keep the key in your profile's `.env` and map it in
`config.yaml`. Hermes passes a stdio server only its configured `env`, never
the `.env` itself. If the variable is unset, the server falls back to the free
tier.

```yaml
mcp_servers:
  agentwikis:
    command: npx
    args: ["-y", "agentwikis-mcp"]
    env:
      AGENTWIKIS_API_KEY: "${AGENTWIKIS_API_KEY}"
```

| | Without a key | With a Pro key |
|---|---|---|
| `open_wiki` | free pages; an `xl` field says how many Pro pages exist | free **+ XL** pages, XL marked `gated: true` |
| `search` | free pages only; an `xl` field reports how many Pro pages were **not** searched | ranks across both tiers, `confident` calibrated over the full corpus |
| `read_document` | `402` on an XL path | returns the XL page |

Without a key, a `confident: true` search result means *"the best **free** page covers
your terms"* — the `xl` field on the response tells you how much you didn't see.

**Routing tip.** XL pages are per-item depth, not broader coverage. When a question
names a specific plugin, hook, CLI surface, runtime, API, or deployment procedure,
prefer the `gated: true` page over the general concept page.

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
