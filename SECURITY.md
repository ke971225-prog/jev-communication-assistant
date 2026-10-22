# Security Policy

This early preview handles chat content and API keys. Please do not post credentials, private chat transcripts, customer data, or screenshots in public issues.

For a security concern, use GitHub's private vulnerability reporting for this repository when available, or contact the maintainer through the GitHub profile. Include only the minimum sanitized information needed to reproduce the issue.

The app sends text or screenshots to the service configured by the user when the corresponding AI action is invoked. Use trusted endpoints and only provide content that may be processed by that service. API keys are stored through Electron safeStorage; never share the local data directory.

Dependency note (2026-10-22): npm audit reports 0 high/critical and 8 moderate findings in the Electron packaging tool's development dependency tree. The high finding was fixed by updating its compatible transitive dependency; the remaining findings have no non-breaking fix in the current stable builder release. Re-run npm audit before release builds. No prebuilt executable is committed in this repository.
