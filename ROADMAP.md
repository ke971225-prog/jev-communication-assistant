# Roadmap

This roadmap records the intended direction. Items below are planned unless the repository later documents a passing test for them.

## Desktop update

1. Add a compact, nearby result view so routine chat assistance does not require the management window.
2. Support deliberate text/image clipboard triggers and user-selected screenshot regions, with clear per-action status.
3. Route translation and replies by the conversation language and show paired translations where useful.
4. Add safe target-window handling. Any future write-back must verify the intended window and input focus; until that is implemented, the app only copies results.
5. Add voice capture and translation only after the recording, transcription, privacy, and cancellation paths are defined and tested.

## Mobile

An Android companion app is a future project. This repository does not contain its source code, and no mobile implementation or device workflow is represented as complete.

## Release gates

- Automated tests cover prompt construction, response parsing, local configuration, and failure states.
- Windows build is reproducible from a clean checkout.
- Provider/Jev requests are tested with synthetic text and never use real customer chats in CI.
- Screenshot capture and any future target-window write-back are tested explicitly, with sensitive-screen and wrong-window cases.
- Documentation states what content leaves the device and which service receives it.
