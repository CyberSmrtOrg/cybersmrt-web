# Code Agent - Usage Examples

## Example Queries

### Understanding Code Flows

**Query:** "Explain the authentication flow from login form to API"

The agent will:
1. Search for login-related files
2. Find the form submission handler
3. Trace the function calls to the API layer
4. Show the complete flow with file paths and code snippets

---

**Query:** "How does data flow from HomePage.jsx to the backend API?"

Response includes:
- Component hierarchy
- State management
- API call functions
- Data transformations

---

### Finding References

**Query:** "Find all places where `fetchUserData` is called"

Shows:
- Every file that calls this function
- Line numbers and context
- Whether it's called directly or through a wrapper

---

**Query:** "What components use the `useAuth` hook?"

Lists:
- All component files importing useAuth
- How they're using it
- Related dependencies

---

### Dependency Analysis

**Query:** "What files does `auth.js` depend on?"

Returns:
- Direct imports
- Nested dependencies (if requested)
- External packages vs local modules

---

**Query:** "Show me everything that depends on `utils/api.js`"

Shows the reverse dependency tree - all files that would be affected if you change this file.

---

### Impact Analysis for Changes

**Query:** "I want to change the User schema. What files would need updates?"

The agent will:
1. Find where User is defined
2. Find all imports and usages
3. Identify components that render user data
4. List API endpoints that return users
5. Flag test files that might need updates

---

**Query:** "If I rename `validateEmail` to `isValidEmail`, what needs to change?"

Response includes:
- Definition location
- All call sites with file paths and line numbers
- Suggestions for safe refactoring

---

### Code Understanding

**Query:** "What does the payment processing flow look like?"

The agent searches semantically for payment-related code and explains:
- Entry points
- Validation steps
- API interactions
- Error handling
- Success/failure paths

---

**Query:** "Explain how the shopping cart works"

Gets:
- State management approach
- Add/remove item logic
- Persistence strategy
- Related components

---

### Architecture Questions

**Query:** "What's the structure of the API layer?"

Shows:
- API client files
- Endpoint definitions
- Authentication handling
- Error handling patterns

---

**Query:** "How is routing organized?"

Explains:
- Router setup
- Route definitions
- Protected routes
- Navigation flow

---

## Advanced Usage

### Combining Multiple Queries

You can ask complex questions that require multiple tool calls:

**Query:** "Compare how authentication is handled in the admin panel vs the user portal"

The agent will:
1. Search for admin auth code
2. Search for user portal auth
3. Compare the approaches
4. Highlight differences

---

### Code Quality Analysis

**Query:** "Find all components that directly call API endpoints instead of using the API service layer"

Helps identify architectural issues.

---

**Query:** "What functions are longer than 100 lines?"

(Note: Requires extending the tools with complexity analysis)

---

## Interactive Mode Examples

```bash
$ python agent/cli.py

🤖 Code Agent - Interactive Mode
Ask questions about your codebase. Type 'exit' to quit.

❓ Your question: What does the login function do?

[Agent searches codebase and explains the login function]

❓ Your question: Where is it called from?

[Agent finds all call sites]

❓ Your question: What would break if I add a new parameter?

[Agent analyzes impact]

❓ Your question: exit
👋 Goodbye!
```

---

## Tips for Better Results

### Be Specific
❌ "How does the code work?"
✅ "How does the user registration flow work from form submission to database?"

### Use Actual Names
❌ "How does that thing work?"
✅ "How does the fetchProducts function work?"

### Break Down Complex Questions
Instead of: "Explain everything about the authentication system"

Ask in sequence:
1. "Where is authentication implemented?"
2. "How does the login flow work?"
3. "How are protected routes handled?"
4. "Where are auth tokens stored?"

### Reference Specific Files
"In HomePage.jsx, what happens when the user clicks the submit button?"

### Ask About Impacts
"What would need to change if I add a new field to the User model?"

---

## Common Use Cases

### 1. Onboarding New Developers
**Questions to ask:**
- "What's the overall architecture?"
- "How is the project structured?"
- "Where should I add a new feature for X?"

### 2. Refactoring
**Questions to ask:**
- "Find all usages of [deprecated function]"
- "What depends on this module?"
- "Show me duplicated code patterns"

### 3. Debugging
**Questions to ask:**
- "Trace the execution path when user clicks login"
- "What error handling exists in the API layer?"
- "Where could this variable be undefined?"

### 4. Documentation
**Questions to ask:**
- "Explain the purpose of [module]"
- "What are the main entry points?"
- "How do these components interact?"

### 5. Code Review Prep
**Questions to ask:**
- "What files are affected by my changes to X?"
- "Are there similar patterns I should follow?"
- "What tests might need updates?"

---

## Performance Notes

- **First query**: May take 10-30 seconds as tools load
- **Subsequent queries**: Usually 5-15 seconds
- **Complex queries**: May require multiple tool calls (20-30 seconds)

---

## Limitations

- **Context window**: Very large files might be truncated
- **Semantic search**: Works best with descriptive code and comments
- **External dependencies**: Doesn't analyze node_modules
- **Dynamic code**: Limited understanding of runtime behavior

---

## Getting Help

If results aren't accurate:
1. Reindex your codebase: `python agent/indexer.py --force`
2. Be more specific in your query
3. Ask follow-up questions to clarify
4. Check that relevant files aren't in ignore patterns
