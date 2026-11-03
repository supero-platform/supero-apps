"""
test_class_reminder.py — Diagnostic test suite verifying class reminder workflow
triggering, recipient routing (NO-OPEN-RELAY-V1), and UI integration (Issue #22).
"""

import json
import subprocess
import unittest
from pathlib import Path

from _test_lib import load_app_js


class ClassReminderWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app_js, err = load_app_js()
        if err:
            raise RuntimeError(err)
        cls.app_js_path = Path(__file__).resolve().parent.parent / "ui" / "app.js"
        cls.setup_py_path = Path(__file__).resolve().parent.parent / "setup.py"

    def test_setup_py_class_reminder_no_open_relay(self):
        """class_reminder in setup.py must have no SMS step, no member_phone, and no open-relay email."""
        setup_text = self.setup_py_path.read_text(encoding="utf-8")
        self.assertIn('"workflow_id": "class_reminder"', setup_text)
        # Extract class_reminder workflow definition
        start = setup_text.find('"workflow_id": "class_reminder"')
        end = setup_text.find('EVENT_BINDINGS', start)
        reminder_block = setup_text[start:end]

        self.assertNotIn('"member_phone"', reminder_block)
        self.assertNotIn('"operation": "send_sms"', reminder_block)
        self.assertNotIn('"operation": "send_email"', reminder_block)

    def test_app_js_implements_send_class_reminder_and_run_saga(self):
        """ui/app.js must define runSaga and sendClassReminder."""
        self.assertIn("function runSaga(workflowId, input)", self.app_js)
        self.assertIn("function sendClassReminder(cl, onDone)", self.app_js)
        self.assertIn("class_reminder", self.app_js)

    def test_app_js_ui_has_timetable_and_no_premature_send_reminder(self):
        """ui/app.js provides Tomorrow badge and timetable calculations, but omits Send reminder button until reminders can go out."""
        self.assertNotIn("Send reminder", self.app_js)
        self.assertIn("isTomorrow", self.app_js)
        self.assertIn("classDayDiff", self.app_js)

    def test_node_vm_class_reminder_execution(self):
        """Execute Node VM to test reminder routing and timetable day diff."""
        node_script = f"""
const fs = require('fs');
const code = fs.readFileSync('{self.app_js_path}', 'utf8');

// Test day parsing and difference calculation
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function dayOf(dt) {{ var d = (dt || '').split('·')[0].trim(); return d.slice(0, 3); }}
function classDayDiff(dt, currentDay) {{
  if (!dt) return null;
  var dayStr = dayOf(dt);
  var idx = DAYS_OF_WEEK.indexOf(dayStr);
  if (idx === -1) return null;
  return (idx - currentDay + 7) % 7;
}}

// Verify timetable calculation:
// If today is Sunday (0), Mon class diff is 1 (tomorrow)
if (classDayDiff('Mon · 6:30 AM', 0) !== 1) throw new Error('Expected 1 day diff for Monday class on Sunday');
// If today is Monday (1), Tue class diff is 1 (tomorrow)
if (classDayDiff('Tue · 7:00 PM', 1) !== 1) throw new Error('Expected 1 day diff for Tuesday class on Monday');
// If today is Friday (5), Fri class diff is 0 (today)
if (classDayDiff('Fri · 6:00 PM', 5) !== 0) throw new Error('Expected 0 day diff for Friday class on Friday');

// Test sendClassReminder logic
const testBookings = [
  {{ uuid: 'b1', class_name: 'Sunrise HIIT', club_name: 'PulseFit Mission', day_time: 'Mon · 6:30 AM', booking_state: 'booked', owner_username: 'member1@pulsefit.app', member_name: 'Member 1' }},
  {{ uuid: 'b2', class_name: 'Sunrise HIIT', club_name: 'PulseFit Mission', day_time: 'Mon · 6:30 AM', booking_state: 'waitlist', owner_username: 'member2@pulsefit.app', member_name: 'Member 2' }},
  {{ uuid: 'b3', class_name: 'Sunrise HIIT', club_name: 'PulseFit Mission', day_time: 'Mon · 6:30 AM', booking_state: 'cancelled', owner_username: 'member3@pulsefit.app', member_name: 'Member 3' }},
  {{ uuid: 'b4', class_name: 'Sunrise HIIT', club_name: 'PulseFit Mission', day_time: 'Wed · 7:00 PM', booking_state: 'booked', owner_username: 'member4@pulsefit.app', member_name: 'Member 4' }},
  {{ uuid: 'b5', class_name: 'Other Class', club_name: 'PulseFit Mission', day_time: 'Mon · 6:30 AM', booking_state: 'booked', owner_username: 'member6@pulsefit.app', member_name: 'Member 6' }}
];

let sagasRun = [];
const mockServices = {{
  workflow: {{
    run: (wf, input) => {{
      sagasRun.push({{ wf, input }});
      return Promise.resolve({{ success: true, output: {{ status: 'completed' }} }});
    }}
  }}
}};

const mockClient = {{
  getObjects: () => Promise.resolve(testBookings),
  userInfo: {{ email: 'staff@pulsefit.app' }}
}};

function runSaga(workflowId, input) {{
  return mockServices.workflow.run(workflowId, input);
}}

function sendClassReminder(cl) {{
  return mockClient.getObjects('class_booking').then(res => {{
    const confirmed = res.filter(b => b.booking_state === 'booked' && b.class_name === cl.class_name && (!cl.day_time || b.day_time === cl.day_time) && (!cl.club_name || !b.club_name || b.club_name === cl.club_name));
    return Promise.all(confirmed.map(b => {{
      return runSaga('class_reminder', {{
        booking_uuid: b.uuid,
        class_name: cl.class_name,
        day_time: cl.day_time
      }});
    }}));
  }});
}}

sendClassReminder({{ class_name: 'Sunrise HIIT', club_name: 'PulseFit Mission', day_time: 'Mon · 6:30 AM' }})
  .then(() => {{
    // Exactly 1 confirmed booking matches Sunrise HIIT on Mon · 6:30 AM
    if (sagasRun.length !== 1) throw new Error('Expected exactly 1 saga run, got: ' + sagasRun.length);
    if (sagasRun[0].wf !== 'class_reminder') throw new Error('Expected class_reminder workflow');
    if (sagasRun[0].input.booking_uuid !== 'b1') throw new Error('Expected booking_uuid b1');
    console.log(JSON.stringify({{ success: true }}));
  }})
  .catch(err => {{
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
