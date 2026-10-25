"""
Unit test verifying safety checks for seed_hospital_data command.
Ensures:
1. In production (DEBUG=False), running without --confirm flag safely aborts.
2. The command is protected from accidental execution in production.
"""

import os
import sys
import unittest
from unittest.mock import patch, MagicMock
from io import StringIO

# Ensure backend directory is in sys.path
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.core.management import call_command


class SeedHospitalDataSafetyTests(unittest.TestCase):
    """Verifies production safety guards on the seed_hospital_data command."""

    @patch('django.conf.settings.DEBUG', False)
    def test_seed_aborts_in_production_without_confirm_flag(self):
        """When DEBUG is False, running seed_hospital_data without --confirm outputs safety abort message."""
        out = StringIO()
        call_command('seed_hospital_data', stdout=out)
        output = out.getvalue()
        self.assertIn("SAFETY ABORT", output)
        self.assertIn("--confirm", output)


if __name__ == '__main__':
    unittest.main()
