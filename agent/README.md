# Code Agent - AI-Powered Codebase Assistant

An AI agent that understands your HTML/JS codebase and answers questions about code flows, dependencies, and references.

## Features

- 🔍 Natural language queries about your code
- 🔗 Trace dependencies and module relationships
- 📝 Find all references to functions/variables
- 🌊 Understand data flows between modules
- 🤖 Powered by Claude API with custom static analysis

## Quick Start

### 1. Installation

```bash
cd agent
pip install -r requirements.txt --break-system-packages
```

### 2. Configuration

Create `agent/config.yml`:

```yaml
anthropic_api_key: "your-api-key-here"
repo_path: ".."  # Path to your repo root
ignore_patterns:
  - "node_modules"
  - "dist"
  - "build"
  - ".git"
file_extensions:
  - ".js"
  - ".jsx"
  - ".html"
  - ".ts"
  - ".tsx"
```

### 3. Index Your Codebase

```bash
python agent/indexer.py
```

This creates:
- `agent_data/embeddings/` - Vector embeddings of your code
- `agent_data/code_graph.json` - Module dependency graph
- `agent_data/file_index.json` - Searchable file metadata

### 4. Query Your Code

```bash
# Interactive mode
python agent/cli.py

# Single query
python agent/cli.py "What does the authentication flow look like?"

# Find references
python agent/cli.py "Find all places where saveUser is called"

# Trace dependencies
python agent/cli.py "What modules does auth.js depend on?"
```

## Example Queries

- "Explain the login flow from the form submission to the API call"
- "What would I need to update if I change the User schema?"
- "Find all components that use the fetchData utility"
- "Show me the data flow from HomePage to the API"
- "What files import React hooks?"

## How It Works

1. **Static Analysis**: Parses JS/HTML files using AST to build dependency graphs
2. **Embedding**: Creates vector embeddings of code chunks for semantic search
3. **Query Processing**: Uses Claude with custom tools to analyze your code
4. **Context Assembly**: Retrieves relevant files and provides them to Claude

## Auto-Update on Push

The GitHub Action in `.github/workflows/update-index.yml` automatically reindexes when you push changes.

## Architecture

```
┌─────────────┐
│  Your Query │
└──────┬──────┘
       │
       v
┌─────────────────┐      ┌──────────────┐
│  Query Engine   │─────>│  Claude API  │
└────────┬────────┘      └──────────────┘
         │
         v
    ┌────────────────────┐
    │   Analysis Tools   │
    ├────────────────────┤
    │ - Vector Search    │
    │ - AST Parser       │
    │ - Dependency Graph │
    │ - Reference Finder │
    └────────────────────┘
```

## Troubleshooting

**Large Repo?** Adjust `max_files_per_query` in config.yml to limit context size.

**API Rate Limits?** Reduce query frequency or cache common queries.

**Inaccurate Results?** Run `python agent/indexer.py --force` to rebuild the index.

## Cost Estimates

- Indexing: ~$0.01-0.10 per 1000 files (one-time + updates)
- Queries: ~$0.01-0.05 per query depending on context size

## License

MIT
