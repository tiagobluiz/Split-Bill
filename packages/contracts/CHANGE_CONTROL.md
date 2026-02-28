# Contract Change Control (SB-003 Freeze)

`packages/contracts/openapi/openapi.v1.yaml` is the authoritative v1 API contract.

## Freeze Rules

- `info.version` remains `1.0.0` while v1 is frozen.
- Breaking changes are blocked by default.
- Any breaking change requires an explicit exception PR with:
1. `BREAKING CONTRACT CHANGE` in PR title.
2. A migration note in this file under "Approved Exceptions".
3. Frontend and backend owner sign-off.

## Non-Breaking Changes

Allowed without exception:
- Additive endpoints.
- Additive optional fields.
- New enum values only when consumers are validated for forward compatibility.

## Breaking Changes

Examples:
- Removing or renaming endpoint paths/operations.
- Removing request/response fields.
- Making optional fields required.
- Tightening accepted value constraints in incompatible ways.

## Approved Exceptions

- None.
