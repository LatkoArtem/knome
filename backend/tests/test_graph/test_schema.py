import os
import shutil
import pytest

os.environ["KUZU_DB_PATH"] = "./data/test_knome.db"

from graph.schema import init_schema, get_connection
from graph import schema as schema_module
from graph.queries import create_user, get_user, user_exists, add_goal, get_user_context


@pytest.fixture(autouse=True)
def fresh_db(tmp_path):
    test_db = str(tmp_path / "test.db")
    os.environ["KUZU_DB_PATH"] = test_db
    schema_module._db = None
    schema_module._conn = None
    init_schema()
    yield
    schema_module._db = None
    schema_module._conn = None


def test_init_schema_runs_without_error():
    init_schema()


def test_create_and_get_user():
    user_id = create_user("Тест", language="ua", age=25)
    user = get_user(user_id)
    assert user is not None
    assert user["name"] == "Тест"
    assert user["language"] == "ua"
    assert user["age"] == 25


def test_user_not_exists():
    assert not user_exists("non-existent-id")


def test_user_exists_after_creation():
    user_id = create_user("Олег")
    assert user_exists(user_id)


def test_add_goal_and_get_context():
    user_id = create_user("Олег")
    add_goal(user_id, domain="learning", description="Вивчити Python")
    context = get_user_context(user_id)
    assert context["user"]["name"] == "Олег"
    assert len(context["goals"]) == 1
    assert context["goals"][0]["description"] == "Вивчити Python"
    assert context["goals"][0]["domain"] == "learning"
