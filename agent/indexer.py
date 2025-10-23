#!/usr/bin/env python3
"""
Code Indexer - Parses JavaScript/HTML codebase and creates searchable embeddings
"""

import os
import json
import yaml
import hashlib
from pathlib import Path
from typing import List, Dict, Any
import esprima
from bs4 import BeautifulSoup
import chromadb
from chromadb.config import Settings
from anthropic import Anthropic
import tiktoken
from tqdm import tqdm


class CodeIndexer:
    def __init__(self, config_path: str = "config.yml"):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)

        self.repo_path = Path(self.config['repo_path']).resolve()
        self.data_path = Path("agent_data")
        self.data_path.mkdir(exist_ok=True)

        # Initialize vector DB
        self.client = chromadb.PersistentClient(
            path=self.config['vector_db']['persist_directory']
        )

        # Initialize Anthropic client
        self.anthropic = Anthropic(api_key=self.config['anthropic_api_key'])

        self.encoding = tiktoken.get_encoding("cl100k_base")

    def should_ignore(self, path: Path) -> bool:
        """Check if path matches ignore patterns"""
        path_str = str(path)
        for pattern in self.config['ignore_patterns']:
            if pattern in path_str:
                return True
        return False

    def find_code_files(self) -> List[Path]:
        """Find all code files in the repository"""
        files = []
        extensions = tuple(self.config['file_extensions'])

        for root, dirs, filenames in os.walk(self.repo_path):
            # Remove ignored directories
            dirs[:] = [d for d in dirs if not self.should_ignore(Path(root) / d)]

            for filename in filenames:
                filepath = Path(root) / filename
                if filepath.suffix in extensions and not self.should_ignore(filepath):
                    files.append(filepath)

        return files

    def parse_javascript(self, content: str, filepath: Path) -> Dict[str, Any]:
        """Parse JavaScript file and extract structure"""
        try:
            ast = esprima.parseModule(content, {'jsx': True, 'tolerant': True})

            imports = []
            exports = []
            functions = []
            classes = []

            def walk_ast(node, parent_type=None):
                if isinstance(node, dict):
                    node_type = node.get('type')

                    if node_type == 'ImportDeclaration':
                        imports.append({
                            'source': node.get('source', {}).get('value'),
                            'specifiers': [s.get('local', {}).get('name')
                                         for s in node.get('specifiers', [])]
                        })

                    elif node_type == 'ExportNamedDeclaration':
                        if node.get('declaration'):
                            decl = node['declaration']
                            if decl.get('type') == 'FunctionDeclaration':
                                exports.append(decl.get('id', {}).get('name'))

                    elif node_type == 'FunctionDeclaration':
                        functions.append({
                            'name': node.get('id', {}).get('name'),
                            'params': [p.get('name') for p in node.get('params', [])]
                        })

                    elif node_type == 'ClassDeclaration':
                        classes.append(node.get('id', {}).get('name'))

                    # Recurse
                    for key, value in node.items():
                        if isinstance(value, (dict, list)):
                            walk_ast(value, node_type)

                elif isinstance(node, list):
                    for item in node:
                        walk_ast(item, parent_type)

            walk_ast(ast)

            return {
                'imports': imports,
                'exports': exports,
                'functions': functions,
                'classes': classes
            }

        except Exception as e:
            # If parsing fails, return empty structure
            return {
                'imports': [],
                'exports': [],
                'functions': [],
                'classes': [],
                'parse_error': str(e)
            }

    def parse_html(self, content: str, filepath: Path) -> Dict[str, Any]:
        """Parse HTML file and extract script tags and structure"""
        soup = BeautifulSoup(content, 'lxml')

        scripts = []
        for script in soup.find_all('script'):
            if script.get('src'):
                scripts.append({'type': 'external', 'src': script['src']})
            elif script.string:
                scripts.append({'type': 'inline', 'content': script.string[:200]})

        return {
            'title': soup.title.string if soup.title else None,
            'scripts': scripts,
            'forms': len(soup.find_all('form')),
            'links': [a.get('href') for a in soup.find_all('a', href=True)][:10]
        }

    def chunk_content(self, content: str, metadata: Dict) -> List[Dict[str, Any]]:
        """Split content into chunks for embedding"""
        chunk_size = self.config['embedding']['chunk_size']
        chunk_overlap = self.config['embedding']['chunk_overlap']

        tokens = self.encoding.encode(content)
        chunks = []

        for i in range(0, len(tokens), chunk_size - chunk_overlap):
            chunk_tokens = tokens[i:i + chunk_size]
            chunk_text = self.encoding.decode(chunk_tokens)

            chunks.append({
                'content': chunk_text,
                'metadata': {
                    **metadata,
                    'chunk_index': len(chunks),
                    'chunk_start': i
                }
            })

        return chunks

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings using Claude's text representation"""
        # Note: Claude API doesn't provide embeddings directly
        # For a production system, you'd use a dedicated embedding model
        # Here we'll use a simple hash-based approach for demo purposes
        # In production, use OpenAI embeddings or a local model like sentence-transformers

        embeddings = []
        for text in texts:
            # Simple hash-based embedding (replace with real embeddings)
            hash_val = hashlib.sha256(text.encode()).digest()
            embedding = [float(b) / 255.0 for b in hash_val[:384]]  # 384-dim vector
            embeddings.append(embedding)

        return embeddings

    def index_repository(self):
        """Main indexing function"""
        print("🔍 Finding code files...")
        files = self.find_code_files()
        print(f"Found {len(files)} files to index")

        # Create or get collection
        try:
            self.client.delete_collection(self.config['vector_db']['collection_name'])
        except:
            pass

        collection = self.client.create_collection(
            name=self.config['vector_db']['collection_name'],
            metadata={"description": "Code embeddings"}
        )

        file_index = {}
        dependency_graph = {}

        print("\n📊 Parsing and indexing files...")
        for filepath in tqdm(files):
            try:
                rel_path = filepath.relative_to(self.repo_path)

                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()

                # Parse based on file type
                if filepath.suffix in ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']:
                    structure = self.parse_javascript(content, filepath)
                elif filepath.suffix == '.html':
                    structure = self.parse_html(content, filepath)
                else:
                    structure = {}

                # Store file metadata
                file_index[str(rel_path)] = {
                    'path': str(rel_path),
                    'size': len(content),
                    'lines': content.count('\n') + 1,
                    'structure': structure
                }

                # Build dependency graph
                if 'imports' in structure:
                    dependency_graph[str(rel_path)] = [
                        imp['source'] for imp in structure['imports']
                        if imp['source']
                    ]

                # Create chunks and add to vector DB
                metadata = {
                    'filepath': str(rel_path),
                    'type': filepath.suffix
                }

                chunks = self.chunk_content(content, metadata)

                if chunks:
                    chunk_ids = [f"{rel_path}_{i}" for i in range(len(chunks))]
                    chunk_texts = [c['content'] for c in chunks]
                    chunk_metadata = [c['metadata'] for c in chunks]

                    # Get embeddings (simplified version)
                    embeddings = self.get_embeddings(chunk_texts)

                    collection.add(
                        ids=chunk_ids,
                        embeddings=embeddings,
                        documents=chunk_texts,
                        metadatas=chunk_metadata
                    )

            except Exception as e:
                print(f"\n⚠️  Error processing {filepath}: {e}")
                continue

        # Save file index and dependency graph
        with open(self.data_path / "file_index.json", 'w') as f:
            json.dump(file_index, f, indent=2)

        with open(self.data_path / "dependency_graph.json", 'w') as f:
            json.dump(dependency_graph, f, indent=2)

        print(f"\n✅ Indexing complete!")
        print(f"   - Indexed {len(files)} files")
        print(f"   - Created {collection.count()} chunks")
        print(f"   - Saved to {self.data_path}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Index your codebase")
    parser.add_argument('--config', default='config.yml', help='Config file path')
    parser.add_argument('--force', action='store_true', help='Force reindex')

    args = parser.parse_args()

    indexer = CodeIndexer(args.config)
    indexer.index_repository()


if __name__ == "__main__":
    main()
