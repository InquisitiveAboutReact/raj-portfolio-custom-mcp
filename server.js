import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const PORTFOLIO_DATA = {
  profile: {
    name: "Raja Chatterjee",
    title: "IT Technical Delivery Manager & AI Engineer",
    experience: "18+ years in enterprise delivery, OCI, fast formulas, and AI/RAG engineering",
    location: "India",
  },
  certifications: [
    "Oracle Cloud Infrastructure Enterprise AI Professional",
    "Oracle Payroll Cloud Certified Implementation Professional",
    "Claude Certified Associate - Foundations",
    "Microsoft Certified: Azure Solutions Architect",
  ],
  skills: [
    "Technical Delivery Management",
    "Enterprise Software Implementation",
    "Oracle Cloud Infrastructure (OCI)",
    "AI & RAG Engineering",
    "React & Node.js",
    "Docker & n8n Automation",
  ],
};

const app = express();
const PORT = process.env.PORT || 3000;

// Factory function to instantiate an MCP Server instance per client session
function createMcpServer() {
  const mcpServer = new Server(
    {
      name: "raj-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available portfolio tools
  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "get_candidate_profile",
        description: "Returns executive summary of Raja Chatterjee",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "get_certifications",
        description: "Retrieves list of verified technical & AI certifications",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "query_skills_and_projects",
        description: "Searches candidate skills and architectural focus areas",
        inputSchema: {
          type: "object",
          properties: {
            keyword: { type: "string", description: "Skill or domain keyword" },
          },
          required: ["keyword"],
        },
      },
    ],
  }));

  // Handle execution of portfolio tools
  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = request.params.arguments || {};

    if (toolName === "get_candidate_profile") {
      return {
        content: [{ type: "text", text: JSON.stringify(PORTFOLIO_DATA.profile, null, 2) }],
      };
    }

    if (toolName === "get_certifications") {
      return {
        content: [{ type: "text", text: JSON.stringify(PORTFOLIO_DATA.certifications, null, 2) }],
      };
    }

    if (toolName === "query_skills_and_projects") {
      const keyword = (args.keyword || "").toLowerCase();
      const matchedSkills = PORTFOLIO_DATA.skills.filter((s) =>
        s.toLowerCase().includes(keyword)
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ query: args.keyword, matchedSkills }, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${toolName}`);
  });

  return mcpServer;
}

// Active SSE Transports lookup map
const transports = {};

// Root welcome/health landing endpoint
app.get("/", (req, res) => {
  res.status(200).send("Raja Chatterjee MCP Server is running live!");
});

// Primary SSE Transport connection endpoint
app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  const mcpServer = createMcpServer();

  transports[transport.sessionId] = transport;

  res.on("close", () => {
    delete transports[transport.sessionId];
  });

  await mcpServer.connect(transport);
});

// Message POST endpoint for SSE client-to-server calls
app.post("/messages", express.json(), async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];

  if (!transport) {
    return res.status(404).json({ error: "Session not found or expired" });
  }

  await transport.handlePostMessage(req, res);
});

app.listen(PORT, () => {
  console.log(`Enterprise MCP server listening on port ${PORT}`);
});