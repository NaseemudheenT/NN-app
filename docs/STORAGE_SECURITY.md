# Cloud Storage Security

Source: [`firebase/storage.rules`](../firebase/storage.rules) ·
Tests: [`firebase/tests/storage.rules.test.ts`](../firebase/tests/storage.rules.test.ts)

## Layout

```
users/{uid}/…      the founder's files — read, write, delete
derived/{uid}/…    previews, OCR, thumbnails — read only
backups/{uid}/…    encrypted archives — no client access at all
{allPaths=**}      denied
```

**There is no publicly readable path in NN.** A test asserts the rules contain
no `allow read: if true` anywhere.

## Why server areas sit outside `users/`

Storage rules are a permissive union: if any matching rule allows a request, it
is allowed. A `users/{uid}/_derived/` path is still matched by the owner's
general write rule, so denying it there does nothing. Only structural
separation works. See `SECURITY.md` §2 — this was found by a test, not review.

## Upload controls

**Allow-list, not block-list.** Images, video, audio, PDF, Office documents,
plain text, CSV, Markdown and JSON are accepted; anything unrecognised is
refused. This is what stops an executable or an HTML payload being stored and
later served from the founder's own origin.

Maximum file size is **200 MB** — large enough for lecture video and scanned
question banks, small enough that one bad upload cannot run up a storage bill.

An upload with no declared content type is refused.
