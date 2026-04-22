# Coqtail MCP Server

Connect Claude Desktop (or any Model Context Protocol client) to Neovim with [Coqtail](https://github.com/whonore/coqtail) using MCP and the official neovim/node-client JavaScript library.
This server leverages Vim's native text editing commands as well as Coqtail's abilities to check and understand Rocq proofs.

This server is based on the [mcp-neovim-server](https://github.com/bigcodegen/mcp-neovim-server).

## Features

- Connects to your nvim instance if you expose a socket file, for example `--listen /tmp/nvim.sock`, when starting nvim
- Views your current buffer and proof state
- Optionally (if permitted), open new buffers and save buffers
- Allows to `Search`/`Check`/`Print`/`Locate` to plan proofs.
- Allows to delete/insert into your file to realize proofs
- Allows to step Rocq's proof state and get feedback on errors.

## API

### Resources

- `nvim://session`: Current neovim text editor session
- `nvim://buffers`: List of all open buffers in the current Neovim session with metadata including modified status, syntax, and window IDs

### Tools

#### Rocq Proof Management

- **coq_to_line**
  - Run Rocq checking up to a specific line (`CoqToLine`)
  - Input: `line` (number) — line number to advance checking to
  - Returns: command feedback and current checked position

- **coq_get_position**
  - Get the line Rocq has checked up to
  - Input: none
  - Returns: line number

#### Rocq Introspection

- **coq_goal**
  - Get the current proof goal
  - Input: none
  - Returns: goal buffer contents

- **coq_check**
  - Check a term's type
  - Input: `term` (string) — the term to type-check
  - Returns: type information

- **coq_print**
  - Print a term's definition
  - Input: `term` (string) — the term to look up
  - Returns: definition

- **coq_search**
  - Search for lemmas/definitions by keyword
  - Input: `term` (string) — keywords to search for (space-separated)
  - Returns: matching definitions

- **coq_locate_notation**
  - Find what a notation expands to
  - Input: `term` (string) — notation fragment to locate
  - Returns: resolved notation

#### Neovim Buffer Operations

When `ALLOW_FS_OPS=true`, mutating tools (`vim_insert`, `vim_delete`, `vim_search_replace`) also save the current buffer automatically.

- **vim_buffer**
  - Get buffer contents with line numbers (supports filename parameter)
  - Input: `filename` (string, optional) — get specific buffer by filename
  - Returns: numbered lines with buffer content

- **get_contents**
  - Read a range of lines from the buffer
  - Input: `start` (number, optional) — line to start from (defaults to cursor); `length` (number) — number of lines
  - Returns: numbered lines

- **vim_insert**
  - Insert lines at a position and optionally check with Rocq
  - Input: `startLine` (number) — line to insert at (1-indexed); `lines` (string) — text to insert; `checkCoq` (boolean, optional, default: `true`)
  - Returns: success/error message (or Rocq feedback when `checkCoq=true`)

- **vim_delete**
  - Delete lines from the buffer
  - Input: `startLine` (number) — starting line (1-indexed); `num` (number) — number of lines to delete
  - Returns: success/error message

- **vim_buffer_save**
  - Save the current buffer or write to a specific filename
  - Input: `filename` (string, optional) — save to this filename instead of the current buffer path
  - Returns: success/error message

- **vim_buffer_switch**
  - Switch to another open buffer by number or filename
  - Input: `identifier` (string | number) — target buffer number or filename/path
  - Returns: switched buffer metadata

- **vim_file_open**
  - Open a file into a new buffer
  - Input: `filename` (string) — path to the file to open
  - Returns: opened buffer metadata

- **vim_search**
  - Search buffer with regex
  - Input: `pattern` (string) — regex search pattern; `ignoreCase` (boolean, optional); `wholeWord` (boolean, optional)
  - Returns: search results

- **vim_search_replace**
  - Find and replace in buffer (always replaces all matches)
  - Input: `pattern` (string) — search pattern; `replacement` (string); `ignoreCase` (boolean, optional)
  - Returns: replacement results

### Prompts

- **coqtail_workflow**: Get contextual help and guidance for common Coqtail workflows including planning and proving.

## Configuration

### Environment Variables

- `NVIM_SOCKET_PATH`: Set to the path of your Neovim socket. Defaults to '/tmp/nvim' if not specified.
- `ALLOW_FS_OPS`: Set to `true` to allow filesystem operations such as opening files and saving buffers. Defaults to `false`.

## Installation
### Manual Installation
For now, you need a fork of Coqtail installed in neovim that exposes more information about the proof  state in vim: https://github.com/lgaeher/Coqtail/tree/lennard/coqtail-mcp

Then, Clone this repository and run `bun run build` in your checkout.

Now, add this to your `opencode.json`/`claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "coqtail-mcp": {
      "type": "local",
      "command": [
        "bun",
        "run",
        "/path-to-your-checkout/build/index.js"
      ],

      "environment": {
        "NVIM_SOCKET_PATH": "/tmp/nvim.sock"
      }
    }
  }
}
```

Finally, you'll have to start your nvim instance with `nvim --listen /tmp/nvim.sock` and afterwards launch your Opencode/Claude Code instance.

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
