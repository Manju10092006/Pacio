from __future__ import annotations

import copy
import re
from dataclasses import dataclass
from typing import Any
from uuid import uuid4


def _get(doc: dict[str, Any], key: str) -> Any:
    value: Any = doc
    for part in key.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def _set(doc: dict[str, Any], key: str, value: Any) -> None:
    target = doc
    parts = key.split(".")
    for part in parts[:-1]:
        target = target.setdefault(part, {})
    target[parts[-1]] = value


def _project(doc: dict[str, Any], projection: dict[str, int] | None) -> dict[str, Any]:
    result = copy.deepcopy(doc)
    if projection:
        for key, include in projection.items():
            if include == 0:
                result.pop(key, None)
    return result


def _matches(doc: dict[str, Any], query: dict[str, Any] | None) -> bool:
    if not query:
        return True
    for key, expected in query.items():
        if key == "$or":
            return any(_matches(doc, option) for option in expected)
        actual = _get(doc, key)
        if isinstance(expected, dict):
            if "$in" in expected:
                if isinstance(actual, list):
                    if not any(item in expected["$in"] for item in actual):
                        return False
                elif actual not in expected["$in"]:
                    return False
            elif "$exists" in expected:
                exists = actual is not None
                if bool(expected["$exists"]) != exists:
                    return False
            elif "$gte" in expected:
                if actual is None or actual < expected["$gte"]:
                    return False
            elif "$lte" in expected:
                if actual is None or actual > expected["$lte"]:
                    return False
            elif "$gt" in expected:
                if actual is None or actual <= expected["$gt"]:
                    return False
            elif "$lt" in expected:
                if actual is None or actual >= expected["$lt"]:
                    return False
            elif "$regex" in expected:
                flags = re.I if expected.get("$options") == "i" else 0
                if actual is None or not re.search(expected["$regex"], str(actual), flags):
                    return False
            else:
                return False
        elif actual != expected:
            return False
    return True


def _eval_expr(doc: dict[str, Any], expr: Any) -> Any:
    if isinstance(expr, str) and expr.startswith("$"):
        return _get(doc, expr[1:])
    if isinstance(expr, dict) and "$cond" in expr:
        condition, when_true, when_false = expr["$cond"]
        return _eval_expr(doc, when_true) if _eval_expr(doc, condition) else _eval_expr(doc, when_false)
    if isinstance(expr, dict) and "$eq" in expr:
        left, right = expr["$eq"]
        return _eval_expr(doc, left) == _eval_expr(doc, right)
    return expr


class MemoryCursor:
    def __init__(self, rows: list[dict[str, Any]], projection: dict[str, int] | None = None):
        self.rows = [_project(row, projection) for row in rows]

    def limit(self, count: int) -> "MemoryCursor":
        self.rows = self.rows[:count]
        return self

    def sort(self, key: str, direction: int) -> "MemoryCursor":
        self.rows.sort(key=lambda row: _get(row, key), reverse=direction < 0)
        return self

    async def to_list(self, length: int | None = None) -> list[dict[str, Any]]:
        return copy.deepcopy(self.rows if length is None else self.rows[:length])


@dataclass
class _UpdateResult:
    modified_count: int


class MemoryCollection:
    def __init__(self):
        self.rows: list[dict[str, Any]] = []

    async def create_index(self, *args, **kwargs):
        return None

    async def find_one(self, query: dict[str, Any], projection: dict[str, int] | None = None, sort: list[tuple[str, int]] | None = None):
        rows = [row for row in self.rows if _matches(row, query)]
        if sort:
            for key, direction in reversed(sort):
                rows.sort(key=lambda row: _get(row, key), reverse=direction < 0)
        for row in rows:
            if _matches(row, query):
                return _project(row, projection)
        return None

    def find(self, query: dict[str, Any] | None = None, projection: dict[str, int] | None = None) -> MemoryCursor:
        return MemoryCursor([row for row in self.rows if _matches(row, query)], projection)

    async def insert_one(self, doc: dict[str, Any]):
        self.rows.append(copy.deepcopy(doc))
        return None

    async def insert_many(self, docs: list[dict[str, Any]]):
        self.rows.extend(copy.deepcopy(docs))
        return None

    async def count_documents(self, query: dict[str, Any]) -> int:
        return sum(1 for row in self.rows if _matches(row, query))

    async def update_one(self, query: dict[str, Any], update: dict[str, Any], upsert: bool = False) -> _UpdateResult:
        for row in self.rows:
            if _matches(row, query):
                for key, value in update.get("$set", {}).items():
                    _set(row, key, copy.deepcopy(value))
                return _UpdateResult(modified_count=1)
        if upsert:
            doc = copy.deepcopy(query)
            for key, value in update.get("$set", {}).items():
                _set(doc, key, copy.deepcopy(value))
            self.rows.append(doc)
            return _UpdateResult(modified_count=1)
        return _UpdateResult(modified_count=0)

    async def delete_one(self, query: dict[str, Any]):
        for index, row in enumerate(self.rows):
            if _matches(row, query):
                del self.rows[index]
                break

    def aggregate(self, pipeline: list[dict[str, Any]]) -> MemoryCursor:
        rows = copy.deepcopy(self.rows)
        for step in pipeline:
            if "$match" in step:
                rows = [row for row in rows if _matches(row, step["$match"])]
            elif "$group" in step:
                rows = self._group(rows, step["$group"])
            elif "$sort" in step:
                for key, direction in reversed(list(step["$sort"].items())):
                    rows.sort(key=lambda row: _get(row, key), reverse=direction < 0)
            elif "$limit" in step:
                rows = rows[: step["$limit"]]
        return MemoryCursor(rows)

    def _group(self, rows: list[dict[str, Any]], spec: dict[str, Any]) -> list[dict[str, Any]]:
        grouped: dict[Any, dict[str, Any]] = {}
        avg_state: dict[tuple[Any, str], list[float]] = {}
        group_key_expr = spec["_id"]
        for row in rows:
            group_key = _eval_expr(row, group_key_expr)
            bucket = grouped.setdefault(group_key, {"_id": group_key})
            for field, expr in spec.items():
                if field == "_id":
                    continue
                op, value = next(iter(expr.items()))
                if op == "$sum":
                    bucket[field] = bucket.get(field, 0) + (_eval_expr(row, value) or 0)
                elif op == "$max":
                    current = bucket.get(field)
                    candidate = _eval_expr(row, value)
                    bucket[field] = candidate if current is None or candidate > current else current
                elif op == "$avg":
                    avg_state.setdefault((group_key, field), []).append(_eval_expr(row, value) or 0)
                elif op == "$first" and field not in bucket:
                    bucket[field] = _eval_expr(row, value)
        for (group_key, field), values in avg_state.items():
            grouped[group_key][field] = sum(values) / len(values) if values else 0
        return list(grouped.values())


class MemoryDB:
    def __init__(self):
        self._collections: dict[str, MemoryCollection] = {}

    def __getattr__(self, name: str) -> MemoryCollection:
        return self._collections.setdefault(name, MemoryCollection())

    def __getitem__(self, name: str) -> MemoryCollection:
        return self._collections.setdefault(name, MemoryCollection())


class MemoryGridFS:
    def __init__(self):
        self.files: dict[str, bytes] = {}

    async def upload_from_stream(self, filename: str, content: bytes, metadata: dict[str, Any] | None = None) -> str:
        file_id = uuid4().hex
        self.files[file_id] = bytes(content)
        return file_id

    async def open_download_stream(self, file_id: Any):
        data = self.files[str(file_id)]

        class _Stream:
            async def read(self):
                return data

        return _Stream()
