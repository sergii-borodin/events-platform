# User entity

## Ranking (decision)

**Only registered users are ranked.** Career points, ratings, and court seeding by rank always key off `User._id`. Guests and walk-on lineup players still appear in that tournament’s local standings; their results are not aggregated into global ranking.

Never rank by display name, `"John Doe (2)"`, email, `bookingId`, or tournament `player.id`. Those are session labels or per-event ids.

```
User._id                 ← ranking key (stable)
  Booking.userId         ← set when a logged-in user books
  TournamentPlayer.userId
  player.id              ← engine-only, this tournament
  player.name            ← court label only
```

---

## The problem to solve (self-recognition)

This is **not** “can the database tell two John Does apart?” (`User._id` already does.)
This is **not** “will ranking merge their points?” (ranking by `userId` already prevents that.)

The problem is **at the venue, looking at the court board**:

Two registered players are both named John Doe. One has a high ranking and should start on the highest court. The other has a low ranking and should start on the lowest court. The screen shows `John Doe` and `John Doe (2)`.

`(2)` is assigned by the system. It is not something either person already knows about himself. If they verbally agree “I’ll be (2)”, they can easily agree the wrong way — and then the high-ranked John walks to the wrong court.

They need a label that each person **already recognizes as his own**, so he can answer: “that slot is me, so I belong on that court.”

Court names today are `10px` and truncated (`.padel-court__name`). Any extra text has to stay short.

---

## Option A — Email in parentheses

Example: `John Doe (john@club.dk)` vs `John Doe (j.doe@gmail.com)`

| | |
|---|---|
| Pros | Unique already; no new field; each person knows his email |
| Cons | Public screen at a club leaks private data; labels are long and will truncate on the court UI; two similar local-parts are still hard to scan; family-shared inboxes exist |

Partial email (`john@g…`) is shorter but can collide and still feels like a privacy leak.

**Not recommended as the court label.** Fine as a private check-in hint (“confirm it’s you”) that only that user sees.

---

## Option B — Required unique nickname

Example: `John Doe (SmashJohn)` vs `John Doe (JDoe92)`

| | |
|---|---|
| Pros | Chosen by the player, so he recognizes it; short enough for the court; unique so it never needs `(2)`; useful later on a public leaderboard |
| Cons | Extra signup friction; good names get taken; people forget the handle; padel groups usually call each other by real names |

This solves self-recognition even **before** ranking exists. Ranking still keys off `User._id`; the nickname is display-only.

A unique nickname does **not** need to replace first/last name. Show `First Last` normally; append the nickname **only when first+last collides in that tournament**.

---

## Option C — Show ranking next to the name (fits this scenario best)

Example: `John Doe · 1840` vs `John Doe · 920` (or `5.2` / `3.1` once you pick a rating scale)

Each player knows his own rating. The number on the board is the **same number that decided the court**. High court = high number. They do not need to remember who is `(2)`.

This is how tennis/padel boards often work (name + rating). It does not require a new unique field.

Until ranking ships, this option is unavailable. It also fails for two John Does with the **same** rating (rare).

---

## Option D — Photo / avatar

The court already shows initials in a small avatar. Two John Does both get `JD`. A real photo (Firebase `photoURL` already used in the nav) is the strongest real-world discriminator, but not everyone will have one at signup, and a TV/phone board from a few metres away still needs readable text.

**Supplement, not the only signal.**

---

## Option E — Per-tournament player number

Example: `John Doe · 7` vs `John Doe · 12`

Common on amateur scoresheets. Unique in that session, short, no global username squatting. Players do **not** already know “I am 7” unless you print it, pin it, or show it on their own phone (“you are #7, Court 1”).

Works if check-in is personal. Weak if they only look at a shared wall screen.

---

## Collision labels: points vs nickname

If courts are seeded by ranking (more points → highest court), the collision label and the seeding rule can be the same number.

Example: `John Doe (1840)` on Court 1, `John Doe (920)` on Court 4. Each person knows his own points. Higher number = higher court. They do not need to remember a nickname or negotiate `(2)`.

| Situation | Points in parentheses | Required unique nickname |
|---|---|---|
| High vs low John Doe, courts seeded by rank | Best — identity **and** reason for the court | Works, but does not explain the court |
| Close scores (1840 vs 1832) | Risky if they do not remember the exact total | Clear |
| Same points / both unranked / both `0` | Fails (`(0)` vs `(0)`) | Works |
| Ranking not shipped yet | Unavailable | Works |
| Signup friction | None | Extra unique field |

On a new platform most registered users start at `0` or the same default rating. That is the common case, not two veterans with 1840 vs 920. Points only become a good discriminator after people have played ranked events.

---

## Decision — show points on collision; do not require a nickname

**Do not require a unique nickname for this.** For the situation you care about (different points, courts seeded by points), showing the points is enough and is the better label.

Court label rules (when ranking exists):

1. Unique full name in this tournament → `John Doe`
2. Same full name, **different** points → `John Doe (1840)` / `John Doe (920)`
3. Same full name, **same or missing** points → `John Doe (2)` as a last resort (rare once ranking has spread)

Do **not** put emails on the shared court board.

Nickname can stay **optional** later (leaderboard vanity, or a fallback when points are tied). It is not needed on the User model for this step.

Until ranking ships, name collisions have no points to show. Accept `(2)` for that rare case, or add optional nickname only if it becomes a real problem.

---

## User model (this step)

```ts
interface IUser {
  firebaseUid: string; // unique, auth
  email: string;       // unique, auth / login — not shown on court
  firstName: string;   // required, not unique
  lastName: string;    // required, not unique
  createdAt: Date;
  updatedAt: Date;
}
```

Signup collects first name, last name, email, and password. Upsert the Mongo user on `POST /api/auth/session` after the Firebase token is verified.

Guest bookings stay allowed. They are not ranked. If two guests share a name, the organizer can still edit lineup names; that does not affect career ranking.

---

## Implementation plan (this step)

Scope: persist a Mongo `User` at registration. Do not link bookings, events, tournaments, or ranking yet.

`database/index.ts` already exports `User`; `database/user.model.ts` is still a stub and must match the Event/Booking pattern.

### 1. User model — `database/user.model.ts`

- Fields: `firebaseUid`, `email`, `firstName`, `lastName`, timestamps.
- Unique indexes on `firebaseUid` and `email` (email lowercase).
- `firstName` / `lastName` required, trimmed, **not** unique.
- HMR-safe model export like Event (`delete models.User` in development).

### 2. Upsert action — `lib/actions/user.actions.ts`

`upsertUserFromFirebase({ firebaseUid, email, firstName?, lastName? })`:

- Match on `firebaseUid`.
- Always keep `email` in sync.
- On **insert**, require `firstName` + `lastName`.
- On **login** of an existing row, do not overwrite names.
- If a pre-existing Firebase account has no Mongo row and no names, skip the insert (session still succeeds). Complete-profile is a later step.

### 3. Session route — `app/api/auth/session/route.ts`

After verifying the ID token and setting the cookie:

- Call upsert with `decoded.uid`, `decoded.email`, and optional `firstName` / `lastName` from the JSON body.
- If Mongo fails, log and still return the session. Do not lock the user out of Firebase.

### 4. Signup UI

- `SignupForm`: add required first name and last name (same labels as booking: Name / Surname).
- `AuthProvider.signup(email, password, firstName, lastName)`:
  - `createUserWithEmailAndPassword`
  - `updateProfile({ displayName: \`${firstName} ${lastName}\` })` so AuthNav works immediately
  - `establishServerSession(user, { firstName, lastName })`
- Login / `onAuthStateChanged` keep sending only `idToken`.

### 5. Verify

- New signup → one `users` document with uid, email, names.
- Same user logs in again → no second document, names unchanged.
- Session cookie still set if Mongo is down.

### Not in this step

- `Booking.userId`, `Event.organizerId`, tournament `userId`
- Ranking, points on court labels, nickname
- Complete-profile gate for old Firebase accounts
- Auth on `POST /api/events` (`requireUser()` exists but is unused)
