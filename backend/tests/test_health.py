from fastapi.testclient import TestClient

from app.main import app


def test_root_ok():
    # Deliberately not using `with TestClient(app)` - that triggers the
    # startup lifespan (ensure_default_user), which needs a live
    # Postgres connection. This smoke test only checks routing/app
    # wiring, so it skips lifespan entirely.
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Todoist Clone API - see /docs"}
