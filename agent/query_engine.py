#!/usr/bin/env python3
"""
Query Engine - Uses Claude API with code analysis tools to answer questions
"""

import json
import yaml
from pathlib import Path
from typing import List, Dict, Any
from anthropic import Anthropic
from tools import CodeAnalysisTools


class QueryEngine:
    def __init__(self, config_path: str = "config.yml"):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.anthropic = Anthropic(api_key=self.config['anthropic_api_key'])
        self.tools = CodeAnalysisTools(
            Path("agent_data"),
            self.config['vector_db']
        )
        
        self.model = self.config['model']
        self.max_files = self.config['max_files_per_query']
    
    def _build_tool_definitions(self) -> List[Dict]:
        """Define tools that Claude can use"""
        return [
            {
                "name": "semantic_search",
                "description": "Search the codebase for files related to a query using semantic understanding. Returns relevant code files and snippets.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The search query describing what to look for"
                        },
                        "n_results": {
                            "type": "integer",
                            "description": "Number of results to return (default: 10)",
                            "default": 10
                        }
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "find_references",
                "description": "Find all references to a function, class, or variable in the codebase. Shows where it's called, imported, or used.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "symbol": {
                            "type": "string",
                            "description": "The function, class, or variable name to find"
                        },
                        "search_type": {
                            "type": "string",
                            "description": "Type of reference: 'all', 'function_call', 'import', 'definition', or 'property'",
                            "default": "all"
                        }
                    },
                    "required": ["symbol"]
                }
            },
            {
                "name": "get_dependencies",
                "description": "Get all dependencies (imports) of a file, optionally recursive to show the full dependency tree.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "filepath": {
                            "type": "string",
                            "description": "Path to the file relative to repo root"
                        },
                        "recursive": {
                            "type": "boolean",
                            "description": "Whether to include nested dependencies",
                            "default": False
                        }
                    },
                    "required": ["filepath"]
                }
            },
            {
                "name": "get_dependents",
                "description": "Find all files that depend on (import from) a given file.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "filepath": {
                            "type": "string",
                            "description": "Path to the file relative to repo root"
                        }
                    },
                    "required": ["filepath"]
                }
            },
            {
                "name": "get_file_summary",
                "description": "Get detailed information about a file including its structure, functions, classes, imports, and dependencies.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "filepath": {
                            "type": "string",
                            "description": "Path to the file relative to repo root"
                        }
                    },
                    "required": ["filepath"]
                }
            },
            {
                "name": "get_call_chain",
                "description": "Find where a function is defined and all places it's called from.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "function_name": {
                            "type": "string",
                            "description": "Name of the function to trace"
                        }
                    },
                    "required": ["function_name"]
                }
            },
            {
                "name": "trace_data_flow",
                "description": "Trace how data flows from one file/function to others through exports and imports.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "start_file": {
                            "type": "string",
                            "description": "Starting file path"
                        },
                        "symbol": {
                            "type": "string",
                            "description": "Symbol (function/variable) to trace"
                        }
                    },
                    "required": ["start_file", "symbol"]
                }
            }
        ]
    
    def _execute_tool(self, tool_name: str, tool_input: Dict) -> Any:
        """Execute a tool and return results"""
        if tool_name == "semantic_search":
            return self.tools.semantic_search(
                tool_input['query'],
                tool_input.get('n_results', 10)
            )
        elif tool_name == "find_references":
            return self.tools.find_references(
                tool_input['symbol'],
                tool_input.get('search_type', 'all')
            )
        elif tool_name == "get_dependencies":
            return self.tools.get_dependencies(
                tool_input['filepath'],
                tool_input.get('recursive', False)
            )
        elif tool_name == "get_dependents":
            return self.tools.get_dependents(tool_input['filepath'])
        elif tool_name == "get_file_summary":
            return self.tools.get_file_summary(tool_input['filepath'])
        elif tool_name == "get_call_chain":
            return self.tools.get_call_chain(tool_input['function_name'])
        elif tool_name == "trace_data_flow":
            return self.tools.trace_data_flow(
                tool_input['start_file'],
                tool_input['symbol']
            )
        else:
            return {"error": f"Unknown tool: {tool_name}"}
    
    def query(self, question: str, verbose: bool = False) -> str:
        """Query the codebase using Claude with tools"""
        
        system_prompt = """You are a code analysis assistant helping developers understand their JavaScript/HTML codebase. 

You have access to tools that can:
- Search the codebase semantically
- Find all references to functions/variables
- Analyze dependencies between files
- Trace data flows
- Get detailed file information

When answering questions:
1. Use the appropriate tools to gather information
2. Provide specific file paths and line numbers when relevant
3. Explain code flows step-by-step
4. If changes are needed, list all files that would need updates
5. Be concise but thorough

The codebase is JavaScript/HTML. File paths are relative to the repository root."""

        messages = [{"role": "user", "content": question}]
        
        if verbose:
            print(f"\n🤔 Question: {question}\n")
        
        # Agentic loop
        max_iterations = 10
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            
            response = self.anthropic.messages.create(
                model=self.model,
                max_tokens=4096,
                system=system_prompt,
                tools=self._build_tool_definitions(),
                messages=messages
            )
            
            if verbose:
                print(f"🔄 Iteration {iteration}")
            
            # Check if Claude wants to use tools
            if response.stop_reason == "tool_use":
                # Process tool calls
                tool_results = []
                
                for block in response.content:
                    if block.type == "tool_use":
                        tool_name = block.name
                        tool_input = block.input
                        
                        if verbose:
                            print(f"  🔧 Using tool: {tool_name}")
                            print(f"     Input: {json.dumps(tool_input, indent=2)}")
                        
                        # Execute tool
                        result = self._execute_tool(tool_name, tool_input)
                        
                        if verbose:
                            result_preview = str(result)[:200]
                            print(f"     Result: {result_preview}...")
                        
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps(result, indent=2)
                        })
                
                # Add assistant response and tool results to messages
                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": tool_results})
                
            elif response.stop_reason == "end_turn":
                # Claude is done, extract final answer
                final_answer = ""
                for block in response.content:
                    if hasattr(block, "text"):
                        final_answer += block.text
                
                if verbose:
                    print(f"\n✅ Final answer:\n")
                
                return final_answer
            
            else:
                # Unexpected stop reason
                return f"Unexpected stop reason: {response.stop_reason}"
        
        return "Max iterations reached without complete answer"
    
    def interactive_mode(self):
        """Run in interactive mode"""
        print("🤖 Code Agent - Interactive Mode")
        print("Ask questions about your codebase. Type 'exit' to quit.\n")
        
        while True:
            try:
                question = input("❓ Your question: ").strip()
                
                if not question:
                    continue
                
                if question.lower() in ['exit', 'quit', 'q']:
                    print("👋 Goodbye!")
                    break
                
                answer = self.query(question, verbose=True)
                print(f"\n{answer}\n")
                print("-" * 80 + "\n")
                
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"\n❌ Error: {e}\n")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Query your codebase")
    parser.add_argument('query', nargs='*', help='Your question')
    parser.add_argument('--config', default='config.yml', help='Config file')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--interactive', '-i', action='store_true', help='Interactive mode')
    
    args = parser.parse_args()
    
    engine = QueryEngine(args.config)
    
    if args.interactive or not args.query:
        engine.interactive_mode()
    else:
        question = ' '.join(args.query)
        answer = engine.query(question, verbose=args.verbose)
        print(answer)


if __name__ == "__main__":
    main()
