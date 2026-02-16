# system-stats-mcp-server

MCP server providing system statistics - CPU, memory, disk, uptime, and process monitoring.

## Tools

| Tool | Description |
|------|-------------|
| `cpu` | Get CPU load averages (1m, 5m, 15m) and core count |
| `memory` | Get memory usage (total, used, free in bytes + percentage) |
| `disk` | Get disk usage for a mount point (default: /) |
| `uptime` | Get system uptime string |
| `processes` | Get process count and top CPU consumers |
| `all` | Get all statistics at once |

## Usage Example

```json
{
  "tool": "system-stats_cpu"
}
```

Response:
```json
{
  "load_avg": { "1m": 0.5, "5m": 0.3, "15m": 0.2 },
  "cpu_count": 4
}
```

## Installation

Already configured in `/root/.openclaw/workspace/config/mcporter.json`. Requires no additional setup.

## Requirements

- Linux (uses `/proc`, `free`, `df`, `ps`, `uptime`)
- Node.js 18+
- nproc command available

## Building

```bash
npm install
npm run build
```

## Notes

- Returns human-readable values for load averages
- Memory and disk sizes in bytes for consistency
- Top processes sorted by CPU usage descending
