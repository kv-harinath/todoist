from app.main import app


def test_reminder_routes_registered():
    paths = {(m, r.path) for r in app.routes if hasattr(r, "methods") for m in r.methods}
    assert ("GET", "/api/v1/reminders") in paths
    assert ("GET", "/api/v1/reminders/due") in paths
    assert ("POST", "/api/v1/reminders") in paths
    assert ("POST", "/api/v1/reminders/{reminder_id}/dismiss") in paths
    assert ("DELETE", "/api/v1/reminders/{reminder_id}") in paths
