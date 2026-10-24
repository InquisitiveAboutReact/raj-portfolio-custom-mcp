import express from "express";
import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  isInitializeRequest,
} from "@modelcontextprotocol/sdk/types.js";

const SERVER_NAME = "raj-mcp-server";
const SERVER_VERSION = "1.1.0";
const PORT = process.env.PORT || 3000;

const PORTFOLIO_DATA = {
  profile: {
    name: "Raja Chatterjee",
    title: "IT Technical Delivery Manager & AI Engineer",
    experience: "18+ years in enterprise delivery, OCI, Fast Formulas, and AI/RAG engineering",
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
    "AI Engineering",
    "Retrieval-Augmented Generation (RAG)",
    "Model Context Protocol (MCP)",
    "Local LLMs and Ollama",
    "Embeddings and Vector Search",
    "Hybrid Search and Deterministic Retrieval",
    "React and Vite",
    "Node.js and Express",
    "MCP Server Development",
    "Docker and n8n Automation",
    "Serverless Deployment",
    "Incident Analysis and Root-Cause Analysis",
    "Legacy Application Modernization",
  ],

  // Statuses are explicit so design-stage work is not presented as shipped.
  projects: [
    {
      name: "Hybrid RAG for Portfolio Website",
      status: "In progress / prototype",
      summary:
        "A cost-conscious website RAG pipeline combining local vector similarity during development with deterministic text matching as a serverless production fallback.",
      technologies: [
        "RAG", "Ollama", "nomic-embed-text", "Embeddings", "Vector Search",
        "Upstash Vector", "Vercel", "React",
      ],
      architectureFocus: [
        "Embedding-dimension compatibility",
        "Local-versus-serverless architecture",
        "Hybrid semantic and lexical retrieval",
        "Zero-cost graceful fallback",
      ],
    },
    {
      name: "Custom Portfolio MCP Server",
      status: "Deployed / connected for testing",
      summary:
        "A Node.js MCP service that exposes portfolio profile, certification, and skills/project search tools to compatible MCP clients.",
      technologies: [
        "MCP", "Node.js", "Express", "Model Context Protocol SDK",
        "SSE", "Streamable HTTP", "JSON-RPC", "Render",
      ],
      architectureFocus: [
        "MCP tool discovery and invocation",
        "Streamable HTTP and SSE transports",
        "Session management and message routing",
        "Searchable portfolio knowledge",
      ],
    },
    {
      name: "AI-powered AMS Automation Hub",
      status: "Design / MVP planning",
      summary:
        "An interview and portfolio demonstration concept for ingesting CSV/Excel incident dumps, analyzing incidents with a local LLM, and supporting application health monitoring, root-cause analysis, and modernization recommendations.",
      technologies: [
        "n8n", "Ollama", "Local LLM", "CSV", "Excel",
        "Incident Management", "Application Monitoring",
      ],
      architectureFocus: [
        "Workflow automation",
        "Local/private AI inference",
        "Incident ingestion and normalization",
        "Root-cause analysis assistance",
        "Legacy modernization recommendations",
      ],
    },
    {
      name: "Local MCP System with Ollama and Llama 3.2",
      status: "Technical article / learning project",
      summary:
        "A locally run LLM and custom MCP filesystem-tool concept using stdio and JSON-RPC, with CLI and MCP Inspector interaction.",
      technologies: [
        "MCP", "Ollama", "Llama 3.2", "Node.js", "stdio",
        "JSON-RPC", "MCP Inspector", "prompt_toolkit",
      ],
      architectureFocus: [
        "Local-first AI",
        "MCP tool integration",
        "Filesystem tools",
        "Offline-capable workflows",
        "Developer tooling",
      ],
    },
    {
      name: "AI-enabled React Portfolio",
      status: "Implemented / iterating",
      summary:
        "A React portfolio website using a Vite-based build and GitHub Pages deployment, with an AI portfolio assistant and analytics-oriented interaction ideas.",
      technologies: ["React", "Vite", "GitHub Pages", "Chatbase", "Umami", "RAG"],
      architectureFocus: [
        "Frontend deployment",
        "AI assistant integration",
        "Environment-variable configuration",
        "Portfolio analytics",
      ],
    },
  ],

  architecturalFocusAreas: [
    "RAG pipeline design: ingestion, chunking, embeddings, retrieval, and grounded response generation",
    "Hybrid retrieval: semantic vector similarity combined with deterministic text matching",
    "MCP architecture: tools/list, tools/call, JSON-RPC, SSE, and Streamable HTTP patterns",
    "Local AI architecture: Ollama, local language models, and local embedding models",
    "Serverless constraints: network reachability, cold starts, API cost, and embedding compatibility",
    "AI workflow automation with n8n",
    "AMS incident analytics, root-cause analysis, and application health monitoring",
    "Legacy application modernization recommendations",
    "React/Node.js application architecture and deployment",
    "Enterprise delivery management and technical leadership",
  ],
};

// ---------- Search helpers ----------

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "area", "for", "in", "of", "on",
  "or", "project", "the", "to", "with", "focus",
]);

// Lowercase and keep only letters, digits, and the symbols + # (for C#, C++ style terms).
function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim();
}

// Simple plural handling so "skill" matches "skills" and "project" matches "projects".
function stem(token) {
  return token.length > 3 && token.endsWith("s") && !token.endsWith("ss")
    ? token.slice(0, -1)
    : token;
}

function tokensOf(text) {
  return normalize(text)
    .split(" ")
    .filter(Boolean)
    .map(stem);
}

// Whole-word matching ("rag" does not match "storage"). A full-phrase hit scores higher.
function scoreText(text, phrase, terms) {
  const normalized = normalize(text);
  if (!normalized) return 0;

  const tokens = new Set(tokensOf(normalized));
  let score = 0;
  if (phrase && normalized.includes(phrase)) score += 3;
  for (const term of terms) {
    if (tokens.has(term)) score += 1;
  }
  return score;
}

function searchPortfolio(keyword) {
  const query = String(keyword ?? "").trim();
  const phrase = normalize(query);
  const terms = [...new Set(tokensOf(query).filter((t) => !STOP_WORDS.has(t)))];

  if (!terms.length) {
    return {
      query,
      resultCount: 0,
      matchedSkills: [],
      matchedProjects: [],
      matchedArchitecturalFocusAreas: [],
      note: "Enter a skill, technology, project name, or architecture keyword.",
    };
  }

  // Rank items by score, drop non-matches, and return the original items.
  const rank = (items, toText) =>
    items
      .map((item) => ({ item, score: scoreText(toText(item), phrase, terms) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);

  const matchedSkills = rank(PORTFOLIO_DATA.skills, (skill) => skill);

  const matchedProjects = rank(PORTFOLIO_DATA.projects, (project) =>
    [
      project.name,
      project.status,
      project.summary,
      ...project.technologies,
      ...project.architectureFocus,
    ].join(" ")
  );

  const matchedArchitecturalFocusAreas = rank(
    PORTFOLIO_DATA.architecturalFocusAreas,
    (area) => area
  );

  return {
    query,
    resultCount:
      matchedSkills.length +
      matchedProjects.length +
      matchedArchitecturalFocusAreas.length,
    matchedSkills,
    matchedProjects,
    matchedArchitecturalFocusAreas,
  };
}

// ---------- MCP server factory ----------

// One isolated MCP server per client session (both SSE and Streamable HTTP).
function createMcpServer() {
  const mcpServer = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "get_candidate_profile",
        description: "Returns the executive summary of Raja Chatterjee.",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "get_certifications",
        description: "Returns the portfolio's listed technical and AI certifications.",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "query_skills_and_projects",
        description:
          "Searches skills, projects, technologies, and architectural focus areas. Accepts a keyword or natural-language query; results include matchedSkills, matchedProjects, and matchedArchitecturalFocusAreas.",
        inputSchema: {
          type: "object",
          properties: {
            keyword: {
              type: "string",
              minLength: 1,
              description: "A skill, technology, project, or architecture keyword or query.",
            },
          },
          required: ["keyword"],
        },
      },
      {
        name: "get_portfolio_projects",
        description:
          "Returns the listed portfolio projects, their status, summaries, technologies, and architecture focus.",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "get_architectural_focus_areas",
        description: "Returns the portfolio's listed architectural focus areas.",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
    ],
  }));

  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = request.params.arguments || {};
    let result;

    switch (toolName) {
      case "get_candidate_profile":
        result = PORTFOLIO_DATA.profile;
        break;
      case "get_certifications":
        result = PORTFOLIO_DATA.certifications;
        break;
      case "query_skills_and_projects":
        result = searchPortfolio(args.keyword);
        break;
      case "get_portfolio_projects":
        result = PORTFOLIO_DATA.projects;
        break;
      case "get_architectural_focus_areas":
        result = PORTFOLIO_DATA.architecturalFocusAreas;
        break;
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  return mcpServer;
}

// ---------- Express app ----------

const app = express();

// CORS. Browser-based MCP clients need the Mcp-Session-Id header exposed and allowed.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID"
  );
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

// Session stores. Each transport has its own map so IDs can't cross over.
const sseSessions = new Map();   // sessionId -> { transport, server }
const httpSessions = new Map();  // sessionId -> { transport, server }

app.get("/", (_req, res) => {
  res.status(200).send("Raja Chatterjee MCP Server is running live!");
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    server: SERVER_NAME,
    version: SERVER_VERSION,
    transports: ["sse", "streamable-http"],
    activeSessions: { sse: sseSessions.size, streamableHttp: httpSessions.size },
  });
});

// ----- Legacy SSE transport: GET /sse + POST /messages -----

app.get("/sse", async (req, res, next) => {
  try {
    const transport = new SSEServerTransport("/messages", res);
    const server = createMcpServer();
    sseSessions.set(transport.sessionId, { transport, server });

    res.on("close", () => {
      sseSessions.delete(transport.sessionId);
      server.close().catch(() => {});
    });

    await server.connect(transport);
  } catch (error) {
    next(error);
  }
});

app.post("/sse", (_req, res) => {
  res.status(405).send("Method Not Allowed. Connect via GET /sse.");
});

// Do not add express.json() globally: the SSE transport reads the raw body itself.
app.post("/messages", async (req, res) => {
  const session = sseSessions.get(String(req.query.sessionId ?? ""));

  if (!session) {
    return res.status(404).json({ error: "Session not found or expired" });
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Error handling SSE message:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to handle MCP message" });
    }
  }
});

// ----- Streamable HTTP transport: POST / GET / DELETE /mcp -----

const jsonBody = express.json({ limit: "1mb" });

app.post("/mcp", jsonBody, async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-transform");

  // Experiment: buffer the reply and send it with a fixed Content-Length
  // instead of chunked framing, which the proxy is mangling.
  const chunks = [];
  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  res.write = (chunk, ...args) => {
    if (chunk) chunks.push(Buffer.from(chunk));
    return true;
  };
  res.end = (chunk, ...args) => {
    if (chunk) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks);
    if (!res.headersSent) res.setHeader("Content-Length", body.length);
    return originalEnd(body);
  };

  try {
    const sessionId = req.headers["mcp-session-id"];
    let transport;

    if (sessionId) {
      const session = httpSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({
          jsonrpc: "2.0",
          error: { code: -32001, message: "Session not found" },
          id: null,
        });
      }
      transport = session.transport;
    } else if (isInitializeRequest(req.body)) {
      const server = createMcpServer();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
        onsessioninitialized: (id) => {
          httpSessions.set(id, { transport, server });
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) httpSessions.delete(transport.sessionId);
        server.close().catch(() => {});
      };

      await server.connect(transport);
    } else {
      return res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: no valid session ID provided" },
        id: null,
      });
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling Streamable HTTP POST:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

// GET opens the optional server-to-client stream; DELETE ends the session.
const handleSessionRequest = async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  const session = sessionId ? httpSessions.get(sessionId) : undefined;

  if (!session) {
    return res.status(400).send("Invalid or missing Mcp-Session-Id");
  }

  try {
    await session.transport.handleRequest(req, res);
  } catch (error) {
    console.error("Error handling Streamable HTTP session request:", error);
    if (!res.headersSent) res.status(500).send("Internal server error");
  }
};

app.get("/mcp", handleSessionRequest);
app.delete("/mcp", handleSessionRequest);

// ----- Errors -----

app.use((error, _req, res, _next) => {
  console.error("Unhandled server error:", error);
  if (!res.headersSent) res.status(500).send("Internal server error");
});

// ----- Start and shut down cleanly (Render sends SIGTERM on redeploy) -----

const httpServer = app.listen(PORT, () => {
  console.log(`${SERVER_NAME} v${SERVER_VERSION} listening on port ${PORT}`);
  console.log("Transports: SSE at /sse, Streamable HTTP at /mcp");
});

async function shutdown(signal) {
  console.log(`Received ${signal}, closing sessions...`);
  const sessions = [...sseSessions.values(), ...httpSessions.values()];
  await Promise.allSettled(sessions.map(({ transport }) => transport.close()));
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));