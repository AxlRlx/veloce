# Veloce System QA & Security Test Plan

This document details the test scenarios, automated test cases, and End-to-End (E2E) testing procedures for the Veloce Peer-to-Peer Luxury Hypercar Rental and Sales portal.

---

## 1. Executive Summary

In Phase 12, a high-fidelity verification suite was implemented under `/src/tests/veloce.test.ts` using **Vitest**. The test configuration covers critical backend access controls, transaction bounds, and state machines to protect the application from common security failures (e.g., privilege escalation, multi-booking race conditions, and bypass of checkout protocols).

---

## 2. Automated Test Scenarios (Vitest)

We have verified the following six high-severity bounds with continuous active assertions:

### Scenario A: Rental Overlap & Booking Conflicts
*   **Goal**: Ensure a single exact vehicle cannot be overlappingly reserved for identical or partial dates unless previous bookings are in a `'cancelled'` status.
*   **Assertions**:
    *   Rejects exact matching date bookings for the same `vehicleId`.
    *   Rejects partial start/end date overlap range intersections.
    *   Allows booking same dates on a completely distinct vehicle ID.
    *   Allows reuse of dates if matching booking has status `'cancelled'`.

### Scenario B: Match Likes Deduplication
*   **Goal**: Ensure double-liking (swiping right multiple times) does not populate duplicate IDs into the user profile's portfolio arrays.
*   **Assertions**:
    *   Deduplicates incoming like arrays cleanly down to unique strings using Set filters.

### Scenario C: No Manual Subscription Upgrades via Profile PUT
*   **Goal**: Protect the subscription upgrade flow. Prevent users from manually self-escalating role to `'dealer'` or subscriptionTier to `'veloce_gt'`/`'dealer_paid'` through direct payload injections on general profile APIs.
*   **Assertions**:
    *   Blocks updates specifying elevated `subscriptionTier` parameter against current matching profile models.
    *   Blocks updates specifying modified system `role` parameter.
    *   Successfully authorizes standard parameters (e.g., updates of user full name or profile avatar).

### Scenario D: Fleet Listing P2P Owner integrity
*   **Goal**: Prevent users from updating, editing, or deleting cars registered by other dealerships or platform members.
*   **Assertions**:
    *   Verifies user UUID matches registry `ownerId` prior to allowing modification payloads.

### Scenario E: Webhook-Driven Payment State Machines
*   **Goal**: Enforce that booking records and premium subscriptions start as `'pending'`/`'unpaid'` and transition to `'paid'` only after receiving a genuine, cryptographically verifiable Stripe checkout session complete webhook request.
*   **Assertions**:
    *   Correctly transitions matching `bookingId` payment status to `'paid'` only when payload type `checkout.session.completed` matches metadata parameters.
    *   Gracefully ignores alternative webhook indicators.

### Scenario F: Gemini AI Chat Assistant (Phase 13)
*   **Goal**: Drive conversational interactive support between customers and high-end dealerships. Prompt compile context (associated vehicle, historical messages, caller and dealer identities) into elegant system instructions and query parameters for Gemini, with a fallback system if credentials are not configured.
*   **Assertions**:
    *   Verifies that the core prompt builder extracts and embeds customer name, dealer name, vehicle, and historical context cleanly prior to invoking `@google/genai`.

---

## 3. End-to-End (E2E) Test Plan

For manual browser regression runs and programmatic E2E testing (e.g., Playwright / Cypress), execute the following interactive workflows.

### E2E Flow 1: Auth & Sync
1.  **Actions**:
    *   Open Veloce launch pad and register a standard consumer profile under the name "Elena Vance".
    *   Simulate successful auth synchronizer callbacks.
2.  **Expected Outcomes**:
    *   A pristine document is inserted to database with `subscriptionTier` set strictly to `'free'` and `role` to `'user'`.
    *   User navigation displays limited standard metrics.

### E2E Flow 2: Swiper Deck & Favorite Deduplication
1.  **Actions**:
    *   Browse to Swiper tab and swipe right (Like) on "Ferrari SF90 Stradale".
    *   Navigate back to Liked tab, view list.
    *   Attempt to trigger multiple parallel swipe actions or click likes for the identical card identifier.
2.  **Expected Outcomes**:
    *   Ferrari matches are cleanly stored, and count of favorites is exactly `1`.
    *   Likes do not duplicate inside state or visual grid arrays.

### E2E Flow 3: Stripe Checkout & Webhook State Changes
1.  **Actions**:
    *   Select "Porsche 911 GT3 RS" on the swiper deck or liked list and select "Rent Now".
    *   Complete form values, select Comprehensive Cover, and submit payment credentials.
2.  **Expected Outcomes**:
    *   Booking creates successfully on backend database under `paymentStatus: 'pending'`.
    *   Trigger webhook mock simulator for transaction ID:
        ```bash
        curl -X POST http://localhost:3000/api/billing/webhook \
          -H "Content-Type: application/json" \
          -d '{
            "type": "checkout.session.completed",
            "data": {
              "object": {
                "id": "mock_cs_val_001",
                "metadata": {
                  "bookingId": "BC-TARGET_ID"
                }
              }
            }
          }'
        ```
    *   Verify reservation status transitions successfully to `paid`.

### E2E Flow 4: Conversational Gemini Chat Simulator
1.  **Actions**:
    *   Navigate to the Inbox (`/api/chats` loads).
    *   Send a custom, contextual message (e.g., "Hi, what is the exact fuel configuration on the Ferrari SF90 Stradale?").
2.  **Expected Outcomes**:
    *   If `GEMINI_API_KEY` is active, the simulator leverages server-side `@google/genai` with `gemini-3.5-flash` to return a fully tailored, polite response describing the hybrid V8 powertrain and premium specs.
    *   If no key is configured, the server falls back seamlessly to standard static dealership lines, ensuring uninterrupted local service.

---

## 4. Execution Guidance

To run the automated security validation test suite:
```bash
npm run test
```
To check TypeScript and lint constraints:
```bash
npm run lint
```
