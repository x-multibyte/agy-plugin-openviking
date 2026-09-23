# OpenViking Memory and Retrieval Rules

1. **Proactive Memory Recall**:
   - Before prompting the user for established system preferences, historical context, or previously resolved environment issues, query OpenViking via `find` or `search` under `viking://~/memories/`.

2. **Progressive Context Loading**:
   - Prefer L0 (Abstract) and L1 (Overview) for architectural scanning and decision-making.
   - Only retrieve L2 (Full content) via `read` for exact source files, specific code snippets, or configuration templates when needed.

3. **Serial Resource Indexing**:
   - When indexing large document collections or multiple directory versions into OpenViking, always execute indexing sequentially (single-task serial mode) to prevent local CPU overload on the embedding engine.

4. **Durable Knowledge Persistence**:
   - Persist key architectural decisions, user preferences, and lessons learned using `remember`. Store conclusions and facts, not conversational transcripts.
