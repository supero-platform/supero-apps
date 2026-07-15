# Services & workflows

Turn capabilities on in `config.py`:

```python
services: list = field(default_factory=lambda: ["ai", "email", "payments", "workflows"])
```

No SDK to wire, no keys in code. Configure credentials in the admin panel.

## Services

| Service | Gives you | Used by |
|---|---|---|
| `ai` | Grounded Q&A over your data, generation, summarization | `concierge`, `backlot`, `amplify` |
| `email` | Transactional email, templates | most |
| `payments` | Checkout, subscriptions, dunning | `atelier`, `ledgerline`, `pulsefit` |
| `workflows` | Multi-step approvals, sagas, scheduling | `sentinel`, `ledgerline`, `haven` |
| `files` | Upload, storage, signed URLs | `fieldops`, `trialcore` |
| `slack` | Notifications, escalation | `concierge`, `fieldops` |

## Workflows

A workflow is declared, not coded. From `sentinel` (insurance claims):

```python
WORKFLOWS = [
    {
        "name": "claim_approval",
        "trigger": {"schema": "claim", "on": "create"},
        "steps": [
            {"type": "condition", "if": "amount > 10000",
             "then": "senior_review", "else": "auto_approve"},
            {"type": "approval", "name": "senior_review", "role": "adjuster_lead"},
            {"type": "service_call", "service": "email", "operation": "send"},
        ],
    },
]
```

State, retries, and audit are the platform's problem. Approvals respect the same roles as
everything else.

Worth reading:

- `apps/insurance/sentinel/setup.py` — approval saga with a value threshold
- `apps/fintech/ledgerline/setup.py` — dunning + multi-step expense approval
- `apps/real-estate/haven/setup.py` — offer → broker approval

## AI grounded in your data

`concierge` answers from your knowledge base rather than free-associating:

```python
services = ["ai", "email", "slack", "workflows"]
public_schemas = ["article"]     # what the AI may read for public answers
```

The AI is scoped by the same access rules as everyone else. It cannot read a field the
asking user isn't allowed to read — so an AI assistant can't become a data-exfiltration
path.
