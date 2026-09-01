# D.A. Assistant

The Telegram manager runs as two Next.js route handlers:

- `POST /api/telegram/webhook` receives Telegram updates.
- `POST /api/telegram/setup` registers the webhook, commands, and command-menu button.

## Required Vercel environment variables

- `TELEGRAM_BOT_TOKEN`: BotFather token for `@DarthAlgoAssistantBot`.
- `TELEGRAM_WEBHOOK_SECRET`: random letters, numbers, `_`, or `-`; Telegram sends it with every update.
- `TELEGRAM_SETUP_SECRET`: separate random value protecting the one-time setup endpoint.
- `TELEGRAM_OWNER_ID`: Telegram numeric user ID allowed to run owner commands.
- `TELEGRAM_CHANNEL_ID`: defaults to the Darth Algo announcement channel.
- `TELEGRAM_COMMUNITY_ID`: reserved for community automation.
- `TELEGRAM_BOT_USERNAME`: defaults to `DarthAlgoAssistantBot`.
- `TELEGRAM_BRIEFING_THRESHOLD`: handled cases before an automatic owner briefing; defaults to `10`.
- `OPENAI_API_KEY`: optional direct OpenAI project key for AI customer support.
- `AI_GATEWAY_API_KEY`: optional static Vercel AI Gateway key. On Vercel, the deployment's rotating `VERCEL_OIDC_TOKEN` is used automatically when neither static key is set.
- `OPENAI_SUPPORT_MODEL`: defaults to `openai/gpt-5.4-mini` on Vercel AI Gateway.

Set secrets for Production, Preview, and Development. Never commit live secret values.

## Activate

After a production deployment, send one authenticated POST request:

```bash
curl -X POST https://www.darthalgo.com/api/telegram/setup \
  -H "Authorization: Bearer $TELEGRAM_SETUP_SECRET"
```

The setup route registers the production webhook, updates BotFather commands, and enables Telegram's command-menu button.

## Owner commands

- `/status` checks that the bot and AI configuration are online.
- `/briefing` sends the current support batch and clears it.
- `/reply USER_ID your message` delivers an owner response through the assistant.
- `/announce your message` publishes to `TELEGRAM_CHANNEL_ID`.

## AI support manager

In a private chat, any normal text question is handled by the AI support manager. In a group, it responds only when someone mentions `@DarthAlgoAssistantBot` or replies directly to one of its messages. It answers verified plan and setup questions, avoids financial advice and unsupported promises, and escalates refunds, payment verification, delayed access, account-specific changes, and uncertain cases.

Unresolved cases are sent to `TELEGRAM_OWNER_ID` immediately. A briefing is sent automatically after `TELEGRAM_BRIEFING_THRESHOLD` handled cases. The current batch is held in server memory; immediate escalations remain in the owner's Telegram chat. A durable cross-deployment case history can be added later with a database.

## Safety

- Telegram webhook requests must match `TELEGRAM_WEBHOOK_SECRET`.
- Setup requires a separate bearer secret.
- Owner commands are restricted to `TELEGRAM_OWNER_ID`.
- Customer-facing replies warn users not to share credentials or payment details.
