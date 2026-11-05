import asyncio
import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.v1.tasks import _check_parent

USER = uuid.uuid4()


class FakeDB:
    """tasks: {id: (user_id, parent_id)}; understands the two queries _check_parent issues."""

    def __init__(self, tasks):
        self.tasks = tasks

    async def execute(self, stmt):
        params = list(stmt.compile().params.values())
        text = str(stmt)
        if "tasks.user_id" in text.split("FROM")[0]:
            row = self.tasks.get(params[0])
            result = SimpleNamespace(first=lambda: SimpleNamespace(user_id=row[0], parent_task_id=row[1]) if row else None)
            return result
        parents = set(params[0])
        ids = [tid for tid, (_u, parent) in self.tasks.items() if parent in parents]
        return SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: ids))


def chain(n):
    ids = [uuid.uuid4() for _ in range(n)]
    tasks = {ids[0]: (USER, None)}
    for i in range(1, n):
        tasks[ids[i]] = (USER, ids[i - 1])
    return ids, tasks


def check(db, task_id, parent_id):
    return asyncio.run(_check_parent(task_id, parent_id, USER, db))


def test_no_parent_ok():
    check(FakeDB({}), None, None)


def test_depth_limit_on_create():
    ids, tasks = chain(3)
    check(FakeDB(tasks), None, ids[2])  # becomes 4th level: ok
    ids, tasks = chain(4)
    with pytest.raises(HTTPException) as e:
        check(FakeDB(tasks), None, ids[3])  # would be 5th level
    assert e.value.status_code == 422


def test_self_parent_and_cycle_rejected():
    ids, tasks = chain(3)
    with pytest.raises(HTTPException):
        check(FakeDB(tasks), ids[0], ids[0])
    with pytest.raises(HTTPException):
        check(FakeDB(tasks), ids[0], ids[2])  # moving root under its own descendant


def test_foreign_parent_is_404():
    other = uuid.uuid4()
    with pytest.raises(HTTPException) as e:
        check(FakeDB({other: (uuid.uuid4(), None)}), None, other)
    assert e.value.status_code == 404


def test_moving_subtree_counts_descendants():
    ids, tasks = chain(3)  # ids[0] -> ids[1] -> ids[2]
    new_parent = uuid.uuid4()
    deep_parent = uuid.uuid4()
    tasks[new_parent] = (USER, None)
    tasks[deep_parent] = (USER, new_parent)
    deeper = uuid.uuid4()
    tasks[deeper] = (USER, deep_parent)
    # moving ids[0] (3 levels) under `deeper` (3 levels) -> 6 > 4
    with pytest.raises(HTTPException):
        check(FakeDB(tasks), ids[0], deeper)
    check(FakeDB(tasks), ids[0], new_parent)  # 1 + 1 + 2 = 4: ok
