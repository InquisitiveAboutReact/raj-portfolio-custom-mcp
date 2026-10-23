import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { HttpServerTransport } from "@modelcontextprotocol/sdk/server/http.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

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

const server = new Server(
  { name: "raj-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ✅ Official SDK tool registration
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_candidate_profile",
        description: "Returns executive summary of Raja Chatterjee",
        inputSchema: { type: "object", properties: {}, required: [] }
      },
      {
        name: "get_certifications",
        description: "Retrieves list of verified technical & AI certifications",
        inputSchema: { type: "object", properties: {}, required: [] }
      },
      {
        name: "query_skills_and_projects",
        description: "Searches candidate skills and architectural focus areas",
        inputSchema: {
          type: "object",
          properties: { keyword: { type: "string", description: "Skill or domain keyword" } },
          required: ["keyword"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "get_candidate_profile") {
    return { content: [{ type: "text", text: JSON.stringify(PORTFOLIO_DATA.profile, null, 2) }] };
  } else if (name === "get_certifications") {
    return { content: [{ type: "text", text: JSON.stringify(PORTFOLIO_DATA.certifications, null, 2) }] };
  } else if (name === "query_skills_and_projects") {
    const keyword = (args?.keyword || "").toLowerCase();
    const matchedSkills = PORTFOLIO_DATA.skills.filter(s => s.toLowerCase().includes(keyword));
    return { content: [{ type: "text", text: JSON.stringify({ query: args?.keyword, matchedSkills }, null, 2) }] };
  }

  throw new Error(`Tool not found: ${name}`);
});

// ✅ Use HTTP transport (handles SSE + POST automatically)
const transport = new HttpServerTransport({
  port: parseInt(process.env.PORT || "3000"),
  host: "0.0.0.0"
});

server.connect(transport);