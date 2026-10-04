import json
import re
import unittest

from _test_lib import load_setup_py


class ParticipantEnrolledBindingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        setup, error = load_setup_py()
        if error:
            raise RuntimeError(error)
        cls.binding = next(
            binding for binding in setup.EVENT_BINDINGS
            if binding["event"] == "@create:trialcore:participant"
            and binding["workflow_id"] == "participant_enrolled"
        )
        cls.workflow = next(
            workflow for workflow in setup.WORKFLOW_DEFINITIONS
            if workflow["workflow_id"] == cls.binding["workflow_id"]
        )

    def test_recipient_comes_from_authenticated_creator(self):
        self.assertEqual(
            self.binding["input_map"].get("coordinator_email"), "user.email"
        )

    def test_all_notification_inputs_are_bound(self):
        referenced_inputs = set(re.findall(
            r"\{\{input\.([a-z_]+)\}\}", json.dumps(self.workflow["steps"])
        ))
        self.assertEqual(
            referenced_inputs - self.binding["input_map"].keys(), set()
        )


if __name__ == "__main__":
    unittest.main()
