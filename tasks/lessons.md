# Lessons

- Test harnesses that replay migrations must honour `user_version` like `migrate()` does, or upgrade tests from a mid version re-run old statements.
- An `AbortSignal` that is already aborted never fires `abort`; check `.aborted` before adding the listener.
