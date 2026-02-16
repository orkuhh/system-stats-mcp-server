"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const server = new index_js_1.Server({ name: "system-stats", version: "1.0.0" }, { capabilities: { tools: {} } });
// Tool implementations
async function getCpuInfo() {
    const { stdout } = await execAsync("cat /proc/loadavg | awk '{print $1, $2, $3}'");
    const [load1, load5, load15] = stdout.trim().split(" ").map(Number);
    // Get CPU count
    const { stdout: cpuCount } = await execAsync("nproc");
    return {
        load_avg: { "1m": load1, "5m": load5, "15m": load15 },
        cpu_count: parseInt(cpuCount.trim())
    };
}
async function getMemoryInfo() {
    const { stdout } = await execAsync("free -b | grep Mem");
    const values = stdout.trim().split(/\s+/).map(Number);
    return {
        total_bytes: values[1],
        used_bytes: values[2],
        free_bytes: values[3],
        usage_percent: ((values[2] / values[1]) * 100).toFixed(2)
    };
}
async function getDiskInfo() {
    const { stdout } = await execAsync("df -B1 / | tail -1 | awk '{print $2, $3, $4}'");
    const [total, used, free] = stdout.trim().split(/\s+/).map(Number);
    return {
        total_bytes: total,
        used_bytes: used,
        free_bytes: free,
        usage_percent: ((used / total) * 100).toFixed(2),
        mount_point: "/"
    };
}
async function getUptime() {
    const { stdout } = await execAsync("uptime -p 2>/dev/null || uptime");
    return { uptime_string: stdout.trim() };
}
async function getProcessCount() {
    const { stdout } = await execAsync("ps aux --no-headers | wc -l");
    return { process_count: parseInt(stdout.trim()) };
}
async function getTopProcesses(limit = 5) {
    const { stdout } = await execAsync(`ps aux --no-headers | sort -nr -k3 | head -${limit}`);
    const lines = stdout.trim().split("\n").filter(Boolean);
    return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
            user: parts[0],
            pid: parseInt(parts[1]),
            cpu: parseFloat(parts[2]),
            mem: parseFloat(parts[3]),
            command: parts.slice(10).join(" ")
        };
    });
}
// Tool handlers
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "cpu",
                description: "Get CPU load averages and core count",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "memory",
                description: "Get memory usage (total, used, free, percentage)",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "disk",
                description: "Get disk usage for mount point",
                inputSchema: {
                    type: "object",
                    properties: {
                        mount_point: { type: "string", default: "/", description: "Mount point to check" }
                    }
                }
            },
            {
                name: "uptime",
                description: "Get system uptime",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "processes",
                description: "Get running process count and top CPU consumers",
                inputSchema: {
                    type: "object",
                    properties: {
                        limit: { type: "number", default: 5, description: "Number of top processes to return" }
                    }
                }
            },
            {
                name: "all",
                description: "Get all system statistics at once",
                inputSchema: { type: "object", properties: {} }
            }
        ]
    };
});
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "cpu":
                return { content: [{ type: "text", text: JSON.stringify(await getCpuInfo(), null, 2) }] };
            case "memory":
                return { content: [{ type: "text", text: JSON.stringify(await getMemoryInfo(), null, 2) }] };
            case "disk":
                const mountPoint = args?.mount_point || "/";
                const { stdout } = await execAsync(`df -B1 "${mountPoint}" | tail -1 | awk '{print $2, $3, $4}'`);
                const [total, used, free] = stdout.trim().split(/\s+/).map(Number);
                const result = {
                    total_bytes: total,
                    used_bytes: used,
                    free_bytes: free,
                    usage_percent: ((used / total) * 100).toFixed(2),
                    mount_point: mountPoint
                };
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            case "uptime":
                return { content: [{ type: "text", text: JSON.stringify(await getUptime(), null, 2) }] };
            case "processes":
                const limit = args?.limit || 5;
                const procCount = await getProcessCount();
                const topProcs = await getTopProcesses(limit);
                return { content: [{ type: "text", text: JSON.stringify({ ...procCount, top_processes: topProcs }, null, 2) }] };
            case "all":
                return { content: [{ type: "text", text: JSON.stringify({
                                cpu: await getCpuInfo(),
                                memory: await getMemoryInfo(),
                                disk: await getDiskInfo(),
                                uptime: await getUptime(),
                                processes: await getProcessCount(),
                                top_processes: await getTopProcesses(5)
                            }, null, 2) }] };
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return { content: [{ type: "text", text: `Error: ${error}` }], isError: true };
    }
});
// Start server
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("System Stats MCP Server running on stdio");
}
main().catch(console.error);
