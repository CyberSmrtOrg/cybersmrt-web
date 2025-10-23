#!/usr/bin/env python3
"""
CLI - Command-line interface for the code agent
"""

import sys
from query_engine import QueryEngine


def main():
    if len(sys.argv) < 2:
        # Interactive mode
        engine = QueryEngine()
        engine.interactive_mode()
    else:
        # Single query mode
        query = ' '.join(sys.argv[1:])
        verbose = '--verbose' in sys.argv or '-v' in sys.argv
        
        # Remove flags from query
        query = query.replace('--verbose', '').replace('-v', '').strip()
        
        engine = QueryEngine()
        answer = engine.query(query, verbose=verbose)
        print(answer)


if __name__ == "__main__":
    main()
