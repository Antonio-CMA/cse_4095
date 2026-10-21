# AI conversation evidence

The AI conversations behind the Math Practice app, in the order they happened.

| # | Conversation | Tool | File | What it shows |
|---|---|---|---|---|
| 1 | Specification and 22-phase, 89-task plan | ChatGPT | [`../Project Docs/ChatGPT-Full-Transcript.md`](../Project%20Docs/ChatGPT-Full-Transcript.md) | The clarifying questions, the full software specification, and the task list that the build followed. Transcribed from the shared chat (source link at the top of the file). |
| 2 | A Cursor session about the project | Cursor | [`../Project Docs/cursor_math_practice_full_transcript.pdf`](../Project%20Docs/cursor_math_practice_full_transcript.pdf) | The full transcript of that session (PDF, 246 pages). |
| 3 | Implementation, testing and release preparation | Claude Code | [`Claude-Code-Session-Transcript.md`](Claude-Code-Session-Transcript.md) | Every message typed by the student and every reply by Claude, phase by phase from repository setup to release, with a count of the tool actions between them. |

## About the Claude Code export

The Claude Code session is stored by the tool as a very large log file (about 26 MB,
mostly the raw output of commands and file reads). `Claude-Code-Session-Transcript.md`
is a readable export made from that log by a short script:

- **kept:** every message the student typed, and every reply Claude wrote in the chat,
  in order, with timestamps;
- **summarised:** the work between replies, as a line such as
  *Used tools: Edit ×3, PowerShell ×2*;
- **left out:** raw tool output, Claude's hidden reasoning, and reminders the app
  inserts automatically;
- **redacted:** email addresses, access tokens and the local Windows user name.

The session was continued twice after it grew too long; the automatic summaries that
carried the work forward are included in collapsed sections of the export. The export
was made just before the final commit, so it ends at the deployment and verification of
the live site; the closing summary message is not part of it.

The development report, [`../Development-Report.md`](../Development-Report.md), explains
how these conversations were used and how the AI's work was checked.
