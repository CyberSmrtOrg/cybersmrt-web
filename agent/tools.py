#!/usr/bin/env python3
"""
Code Analysis Tools - Find references, trace dependencies, analyze flows
"""

import json
import re
from pathlib import Path
from typing import List, Dict, Any, Set
import chromadb


class CodeAnalysisTools:
    def __init__(self, data_path: Path, vector_db_config: Dict):
        self.data_path = data_path
        
        # Load indexes
        with open(data_path / "file_index.json", 'r') as f:
            self.file_index = json.load(f)
        
        with open(data_path / "dependency_graph.json", 'r') as f:
            self.dependency_graph = json.load(f)
        
        # Connect to vector DB
        self.client = chromadb.PersistentClient(
            path=vector_db_config['persist_directory']
        )
        self.collection = self.client.get_collection(
            name=vector_db_config['collection_name']
        )
    
    def semantic_search(self, query: str, n_results: int = 10) -> List[Dict[str, Any]]:
        """Perform semantic search on the codebase"""
        # Simple text-based search (in production, use real embeddings)
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results
        )
        
        files = {}
        for i, (doc, metadata) in enumerate(zip(
            results['documents'][0], 
            results['metadatas'][0]
        )):
            filepath = metadata['filepath']
            if filepath not in files:
                files[filepath] = {
                    'path': filepath,
                    'chunks': [],
                    'relevance_score': 1.0 / (i + 1)
                }
            files[filepath]['chunks'].append({
                'content': doc,
                'chunk_index': metadata.get('chunk_index', 0)
            })
        
        return list(files.values())
    
    def find_references(self, symbol: str, search_type: str = 'all') -> List[Dict[str, Any]]:
        """Find all references to a function, class, or variable"""
        references = []
        
        # Search patterns
        patterns = {
            'function_call': re.compile(rf'\b{re.escape(symbol)}\s*\('),
            'import': re.compile(rf'import\s+.*{re.escape(symbol)}'),
            'definition': re.compile(rf'(function|const|let|var|class)\s+{re.escape(symbol)}\b'),
            'property': re.compile(rf'\.{re.escape(symbol)}\b')
        }
        
        # Search through all files
        for filepath, data in self.file_index.items():
            matches = []
            
            # Get file content from vector DB
            file_chunks = self.collection.get(
                where={"filepath": filepath}
            )
            
            if not file_chunks['documents']:
                continue
            
            content = '\n'.join(file_chunks['documents'])
            
            for pattern_type, pattern in patterns.items():
                if search_type != 'all' and search_type != pattern_type:
                    continue
                
                for match in pattern.finditer(content):
                    line_num = content[:match.start()].count('\n') + 1
                    line_start = content.rfind('\n', 0, match.start()) + 1
                    line_end = content.find('\n', match.end())
                    if line_end == -1:
                        line_end = len(content)
                    
                    matches.append({
                        'type': pattern_type,
                        'line': line_num,
                        'code': content[line_start:line_end].strip(),
                        'position': match.start()
                    })
            
            if matches:
                references.append({
                    'file': filepath,
                    'matches': matches
                })
        
        return references
    
    def get_dependencies(self, filepath: str, recursive: bool = False, 
                        visited: Set[str] = None) -> Dict[str, Any]:
        """Get dependencies of a file"""
        if visited is None:
            visited = set()
        
        if filepath in visited:
            return {'file': filepath, 'dependencies': [], 'circular': True}
        
        visited.add(filepath)
        
        direct_deps = self.dependency_graph.get(filepath, [])
        
        result = {
            'file': filepath,
            'dependencies': []
        }
        
        for dep in direct_deps:
            # Resolve relative imports
            resolved_dep = self._resolve_import(filepath, dep)
            
            dep_info = {
                'import': dep,
                'resolved': resolved_dep,
                'exists': resolved_dep in self.file_index
            }
            
            if recursive and resolved_dep and dep_info['exists']:
                dep_info['nested'] = self.get_dependencies(
                    resolved_dep, 
                    recursive=True, 
                    visited=visited.copy()
                )
            
            result['dependencies'].append(dep_info)
        
        return result
    
    def get_dependents(self, filepath: str) -> List[str]:
        """Find all files that depend on this file"""
        dependents = []
        
        for file, deps in self.dependency_graph.items():
            for dep in deps:
                resolved = self._resolve_import(file, dep)
                if resolved == filepath:
                    dependents.append(file)
                    break
        
        return dependents
    
    def trace_data_flow(self, start_file: str, symbol: str, 
                       max_depth: int = 5) -> Dict[str, Any]:
        """Trace how data flows from a starting point"""
        flow = {
            'start': start_file,
            'symbol': symbol,
            'flow': []
        }
        
        # Find where symbol is defined
        if start_file in self.file_index:
            structure = self.file_index[start_file].get('structure', {})
            
            # Check if exported
            if symbol in structure.get('exports', []):
                # Find where it's imported
                dependents = self.get_dependents(start_file)
                
                for dep_file in dependents:
                    dep_structure = self.file_index.get(dep_file, {}).get('structure', {})
                    imports = dep_structure.get('imports', [])
                    
                    for imp in imports:
                        if self._resolve_import(dep_file, imp['source']) == start_file:
                            if symbol in imp['specifiers']:
                                flow['flow'].append({
                                    'file': dep_file,
                                    'type': 'import',
                                    'symbol': symbol
                                })
        
        return flow
    
    def _resolve_import(self, from_file: str, import_path: str) -> str:
        """Resolve relative import paths"""
        if not import_path:
            return None
        
        # Handle relative imports
        if import_path.startswith('.'):
            from_dir = Path(from_file).parent
            resolved = (from_dir / import_path).resolve()
            
            # Try common extensions
            for ext in ['.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.jsx']:
                test_path = str(resolved) + ext
                if test_path.replace('\\', '/') in self.file_index:
                    return test_path.replace('\\', '/')
            
            return str(resolved).replace('\\', '/')
        
        # Handle package imports (not in local files)
        return None
    
    def get_file_summary(self, filepath: str) -> Dict[str, Any]:
        """Get a comprehensive summary of a file"""
        if filepath not in self.file_index:
            return {'error': 'File not found'}
        
        file_data = self.file_index[filepath]
        
        return {
            'path': filepath,
            'size': file_data['size'],
            'lines': file_data['lines'],
            'structure': file_data['structure'],
            'dependencies': self.get_dependencies(filepath, recursive=False),
            'dependents': self.get_dependents(filepath)
        }
    
    def find_similar_code(self, code_snippet: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Find similar code patterns in the codebase"""
        return self.semantic_search(code_snippet, n_results)
    
    def get_call_chain(self, function_name: str, max_depth: int = 3) -> Dict[str, Any]:
        """Find the call chain of a function"""
        # Find where function is defined
        definition_files = []
        
        for filepath, data in self.file_index.items():
            structure = data.get('structure', {})
            functions = structure.get('functions', [])
            
            for func in functions:
                if func.get('name') == function_name:
                    definition_files.append(filepath)
        
        # Find references to the function
        references = self.find_references(function_name, search_type='function_call')
        
        return {
            'function': function_name,
            'defined_in': definition_files,
            'called_from': [
                {
                    'file': ref['file'],
                    'locations': [m for m in ref['matches'] if m['type'] == 'function_call']
                }
                for ref in references
            ]
        }


def main():
    """Test the tools"""
    from pathlib import Path
    import yaml
    
    with open('config.yml', 'r') as f:
        config = yaml.safe_load(f)
    
    tools = CodeAnalysisTools(
        Path("agent_data"),
        config['vector_db']
    )
    
    # Test semantic search
    print("Testing semantic search...")
    results = tools.semantic_search("authentication function")
    print(f"Found {len(results)} relevant files")
    
    # Test find references
    print("\nTesting find references...")
    refs = tools.find_references("fetchData")
    print(f"Found references in {len(refs)} files")


if __name__ == "__main__":
    main()
