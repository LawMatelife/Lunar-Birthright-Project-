"""Offline regression tests; no provider calls or live database writes."""
import asyncio
import copy
import io
import logging
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException
from reportlab.pdfgen import canvas

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))
import runtime_hardening


def matches(doc, query):
    for key, value in query.items():
        actual = doc.get(key)
        if isinstance(value, dict):
            if "$nin" in value and actual in value["$nin"]:
                return False
            if "$ne" in value and actual == value["$ne"]:
                return False
        elif actual != value:
            return False
    return True


class Collection:
    def __init__(self, doc):
        self.doc = copy.deepcopy(doc)

    async def find_one(self, query, projection=None):
        return copy.deepcopy(self.doc) if matches(self.doc, query) else None

    async def update_one(self, query, update):
        if not matches(self.doc, query):
            return SimpleNamespace(modified_count=0)
        old = copy.deepcopy(self.doc)
        self.doc.update(update.get("$set", {}))
        return SimpleNamespace(modified_count=int(old != self.doc))


class PaidGiftSafetyTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.environment = patch.dict("os.environ", {"ENABLE_POLYGON_MINT": "false", "MINTING_RELEASE_GATE": "closed"})
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.sent = []
        self.routes = {}
        self.certificate = Collection({"user_id": "user-1", "stripe_session_id": "session-1", "payment_status": "paid", "stripe_payment_intent_id": "pi-1", "email_delivery_status": "pending"})
        self.user = Collection({"id": "user-1", "email": "buyer@example.test", "full_name": "Recipient", "certificate_number": "LBP-2026-123456"})
        self.payment = Collection({"session_id": "session-1", "user_id": "user-1", "email": "buyer@example.test", "payment_intent_id": "pi-1"})
        self.checkout = {"payment_status": "paid", "status": "complete", "amount_total": 1200, "currency": "nzd", "payment_intent": "pi-1", "customer_details": {"email": "buyer@example.test"}, "metadata": {"app": "lunar_birthright", "purchase_type": "personalised_gift"}}

        async def forbidden_mint(*args):
            self.fail("Recovery invoked minting")

        async def send(**kwargs):
            self.sent.append(kwargs)
            return {"status": "success", "email_id": "message-1"}

        async def alert(**kwargs):
            return "alert-1"

        async def mark(*args):
            return self.certificate.doc

        self.server = SimpleNamespace(
            db=SimpleNamespace(certificates=self.certificate, users=self.user, plots=Collection({"owner_id": "user-1"}), payment_transactions=self.payment),
            process_certificate_and_nft=forbidden_mint,
            _build_certificate_urls=lambda *a: {},
            generate_premium_certificate_pdf=self.valid_pdf,
            send_email_async=send, create_admin_notification=alert,
            get_current_user=lambda: None,
            app=SimpleNamespace(add_api_route=lambda path, handler, **kw: self.routes.update({path: handler})),
            FRONTEND_URL="https://example.test", STRIPE_API_KEY="test-configured",
            stripe=SimpleNamespace(checkout=SimpleNamespace(Session=SimpleNamespace(retrieve=lambda s: self.checkout))),
            asyncio=asyncio, _mark_stripe_payment_paid=mark, logger=logging.getLogger("test"),
        )
        runtime_hardening.install(self.server)

    @staticmethod
    def valid_pdf(**kwargs):
        stream = io.BytesIO()
        pdf = canvas.Canvas(stream)
        pdf.drawString(50, 700, "Certificate")
        pdf.save()
        return stream.getvalue()

    async def test_valid_pdf_is_ready_and_repeat_sends_once(self):
        for _ in range(2):
            await self.server.process_certificate_and_nft("user-1", "session-1")
        self.assertTrue(self.certificate.doc["certificate_ready"])
        self.assertEqual(len(self.certificate.doc["certificate_pdf_sha256"]), 64)
        self.assertEqual(len(self.sent), 1)
        self.assertEqual(self.certificate.doc["email_provider_status"], "accepted")
        self.assertNotIn("email_delivered_at", self.certificate.doc)

    async def test_invalid_pdf_never_ready_or_emailed(self):
        self.server.generate_premium_certificate_pdf = lambda **kw: b"invalid"
        with self.assertRaises(HTTPException) as caught:
            await self.server.process_certificate_and_nft("user-1", "session-1")
        self.assertEqual(caught.exception.status_code, 502)
        self.assertFalse(self.certificate.doc["certificate_ready"])
        self.assertEqual(self.sent, [])

    async def test_corrupt_pdf_never_ready(self):
        self.server.generate_premium_certificate_pdf = lambda **kw: b"%PDF-1.4\ninvalid"
        with self.assertRaises(HTTPException):
            await self.server.process_certificate_and_nft("user-1", "session-1")
        self.assertFalse(self.certificate.doc["certificate_ready"])
        self.assertEqual(self.sent, [])

    async def test_recovery_rejects_non_admin(self):
        with self.assertRaises(HTTPException) as caught:
            await self.routes["/api/certificate/reconcile-paid-gift"]("session-1", {"is_admin": False})
        self.assertEqual(caught.exception.status_code, 403)

    async def test_recovery_rejects_open_mint_gate(self):
        with patch.dict("os.environ", {"ENABLE_POLYGON_MINT": "true", "MINTING_RELEASE_GATE": "approved"}):
            with self.assertRaises(HTTPException) as caught:
                await self.routes["/api/certificate/reconcile-paid-gift"]("session-1", {"is_admin": True})
        self.assertEqual(caught.exception.status_code, 409)

    async def test_recovery_rejects_wrong_payment_intent(self):
        self.checkout["payment_intent"] = "wrong-intent"
        with self.assertRaises(HTTPException) as caught:
            await self.routes["/api/certificate/reconcile-paid-gift"]("session-1", {"is_admin": True})
        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual(self.sent, [])

    async def test_recovery_rejects_unmatched_email(self):
        self.user.doc["email"] = "someone-else@example.test"
        with self.assertRaises(HTTPException) as caught:
            await self.routes["/api/certificate/reconcile-paid-gift"]("session-1", {"is_admin": True})
        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual(self.sent, [])


if __name__ == "__main__":
    unittest.main()
