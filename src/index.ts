#!/usr/bin/env node

/**
 * This is an MCP server that connects to Coqtail in neovim.
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { NeovimManager } from "./neovim.js";
import { z } from "zod";

const server = new McpServer(
  {
    name: "mcp-coqtail-server",
    version: "0.1.0"
  }
);

const neovimManager = NeovimManager.getInstance();

// Register resources
server.resource(
  "session",
  new ResourceTemplate("nvim://session", {
    list: () => ({
      resources: [{
        uri: "nvim://session",
        mimeType: "text/plain",
        name: "Current neovim session",
        description: "Current neovim text editor session"
      }]
    })
  }),
  async (uri) => {
    const bufferContents = await neovimManager.getBufferContents();
    return {
      contents: [{
        uri: uri.href,
        mimeType: "text/plain",
        text: Array.from(bufferContents.entries())
          .map(([lineNum, lineText]) => `${lineNum}: ${lineText}`)
          .join('\n')
      }]
    };
  }
);

server.resource(
  "buffers",
  new ResourceTemplate("nvim://buffers", {
    list: () => ({
      resources: [{
        uri: "nvim://buffers",
        mimeType: "application/json",
        name: "Open Neovim buffers",
        description: "List of all open buffers in the current Neovim session"
      }]
    })
  }),
  async (uri) => {
    const openBuffers = await neovimManager.getOpenBuffers();
    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(openBuffers, null, 2)
      }]
    };
  }
);

// Register tools with proper parameter schemas
server.tool(
  "vim_buffer",
  "Get buffer contents with line numbers",
  { filename: z.string().optional().describe("Optional file name to view a specific buffer") },
  async ({ filename }) => {
    try {
      const bufferContents = await neovimManager.getBufferContents(filename);
      return {
        content: [{
          type: "text",
          text: Array.from(bufferContents.entries())
            .map(([lineNum, lineText]) => `${lineNum}: ${lineText}`)
            .join('\n')
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: error instanceof Error ? error.message : 'Error getting buffer contents'
        }]
      };
    }
  }
);

server.tool(
  "coq_goal",
  "Get the current Coq goal",
  {  },
  async ({ }) => {
      const bufferContents = await neovimManager.getGoalBuffer();
      return {
        content: [{
          type: "text",
          text: bufferContents
        }]
      };
  }
);

server.tool(
  "coq_to_cursor",
  "Move Coq scripting to the current cursor position",
  { },
  async ({ }) => {
      const result = await neovimManager.sendCoqToCursor();
      return {
        content: [{
          type: "text",
          text: result
        }]
      };
  }
);

server.tool(
  "coq_next",
  "Advance Coq scripting by a number of steps",
  { num: z.number().describe("The number of steps to advance") },
  async ({ num }) => {
      const result = await neovimManager.sendCoqNext(num);
      return {
        content: [{
          type: "text",
          text: result
        }]
      };
  }
);

server.tool(
  "coq_revert",
  "Revert Coq scripting by a number of steps",
  { num: z.number().describe("The number of steps to revert") },
  async ({ num }) => {
    const result = await neovimManager.sendCoqRevert(num);
    return {
      content: [{
        type: "text",
        text: result
      }]
    };
  }
);

server.tool(
  "coq_check",
  "Check the type of a Coq term using Coq's Check command.",
  { term: z.string().describe("The term to type-check") },
  async ({ term }) => {
      const result = await neovimManager.sendCoqCheck(term);
      return {
        content: [{
          type: "text",
          text: result
        }]
      };
  }
);

server.tool(
  "coq_print",
  "Print the definition of a Coq term using Coq's Print command.",
  { term: z.string().describe("The term lookup") },
  async ({ term }) => {
      const result = await neovimManager.sendCoqPrint(term);
      return {
        content: [{
          type: "text",
          text: result
        }]
      };
  }
);

server.tool(
  "coq_search",
  "Search for definitions related to the given terms using Coq's Search command.",
  { term: z.string().describe("A list of terms to search for (separated by space)") },
  async ({ term }) => {
      const result = await neovimManager.sendCoqSearch(term);
      return {
        content: [{
          type: "text",
          text: result
        }]
      };
  }
);

server.tool(
  "coq_locate_notation",
  "Locate notations using Coq's Locate command.",
  { term: z.string().describe("A fragment of the notation to locate") },
  async ({ term }) => {
      const result = await neovimManager.sendCoqLocate(term);
      return {
        content: [{
          type: "text",
          text: result
        }]
      };
  }
);

server.tool(
  "get_contents",
  "Get the text in the current buffer at the given position with line numbers.",
  { start: z.number().optional().describe("Line number to start from (current cursor if empty)"), length: z.number().describe("Number of lines to get") },
  async ({ start, length }) => {
      const result = await neovimManager.getContext(length, start);
      return {
        content: [{
          type: "text",
          text: Array.from(result.entries())
            .map(([lineNum, lineText]) => `${lineNum}: ${lineText}`)
            .join('\n')
        }]
      };
  }
);

server.tool(
  "get_cursor_position",
  "Get the current cursor position.",
  { },
  async ({ }) => {
      const result = await neovimManager.getCursorPosition();
      let res = `${result}`;
      return {
        content: [{
          type: "text",
          text: res
        }]
      };
  }
);

server.tool(
  "coq_get_position",
  "Get the position up to which Coq has checked the proof.",
  { },
  async ({ }) => {
      const result = await neovimManager.getCoqPosition();
      let res = `${result}`;
      return {
        content: [{
          type: "text",
          text: res
        }]
      };
  }
);

server.tool(
  "vim_status",
  "Get comprehensive Neovim status including cursor position, mode, marks, and registers",
  {},
  async () => {
      const status = await neovimManager.getNeovimStatus();
      return {
        content: [{
          type: "text",
          text: JSON.stringify(status, null, 2)
        }]
      };
  }
);

server.tool(
  "vim_insert",
  "Insert the given text as new lines starting at the given line number.",
  {
    startLine: z.number().describe("The line number where editing should begin (1-indexed)"),
    lines: z.string().describe("The text content to insert as new lines (don't terminate with newline)")
  },
  async ({ startLine, lines }) => {
      const result = await neovimManager.editLines(startLine, 'insert', lines);
      return {
        content: [{
          type: "text",
          text: result
        }]
      };
  }
);

server.tool(
  "vim_delete",
  "Delete n lines starting at the given line number.",
  {
    startLine: z.number().describe("The line number where editing should begin (1-indexed)"),
    num: z.number().describe("The number of lines to delete")
  },
  async ({ startLine, num }) => {
      const result = await neovimManager.removeLines(startLine, num);
      return {
        content: [{
          type: "text",
          text: result
        }]
      };
  }
);

server.tool(
  "vim_visual",
  "Create visual mode selections in the buffer",
  {
    startLine: z.number().describe("The starting line number for visual selection (1-indexed)"),
    startColumn: z.number().describe("The starting column number for visual selection (0-indexed)"),
    endLine: z.number().describe("The ending line number for visual selection (1-indexed)"),
    endColumn: z.number().describe("The ending column number for visual selection (0-indexed)")
  },
  async ({ startLine, startColumn, endLine, endColumn }) => {
      const result = await neovimManager.visualSelect(startLine, startColumn, endLine, endColumn);
      return {
        content: [{
          type: "text",
          text: result
        }]
      };
  }
);

// New enhanced buffer management tools
/*
server.tool(
  "vim_buffer_switch",
  "Switch between buffers by name or number",
  {
    identifier: z.union([z.string(), z.number()]).describe("Buffer identifier - can be buffer number or filename/path")
  },
  async ({ identifier }) => {
    try {
      const result = await neovimManager.switchBuffer(identifier);
      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: error instanceof Error ? error.message : 'Error switching buffer'
        }]
      };
    }
  }
);
*/

/*
server.tool(
  "vim_buffer_save",
  "Save current buffer or save to specific filename",
  {
    filename: z.string().optional().describe("Optional filename to save buffer to (defaults to current buffer's filename)")
  },
  async ({ filename }) => {
    try {
      const result = await neovimManager.saveBuffer(filename);
      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: error instanceof Error ? error.message : 'Error saving buffer'
        }]
      };
    }
  }
);
*/

/*
server.tool(
  "vim_file_open",
  "Open files into new buffers",
  {
    filename: z.string().describe("Path to the file to open")
  },
  async ({ filename }) => {
    try {
      const result = await neovimManager.openFile(filename);
      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: error instanceof Error ? error.message : 'Error opening file'
        }]
      };
    }
  }
);
*/

// New search and replace tools
server.tool(
  "vim_search",
  "Search within current buffer with regex support and options",
  {
    pattern: z.string().describe("Search pattern (supports regex)"),
    ignoreCase: z.boolean().optional().describe("Whether to ignore case in search (default: false)"),
    wholeWord: z.boolean().optional().describe("Whether to match whole words only (default: false)")
  },
  async ({ pattern, ignoreCase = false, wholeWord = false }) => {
      const result = await neovimManager.searchInBuffer(pattern, { ignoreCase, wholeWord });
      return {
        content: [{
          type: "text",
          text: result
        }]
      };
  }
);

server.tool(
  "vim_search_replace",
  "Find and replace with global, case-insensitive, and confirm options",
  {
    pattern: z.string().describe("Search pattern (supports regex)"),
    replacement: z.string().describe("Replacement text"),
    global: z.boolean().optional().describe("Replace all occurrences in each line (default: false)"),
    ignoreCase: z.boolean().optional().describe("Whether to ignore case in search (default: false)"),
    confirm: z.boolean().optional().describe("Whether to confirm each replacement (default: false)")
  },
  async ({ pattern, replacement, global = false, ignoreCase = false, confirm = false }) => {
      const result = await neovimManager.searchAndReplace(pattern, replacement, { global, ignoreCase, confirm });
      return {
        content: [{
          type: "text",
          text: result
        }]
      };
  }
);

//server.tool(
  //"vim_grep",
  //"Project-wide search using vimgrep with quickfix list",
  //{
    //pattern: z.string().describe("Search pattern to grep for"),
    //filePattern: z.string().optional().describe("File pattern to search in (default: **/* for all files)")
  //},
  //async ({ pattern, filePattern = "**/*" }) => {
    //try {
      //const result = await neovimManager.grepInProject(pattern, filePattern);
      //return {
        //content: [{
          //type: "text",
          //text: result
        //}]
      //};
    //} catch (error) {
      //return {
        //content: [{
          //type: "text",
          //text: error instanceof Error ? error.message : 'Error in grep search'
        //}]
      //};
    //}
  //}
//);

// Health check tool
server.tool(
  "vim_health",
  "Check Neovim connection health",
  {},
  async () => {
    const isHealthy = await neovimManager.healthCheck();
    return {
      content: [{
        type: "text",
        text: isHealthy ? "Neovim connection is healthy" : "Neovim connection failed"
      }]
    };
  }
);

// Register a sample prompt for Coqtail assistance
server.prompt(
  "coqtail_workflow",
  "Get help with planning and proving proofs",
  {
    task: z.enum(["planning", "proving"]).describe("Type of Coqtail task you need help with")
  },
  async ({ task }) => {
    const workflows = {
      planning: "You are looking at Coq proofs. Coq only checks the current file as far as you tell it to.\nYou can check how far Coq has checked the file with `coq_get_position`.\nALWAYS use `vim_buffer` and `get_contents` to read from the current file.\n`vim_buffer` gives you the whole buffer with line numbers. You may use it once if necessary, but not more than that.\nUse `get_contents` instead, which you can use to read part of a file.\nWhen planning proofs, these tools are helpful:\n - `coq_goal`to check the current goal, if inside a `Proof.`.\n- `coq_check` to check the type a term if unsure.\n- `coq_search` to find relevant lemmas if you can't make progress with simpler tactics.\n- `coq_locate_notation` to find out what a Coq notation resolves to.\n- `coq_print` to get the definition of a symbol.",
      proving: "You are looking at Coq proofs. Coq only checks the current file as far as you tell it to.\nYou can check how far Coq has checked the file with `coq_get_position`.\nALWAYS use `vim_buffer` and `get_contents` to read from the current file.\n`vim_buffer` gives you the whole buffer with line numbers. You may use it once if necessary, but not more than that.\nUse `get_contents` instead, which you can use to read part of a file.\nPrefer to edit lines with the `vim_insert`/`vim_delete` tools.\nDo not use find-and-replace to edit single lines. If you are writing proofs, write only one sentence (ending with a dot) per line.",
    };

    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: workflows[task] || "Unknown task type. Available tasks: planning, proving"
          }
        }
      ]
    };
  }
);

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
