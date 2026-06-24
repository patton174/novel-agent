"""Custom JSON Schema exports for bind_tools (oneOf row targets)."""

from __future__ import annotations

from typing import Any

from pydantic.json_schema import JsonSchemaValue


def _pick_properties(
    properties: dict[str, Any],
    required_keys: tuple[str, ...],
    optional_keys: tuple[str, ...] = (),
) -> dict[str, Any]:
    picked: dict[str, Any] = {}
    for key in required_keys:
        if key in properties:
            picked[key] = properties[key]
    for key in optional_keys:
        if key in properties:
            picked[key] = properties[key]
    return picked


def chapter_row_target_one_of_schema(
    *,
    properties: dict[str, Any],
    optional_keys: tuple[str, ...] = (),
) -> JsonSchemaValue:
    """oneOf: exactly one of index | chapter_id | title, plus shared optional fields."""
    branches = []
    for key in ("index", "chapter_id", "title"):
        if key not in properties:
            continue
        branches.append(
            {
                "type": "object",
                "required": [key],
                "properties": _pick_properties(properties, (key,), optional_keys),
                "additionalProperties": False,
            }
        )
    return {"oneOf": branches}


def delete_chapter_one_of_schema(*, properties: dict[str, Any]) -> JsonSchemaValue:
    """oneOf: one delete target mode per branch."""
    branches = []
    for key in ("chapter_id", "chapter_ids", "title", "index", "dedupe_title"):
        if key not in properties:
            continue
        branches.append(
            {
                "type": "object",
                "required": [key],
                "properties": {key: properties[key]},
                "additionalProperties": False,
            }
        )
    return {"oneOf": branches}


def update_memory_fields_one_of_schema(*, properties: dict[str, Any]) -> JsonSchemaValue:
    """oneOf: memory_id + title | node_kind | style; parent_id optional guard on every branch."""
    optional_keys = ("parent_id",)
    branches = []
    for key in ("title", "node_kind", "style"):
        if key not in properties or "memory_id" not in properties:
            continue
        branches.append(
            {
                "type": "object",
                "required": ["memory_id", key],
                "properties": _pick_properties(properties, ("memory_id", key), optional_keys),
                "additionalProperties": False,
            }
        )
    return {"oneOf": branches}


def move_memory_one_of_schema(*, properties: dict[str, Any]) -> JsonSchemaValue:
    """oneOf: memory_id + parent_id or sort_order (both allowed together)."""
    optional_keys = ("parent_id", "sort_order")
    branches = []
    for key in ("parent_id", "sort_order"):
        if key not in properties or "memory_id" not in properties:
            continue
        branches.append(
            {
                "type": "object",
                "required": ["memory_id", key],
                "properties": _pick_properties(properties, ("memory_id", key), optional_keys),
                "additionalProperties": False,
            }
        )
    return {"oneOf": branches}


def _node_type_const_property(properties: dict[str, Any], value: str) -> dict[str, Any]:
    """Pin node_type to a single branch value so oneOf branches do not overlap."""
    base = dict(properties.get("node_type") or {})
    base["const"] = value
    base.pop("enum", None)
    return base


def _required_string_property(properties: dict[str, Any], key: str) -> dict[str, Any]:
    """Non-nullable string field for bind_tools required keys (no default null)."""
    base = dict(properties.get(key) or {})
    base["type"] = "string"
    base.pop("anyOf", None)
    base.pop("default", None)
    return base


def create_memory_one_of_schema(*, properties: dict[str, Any]) -> JsonSchemaValue:
    """oneOf: root tab | child+parent_id (bind_tools required fields)."""
    root_optional = ("sort_order", "node_kind", "content", "style", "meta")
    child_optional = ("sort_order", "node_kind", "content", "style", "meta")
    branches: list[JsonSchemaValue] = []
    if "node_type" in properties and "title" in properties:
        root_props = _pick_properties(properties, ("title",), root_optional)
        root_props["node_type"] = _node_type_const_property(properties, "root")
        branches.append(
            {
                "type": "object",
                "required": ["node_type", "title"],
                "properties": root_props,
                "additionalProperties": False,
            }
        )
    if all(k in properties for k in ("node_type", "title", "parent_id")):
        child_props = _pick_properties(
            properties,
            ("title",),
            child_optional,
        )
        child_props["node_type"] = _node_type_const_property(properties, "child")
        child_props["parent_id"] = _required_string_property(properties, "parent_id")
        branches.append(
            {
                "type": "object",
                "required": ["node_type", "title", "parent_id"],
                "properties": child_props,
                "additionalProperties": False,
            }
        )
    return {"oneOf": branches}


def edit_chapter_one_of_schema(*, properties: dict[str, Any]) -> JsonSchemaValue:
    """oneOf: line edit | rename | move | rewrite | full-body replace."""
    branches: list[JsonSchemaValue] = []
    if all(k in properties for k in ("chapter_id", "line_start", "line_content")):
        line_props = _pick_properties(
            properties,
            ("chapter_id", "line_start", "line_content"),
            ("line_end",),
        )
        line_props["line_content"] = _required_string_property(properties, "line_content")
        branches.append(
            {
                "type": "object",
                "required": ["chapter_id", "line_start", "line_content"],
                "properties": line_props,
                "additionalProperties": False,
            }
        )
    if all(k in properties for k in ("chapter_id", "new_title")):
        branches.append(
            {
                "type": "object",
                "required": ["chapter_id", "new_title"],
                "properties": _pick_properties(properties, ("chapter_id", "new_title")),
                "additionalProperties": False,
            }
        )
    if all(k in properties for k in ("chapter_id", "index")):
        branches.append(
            {
                "type": "object",
                "required": ["chapter_id", "index"],
                "properties": _pick_properties(properties, ("chapter_id", "index")),
                "additionalProperties": False,
            }
        )
    if all(k in properties for k in ("chapter_id", "rewrite")):
        rewrite_props = _pick_properties(properties, ("chapter_id", "rewrite"))
        rewrite_props["rewrite"] = dict(rewrite_props.get("rewrite") or {})
        rewrite_props["rewrite"]["const"] = True
        rewrite_props["rewrite"].pop("default", None)
        branches.append(
            {
                "type": "object",
                "required": ["chapter_id", "rewrite"],
                "properties": rewrite_props,
                "additionalProperties": False,
            }
        )
    if all(k in properties for k in ("chapter_id", "new_content")):
        content_props = _pick_properties(properties, ("chapter_id", "new_content"))
        content_props["new_content"] = _required_string_property(properties, "new_content")
        branches.append(
            {
                "type": "object",
                "required": ["chapter_id", "new_content"],
                "properties": content_props,
                "additionalProperties": False,
            }
        )
    return {"oneOf": branches}


def reorder_chapters_one_of_schema(*, properties: dict[str, Any]) -> JsonSchemaValue:
    """oneOf: chapter_ids or moves."""
    branches = []
    for key in ("chapter_ids", "moves"):
        if key not in properties:
            continue
        branches.append(
            {
                "type": "object",
                "required": [key],
                "properties": {key: properties[key]},
                "additionalProperties": False,
            }
        )
    return {"oneOf": branches}


def merge_bind_schema(base_schema: JsonSchemaValue, body: JsonSchemaValue) -> JsonSchemaValue:
    """Preserve title/description from Pydantic base schema."""
    out = dict(body)
    for key in ("title", "description"):
        if key in base_schema:
            out[key] = base_schema[key]
    return out
