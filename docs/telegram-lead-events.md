# Telegram Lead Events Contract

This contract lets the Telegram bot backend feed the Users page with real lead and flow progress data.

## Storage

Apply `supabase/migrations/20260429000100_create_telegram_leads.sql` in Supabase before enabling the page with real data.

The browser dashboard only reads rows where `owner_id = auth.uid()`. The bot backend should write with the Supabase service role key, kept only on the server.

## Lead statuses

- `novo`: started or active lead.
- `pendente`: waiting for payment, action, or operator follow-up.
- `pago`: converted lead.
- `bloqueado`: blocked, opted out, or cannot be contacted.

## Backend write flow

When Telegram receives `/start`:

1. Upsert `telegram_leads` by `(owner_id, bot_id, telegram_user_id)`.
2. Increment `start_count`.
3. Set `first_seen_at` on first insert and `last_seen_at` on every start.
4. Store Telegram identity fields when available.
5. Insert a `lead_flow_events` row with `event_type = 'start'`.

When the bot executes a flow node:

1. Insert a `lead_flow_events` row with `event_type = 'node_enter'`.
2. Set `node_id`, `node_label`, `node_type`, `flow_id`, and `occurred_at`.
3. Update `telegram_leads.last_node_id`, `last_node_label`, `last_node_type`, `last_seen_at`, and `flow_id`.

When payment succeeds:

1. Update `telegram_leads.status = 'pago'`.
2. Optionally set `sales_code` and `plan_name`.
3. Insert `lead_flow_events.event_type = 'payment'`.

When the user blocks the bot or opts out:

1. Update `telegram_leads.status = 'bloqueado'`.
2. Insert `lead_flow_events.event_type = 'blocked'`.

When node execution fails:

1. Insert `lead_flow_events.event_type = 'node_error'`.
2. Set `status = 'error'`.
3. Put error code/message in `metadata`.

## Recommended metadata

Use `metadata` for extra context without changing the schema:

```json
{
  "flow_total_nodes": 12,
  "campaign": "abril-vip",
  "source": "telegram",
  "error_code": "TELEGRAM_SEND_FAILED"
}
```

The Users drawer uses `flow_total_nodes` to show progress percentage. If it is missing, the UI still shows the number of visited nodes and the last node reached.
