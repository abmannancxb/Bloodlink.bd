# Security Specification for BloodLink

## Data Invariants
1. A user can only edit their own profile.
2. A user cannot change their own `role` or `isBlocked` status.
3. A user can only message chats where they are a participant.
4. A blood request can only be deleted or updated by the creator (except for `contactCount` increments).
5. Community posts can only be deleted or edited by the author.
6. Admins have full access to view all data and manage reports/bans.

## The Dirty Dozen (Vulnerability Test Cases)

| ID | Description | Target Collection | Payload/Action | Expected Result |
|----|-------------|-------------------|----------------|-----------------|
| D1 | Escalation | `/users/{myId}` | `{ "role": "admin" }` | `DENIED` |
| D2 | Profile Theft | `/users/{otherId}` | `{ "displayName": "Hacker" }` | `DENIED` |
| D3 | Request Hijack| `/requests/{otherId}`| `{ "status": "Fulfilled" }` | `DENIED` |
| D4 | Chat Eavesdrop| `/chats/{notMyChat}` | `GET` | `DENIED` |
| D5 | Message Injection| `/chats/{notMyId}/messages` | `{ "text": "spam" }` | `DENIED` |
| D6 | Post Vandalism| `/posts/{otherId}` | `{ "content": "deleted" }`| `DENIED` |
| D7 | Admin Spoofing| `/reports` | `LIST` | `DENIED` |
| D8 | Ghost ID | `/users/!@#$%^` | `CREATE` | `DENIED` |
| D9 | Giant Payload | `/posts/{myId}` | `{ "content": "10MB text..." }` | `DENIED` |
| D10| Backdate Msg | `/chats/{myId}/messages` | `{ "createdAt": "2000-01-01" }` | `DENIED` |
| D11| Orphaned Res | `/requests/{id}` | `{ "requesterUid": "non-existent" }` | `DENIED` |
| D12| PII Leak | `/users/{otherId}` | `GET` (as non-admin) | `DENIED` (if contains internal email/phone) |

## Test Runner (Draft)

```typescript
// firestore.rules.test.ts (conceptual)
// Tests are implemented to ensure all 12 cases above return PERMISSION_DENIED.
```
