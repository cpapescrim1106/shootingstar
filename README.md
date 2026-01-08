# ShootingStar

Gmail to Todoist automation powered by Claude CLI.

Star emails in Gmail, and they automatically become tasks in Todoist with intelligent labeling.

## Features

- **Automatic Processing**: Polls Gmail every 2 minutes for starred emails
- **Claude-Powered**: Uses Claude CLI (subscription auth) to intelligently extract tasks from emails
- **GTD Labels**: 31 pre-approved labels organized by Duration, Context, Theme, Horizon, and Performance
- **Human-in-the-Loop**: Falls back to manual review when Claude isn't available
- **Web Dashboard**: Monitor status, view processed emails, and manage pending reviews
- **Coolify Ready**: Docker deployment with PM2 process management

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, SQLite (better-sqlite3)
- **AI**: Claude Code CLI (subscription auth, NOT API)
- **APIs**: Gmail API (OAuth2), Todoist REST API v2
- **Process Manager**: PM2

## Prerequisites

1. **Claude CLI**: Install and authenticate
   ```bash
   npm install -g @anthropic-ai/claude-code
   claude /login
   ```

2. **Google OAuth Credentials**: [Create at Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Enable Gmail API
   - Create OAuth 2.0 Client ID
   - Add redirect URI: `https://shootingstar.scrimvibes.xyz/api/auth/gmail/callback`

3. **Todoist API Token**: [Get from Todoist Developer Settings](https://todoist.com/app/settings/integrations/developer)

## Environment Variables

Create `.env` from `.env.example`:

```bash
# Required
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://shootingstar.scrimvibes.xyz/api/auth/gmail/callback
TODOIST_TOKEN=your_todoist_token

# DO NOT SET - app uses Claude CLI, not API
# ANTHROPIC_API_KEY=
```

## Development

```bash
# Install dependencies
npm install

# Start Next.js dev server
npm run dev

# Start worker in separate terminal
npm run dev:worker
```

## Production Deployment

### Docker (Coolify)

The app includes a multi-stage Dockerfile that runs both Next.js and the worker via PM2.

**Required Volumes**:
- `/app/data` - SQLite database persistence
- `~/.claude:/root/.claude:ro` - Claude CLI credentials (mount from host)

**Build & Run**:
```bash
docker build -t shootingstar .
docker run -p 3000:3000 \
  -v shootingstar-data:/app/data \
  -v ~/.claude:/root/.claude:ro \
  -e GOOGLE_CLIENT_ID=... \
  -e GOOGLE_CLIENT_SECRET=... \
  -e TODOIST_TOKEN=... \
  shootingstar
```

## How It Works

1. **Star** an email in Gmail that you want to become a task
2. **Wait** for automatic processing (every 2 minutes) or click "Run Once"
3. **Claude** analyzes the email and extracts:
   - Task title (Action verb + What + Detail)
   - Labels (Duration, Context, Theme)
   - Notes (sender context)
   - Due date (if mentioned)
4. **Todoist** task is created with appropriate labels
5. **Email** is unstarred and labeled "Processed"

### Human-in-the-Loop Fallback

If Claude CLI isn't authenticated:
- Emails go to "Pending Reviews"
- Use the dashboard to manually create tasks
- Select labels from the approved list
- Task is created and email marked processed

## Label Categories

| Category | Count | Examples |
|----------|-------|----------|
| Duration | 4 | 5 min, 15 min, 30 min, 1 hr |
| Context | 17 | Computer, Calls, Errands, Home, Amazon |
| Theme | 5 | Challenge, Care, Wealth, Joy, Lead |
| Horizon | 3 | Vision, Goals, Milestones |
| Performance | 2 | Above Average, World Class |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Automation status and service health |
| `/api/control` | POST | Start/Stop/Run Once automation |
| `/api/emails` | GET | List processed emails |
| `/api/errors` | GET | Error log |
| `/api/pending` | GET/POST | Pending reviews (human-in-the-loop) |
| `/api/auth/gmail` | GET | Initiate Gmail OAuth |
| `/api/auth/gmail/callback` | GET | OAuth callback handler |

## License

MIT
