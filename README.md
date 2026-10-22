# Jev Communication Assistant / 沟通助手

**Early preview · Windows desktop · 0.1.0 source**

A local-first desktop helper for reading copied chat text or a user-selected screenshot, checking basic communication intent, and preparing translation or reply drafts. The current app is an early Windows build; the planned language-aware floating workflow and mobile app are not complete.

这是一个 Windows 本地优先的聊天辅助工具早期版本：读取用户复制的聊天文字或手动选择的窗口截图，提供基础意图判断、翻译和回复草稿。自动复制触发、按会话语言生成双语回复、可靠回填和手机版仍在规划中。

## What this version does

- Windows tray app with a floating/compact window and Ctrl + Shift + Space shortcut.
- Read chat text from the clipboard after the user clicks the recognition action.
- Select a window for one-time screenshot recognition, or explicitly enable change-based capture for a selected window.
- Run local keyword intent/risk hints without a model key.
- Call a configurable OpenAI-compatible chat-completions endpoint for translation, reply suggestions, draft editing, and screenshot text recognition.
- Optionally send text to the configured Jev endpoint for intent, risk, and response-strategy judgments.
- Manage local communication modes and SKILL.md prompt guidance.
- Copy a selected result. The public preview does not attempt automatic paste into another window.

## Current boundaries

- Translation currently targets Simplified Chinese. Reply suggestions currently use English short, formal, and negotiation variants. Conversation-language detection and bilingual paired output are planned.
- Clipboard changes do not automatically open a result panel. The user starts each action from the main app.
- Screenshot recognition sends the chosen image to the configured model provider. When change-based capture is enabled, changed screenshots from the selected window are sent for recognition; this mode is off until the user enables it.
- Text used for Jev judgment or model generation is sent to the respective configured service. Imported Skills are prompt text and may also be included in model requests. Import only trusted Skills and API endpoints.
- Results must be copied and pasted by the user into the intended chat. No message is sent automatically.
- The Android/mobile app is not implemented in this repository. No Android source or device-level validation is included.
- Live model/Jev behavior and real-chat accuracy require separate testing with the user's own service configuration. The repository contains no API keys or chat data.

## Run and build on Windows

Requirements: Windows 10/11, Node.js 22, and npm.

1. Run npm ci.
2. Run npm test to check JavaScript syntax.
3. Run npm start to launch the source app.
4. Run npm run dist to create the portable-folder build under release/win-unpacked.

The installed application stores configuration in a local data directory. API keys are stored using Electron safeStorage and the operating-system credential facility. Do not commit the data directory. Portable app data and API-key decryption may not transfer between Windows users or machines.

## Privacy notes

The app does not send clipboard text merely because it exists; the user starts a recognition or model action. Once an action is started, the selected text or screenshot can be sent to the configured endpoint. Use a provider you trust and avoid including unrelated private content in screenshots. This repository does not include local configuration, credentials, logs, release binaries, or QA screenshots.

## Project status

See ROADMAP.md for the planned desktop update and mobile direction. This is a public early preview, not a claim of production readiness. Existing local QA artifacts were intentionally excluded from this repository; only checks run against this clean source tree should be treated as current verification.

## License

MIT. Third-party npm dependencies and Electron retain their own licenses; they are installed from their upstream packages and are not vendored here.
