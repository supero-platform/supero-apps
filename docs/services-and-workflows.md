# Services & workflows

Turn capabilities on in `config.py`:

```python
services: list = field(default_factory=lambda: ["ai", "email", "stripe_checkout", "workflows"])
```

No SDK to wire, no keys in code. Configure credentials in the admin panel.

## Services

These are the service ids the 19 apps in this repo actually enable, counted from their
`config.py` files. There is no `payments` or `files` service — payments are `stripe_checkout`,
and file/image upload is built into the SDK rather than switched on here.

| Service | Gives you | Apps using it |
|---|---|---|
| `email` | Transactional email, templates | all 19 |
| `workflows` | Multi-step sagas with compensation, event bindings | all 19 |
| `ai` | Grounded Q&A over your data, generation, summarization | 13 |
| `sms` | Text messages | 11 |
| `slack` | Channel notifications, escalation | 7 |
| `stripe_checkout` | Hosted checkout, payment links, session lookup | 6 — `atelier`, `fieldops`, `ledgerline`, `pulsefit`, `relay`, `tavola` |
| `google_calendar` | Calendar events | 3 — `fieldops`, `lumen`, `relay` |
| `quickbooks` | Invoices, customers | 1 — `fieldops` |
| `instagram`, `linkedin`, `x_social`, `youtube` | Social publishing | 1 — `amplify` |
| `push_notification` | Device push | 1 — `relay` |

`fieldops` and `relay` additionally use the transactional service family — `approval`,
`payment`, `booking`, `recurring_plan`, `document_signature`, `inventory`, `attachment`,
`service`, `appointment` — which move a record through a state machine server-side instead
of letting the client PUT the next state.

## Workflows

A workflow is declared, not coded. This is `claim_decision`, copied from
[`apps/insurance/sentinel/setup.py`](../apps/insurance/sentinel/setup.py) — a saga that
updates a record and then notifies, and reverts the update if a later step fails:

```python
WORKFLOW_DEFINITIONS = [
    {
        "workflow_id": "claim_decision", "display_name": "Claim Decision",
        "version": "1.0.0", "enabled": True, "status": "Active",
        "on_error": "compensate",
        "input_schema": {"claim_uuid": {"type": "string", "required": True},
                         "amount_approved": {"type": "number", "required": False}},
        "steps": [
            {"id": "approve", "type": "crud_operation", "operation": "update",
             "object_type": "sentinel:claim", "record_uuid": "{{input.claim_uuid}}",
             "data": {"claim_state": "approved",
                      "amount_approved": "{{input.amount_approved}}"},
             # if a later step fails, the platform runs this to undo the update
             "compensate": {"kind": "automatic", "type": "crud_operation",
                            "operation": "update", "object_type": "sentinel:claim",
                            "record_uuid": "{{input.claim_uuid}}",
                            "data": {"claim_state": "under_review"}}},
            {"id": "notify", "type": "service_call", "service": "email",
             "operation": "send_email", "on_error": "continue",
             "input_map": {"to_email": "{{input.holder_email}}",
                           "subject": "Claim {{input.claim_number}} approved"}},
        ],
    },
]
```

Step types are `crud_operation` (read/write a record) and `service_call` (invoke one of the
services above). `on_error` is `continue` or `compensate` per workflow and per step. State,
retries and step logging are the platform's problem.

Bind a workflow to a data event with `EVENT_BINDINGS` — `@create:`, `@update:`, `@delete:`
on a schema, or `@signup`:

```python
EVENT_BINDINGS = [
    {"event": "@create:sentinel:claim", "workflow_id": "claim_intake",
     # take the recipient from the verified token, never from a field the visitor typed
     "input_map": {"holder_email": "user.email", "claim_number": "claim_number"}},
]
```

Two things worth knowing before you rely on this:

- **An `@update:` binding fires on *every* update of that schema.** The event key carries no
  value, so a workflow cannot be bound to "when this field becomes X" — guard inside the
  workflow, or trigger it explicitly from your app.
- **Read the result.** A run can answer `success: true` while its own `output.status` is
  `partial`, `compensated` or `compensation_failed`. A compensated saga has undone its work,
  so treating any 200 as success reports the opposite of what happened. Every app in this
  repo routes workflow calls through a `runSaga()` helper that checks this — see
  [`apps/insurance/sentinel/ui/app.js`](../apps/insurance/sentinel/ui/app.js).

Worth reading:

- `apps/insurance/sentinel/setup.py` — claim intake, decision and payout sagas
- `apps/fintech/ledgerline/setup.py` — dunning + expense approval, both compensating
- `apps/real-estate/haven/setup.py` — offer received → broker acceptance

## AI grounded in your data

`concierge` answers from your knowledge base rather than free-associating:

```python
services = ["ai", "email", "slack", "workflows"]
public_schemas = ["article"]     # what the AI may read for public answers
```

The AI runs as the asking user. It carries that user's own credential to the same API
everyone else uses — there is no service account behind it and no elevated path, so it does
not get to see more than the person asking. Its reads go through the same access-policy code
as a direct API call.

That is a statement about the *mechanism*, and it is the honest form of the claim: the AI is
not a privilege escalation. It is not a promise that every field on every object type is
covered in every configuration — access rules are yours to declare, and a rule you did not
write is a rule the AI is not bound by either. If you are relying on a specific field staying
out of an AI answer, assert it in a test against your own deployment rather than taking this
paragraph's word for it.
