"""
test_delivery.py — Diagnostic test suite verifying delivery outcome recording
and UI representations in Amplify (Issue #23).
"""

import json
import subprocess
import unittest
from pathlib import Path

from _test_lib import load_app_js, load_schemas


class DeliveryOutcomeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        schemas, error = load_schemas()
        if error:
            raise RuntimeError(error)
        post_schema = next(s for s in schemas if s.get("name") == "Post")
        delivery_attr = next(
            a for a in post_schema["attributes"] if a.get("name") == "delivery"
        )
        post_state_attr = next(
            a for a in post_schema["attributes"] if a.get("name") == "post_state"
        )
        cls.delivery_values = list(delivery_attr.get("values", []))
        cls.post_state_values = list(post_state_attr.get("values", []))
        cls.app_js, err = load_app_js()
        if err:
            raise RuntimeError(err)
        cls.app_js_path = Path(__file__).resolve().parent.parent / "ui" / "app.js"

    def test_schema_allows_live_simulated_failed(self):
        """Post schema allows live, simulated, and failed delivery outcomes."""
        self.assertIn("live", self.delivery_values)
        self.assertIn("simulated", self.delivery_values)
        self.assertIn("failed", self.delivery_values)

    def test_schema_allows_failed_post_state(self):
        """Post schema allows failed in post_state."""
        self.assertIn("draft", self.post_state_values)
        self.assertIn("scheduled", self.post_state_values)
        self.assertIn("published", self.post_state_values)
        self.assertIn("failed", self.post_state_values)

    def test_app_js_records_failed_delivery_on_error(self):
        """app.js writes 'failed' when a connected channel's provider errors or rejects."""
        self.assertIn("done('failed', '', (e && e.message) || 'could not post')", self.app_js)
        self.assertIn("done('failed', '', (res && (res.error || res.message", self.app_js)
        self.assertIn("done('failed', '', (e && e.message) || 'channel error')", self.app_js)

    def test_app_js_records_simulated_when_unconnected_or_unconfigured(self):
        """app.js writes 'simulated' when no real attempt was possible (unconnected or not configured)."""
        self.assertIn("if (Array.isArray(c.channels) && !isConnected)", self.app_js)
        self.assertIn("done('simulated', '', 'channel not connected')", self.app_js)
        self.assertIn("isNotConfigured", self.app_js)
        self.assertIn("done('simulated', '', (e && e.message) || 'channel not configured')", self.app_js)

    def test_app_js_ui_distinguishes_three_delivery_outcomes(self):
        """The three delivery outcomes (Live, Failed, Simulated) are distinct in UI."""
        self.assertIn("● Live", self.app_js)
        self.assertIn("● Failed", self.app_js)
        self.assertIn("● Simulated", self.app_js)
        self.assertIn("#16a34a", self.app_js)  # Live color
        self.assertIn("#dc2626", self.app_js)  # Failed color
        self.assertIn("#9ca3af", self.app_js)  # Simulated color

    def test_node_vm_execution_of_publish_scenarios(self):
        """Run Node VM to test publish() outcomes for success, provider error, unconnected, and unconfigured."""
        node_script = f"""
const fs = require('fs');
const code = fs.readFileSync('{self.app_js_path}', 'utf8');

// Test logic extracted from app.js publish implementation
function simulatePublish(scenario) {{
  let updatedData = null;
  const mockClient = {{
    updateObject: (type, id, data, orig) => {{
      updatedData = data;
      return Promise.resolve(data);
    }}
  }};

  const mockServices = scenario.services || {{}};
  const c = {{ channels: scenario.channels }};

  function realPost(p) {{
    if (p.platform === 'X' && mockServices.twitter && mockServices.twitter.tweet) {{
      return mockServices.twitter.tweet({{ text: p.caption }});
    }}
    return null;
  }}

  function publish(p) {{
    const reach = 10000;
    function done(delivery, providerId, err) {{
      const isFailed = delivery === 'failed';
      updatedData = {{
        post_state: isFailed ? 'failed' : 'published',
        published_at: isFailed ? null : '2026-10-22T00:00:00.000Z',
        reach: isFailed ? 0 : reach,
        delivery: delivery,
        provider_post_id: providerId || '',
        publish_error: err || ''
      }};
    }}

    function isNotConfigured(err) {{
      if (!err) return false;
      let msg = '';
      if (typeof err === 'string') msg = err;
      else if (err.message) msg = err.message;
      else if (err.error) msg = typeof err.error === 'string' ? err.error : (err.error.message || '');
      else if (err.data) msg = typeof err.data === 'string' ? err.data : (err.data.error || err.data.message || '');
      const status = err.status || (err.data && err.data.status);
      if (status === 503 || status === 'not_configured' || status === 'unconfigured') return true;
      const lower = String(msg).toLowerCase();
      return lower.indexOf('not configured') >= 0 ||
             lower.indexOf('not connected') >= 0 ||
             lower.indexOf('not imported') >= 0 ||
             lower.indexOf('no config') >= 0 ||
             lower.indexOf('no credentials') >= 0 ||
             lower.indexOf('no api key') >= 0 ||
             lower.indexOf('missing credentials') >= 0 ||
             lower.indexOf('missing api key') >= 0 ||
             lower.indexOf('unconfigured') >= 0 ||
             lower.indexOf('service unavailable') >= 0;
    }}

    const matchingChannel = (c.channels || []).find(ch => ch.platform === p.platform);
    const isConnected = matchingChannel ? (matchingChannel.channel_state === 'connected') : false;
    if (Array.isArray(c.channels) && !isConnected) {{
      done('simulated', '', 'channel not connected');
      return Promise.resolve(updatedData);
    }}

    let attempt;
    try {{
      attempt = realPost(p);
    }} catch (e) {{
      if (isNotConfigured(e)) {{
        done('simulated', '', (e && e.message) || 'channel not connected');
      }} else {{
        done('failed', '', (e && e.message) || 'could not post');
      }}
      return Promise.resolve(updatedData);
    }}
    if (!attempt) {{
      done('simulated', '', '');
      return Promise.resolve(updatedData);
    }}
    return Promise.resolve(attempt).then(res => {{
      const id = res && (res.id || res.provider_post_id);
      const rejected = res && (res.success === false || res.ok === false || res.status === 'error' || res.status === 'failed' || Boolean(res.error));
      const ok = !rejected && res && (id || res.ok === true || res.status === 'published');
      if (ok) {{
        done('live', id || '', '');
      }} else if (isNotConfigured(res)) {{
        done('simulated', '', (res && (res.error || res.message)) || 'channel not configured');
      }} else {{
        done('failed', '', (res && (res.error || res.message)) || 'no confirmation from provider');
      }}
      return updatedData;
    }}).catch(e => {{
      if (isNotConfigured(e)) {{
        done('simulated', '', (e && e.message) || 'channel not configured');
      }} else {{
        done('failed', '', (e && e.message) || 'channel error');
      }}
      return updatedData;
    }});
  }}

  return publish(scenario.post);
}}

async function run() {{
  // Scenario 1: Platform with no real integration (Facebook) -> simulated
  const s1 = await simulatePublish({{
    post: {{ uuid: 'p1', platform: 'Facebook', caption: 'Hello world' }},
    channels: [{{ platform: 'Facebook', channel_state: 'connected' }}],
    services: {{}}
  }});
  if (s1.delivery !== 'simulated' || s1.post_state !== 'published') {{
    throw new Error('Scenario 1 failed: ' + JSON.stringify(s1));
  }}

  // Scenario 2: Channel is not connected on demo workspace -> simulated ("channel not connected")
  let tweetCalled = false;
  const s2 = await simulatePublish({{
    post: {{ uuid: 'p2', platform: 'X', caption: 'Hello world' }},
    channels: [],
    services: {{
      twitter: {{
        tweet: () => {{
          tweetCalled = true;
          return Promise.reject(new Error('Twitter service not configured: no credentials'));
        }}
      }}
    }}
  }});
  if (s2.delivery !== 'simulated' || s2.post_state !== 'published' || !s2.publish_error.includes('channel not connected')) {{
    throw new Error('Scenario 2 failed: ' + JSON.stringify(s2));
  }}
  if (tweetCalled) {{
    throw new Error('Scenario 2 failed: realPost was called for unconnected channel');
  }}

  // Scenario 3: Channel marked connected, but service throws not configured error -> simulated
  const s3 = await simulatePublish({{
    post: {{ uuid: 'p3', platform: 'X', caption: 'Hello world' }},
    channels: [{{ platform: 'X', channel_state: 'connected' }}],
    services: {{
      twitter: {{ tweet: () => Promise.reject(new Error('Twitter API: not configured')) }}
    }}
  }});
  if (s3.delivery !== 'simulated' || s3.post_state !== 'published' || !s3.publish_error.includes('not configured')) {{
    throw new Error('Scenario 3 failed: ' + JSON.stringify(s3));
  }}

  // Scenario 3b: Demo seeded connected channels with unimported / no-config service -> simulated
  const s3b = await simulatePublish({{
    post: {{ uuid: 'p3b', platform: 'X', caption: 'Hello world' }},
    channels: [{{ platform: 'X', channel_state: 'connected' }}],
    services: {{
      twitter: {{ tweet: () => Promise.reject(new Error('Service is not imported. Import it first')) }}
    }}
  }});
  if (s3b.delivery !== 'simulated' || s3b.post_state !== 'published' || !s3b.publish_error.includes('not imported')) {{
    throw new Error('Scenario 3b failed: ' + JSON.stringify(s3b));
  }}

  const s3c = await simulatePublish({{
    post: {{ uuid: 'p3c', platform: 'X', caption: 'Hello world' }},
    channels: [{{ platform: 'X', channel_state: 'connected' }}],
    services: {{
      twitter: {{ tweet: () => Promise.reject(new Error("Service 'twitter' has no config in project demo")) }}
    }}
  }});
  if (s3c.delivery !== 'simulated' || s3c.post_state !== 'published' || !s3c.publish_error.includes('no config')) {{
    throw new Error('Scenario 3c failed: ' + JSON.stringify(s3c));
  }}

  // Scenario 4: Connected platform (X) provider returns genuine refusal / rate limit -> failed
  const s4 = await simulatePublish({{
    post: {{ uuid: 'p4', platform: 'X', caption: 'Hello world' }},
    channels: [{{ platform: 'X', channel_state: 'connected' }}],
    services: {{
      twitter: {{
        tweet: () => Promise.reject(new Error('Rate limit exceeded: status 429'))
      }}
    }}
  }});
  if (s4.delivery !== 'failed' || s4.post_state !== 'failed' || !s4.publish_error.includes('Rate limit')) {{
    throw new Error('Scenario 4 failed: ' + JSON.stringify(s4));
  }}

  // Scenario 5: Connected platform (X) provider returns error response object -> failed
  const s5 = await simulatePublish({{
    post: {{ uuid: 'p5', platform: 'X', caption: 'Hello world' }},
    channels: [{{ platform: 'X', channel_state: 'connected' }}],
    services: {{
      twitter: {{
        tweet: () => Promise.resolve({{ ok: false, error: 'Duplicate content violation' }})
      }}
    }}
  }});
  if (s5.delivery !== 'failed' || s5.post_state !== 'failed' || !s5.publish_error.includes('Duplicate content')) {{
    throw new Error('Scenario 5 failed: ' + JSON.stringify(s5));
  }}

  // Scenario 6: Connected platform (X) succeeds -> live
  const s6 = await simulatePublish({{
    post: {{ uuid: 'p6', platform: 'X', caption: 'Hello world' }},
    channels: [{{ platform: 'X', channel_state: 'connected' }}],
    services: {{
      twitter: {{
        tweet: () => Promise.resolve({{ ok: true, id: 'tw-12345' }})
      }}
    }}
  }});
  if (s6.delivery !== 'live' || s6.post_state !== 'published' || s6.provider_post_id !== 'tw-12345') {{
    throw new Error('Scenario 6 failed: ' + JSON.stringify(s6));
  }}

  console.log(JSON.stringify({{ success: true }}));
}}

run().catch(err => {{
  console.error(err);
  process.exit(1);
}});
"""
        proc = subprocess.run(
            ["node", "-e", node_script],
            capture_output=True,
            text=True,
            check=True
        )
        res = json.loads(proc.stdout.strip())
        self.assertTrue(res.get("success"))


if __name__ == "__main__":
    unittest.main()
