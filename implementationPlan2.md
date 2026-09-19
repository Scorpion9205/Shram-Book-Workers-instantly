Systematic Defect Remediation: Search Bars, Core Flows & Missing Interfaces
This implementation plan details the step-by-step resolution of all critical defects uncovered during the platform-wide technical audit, divided into three prioritized phases.

User Review & API Keys Required
IMPORTANT

Google Maps API Key: In frontend/.env, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is currently set to the placeholder your_google_maps_api_key.

If you have a Google Maps JavaScript API key (with Places API and Geocoding API enabled), please share it with us or paste it into frontend/.env.
Zero-Blocker Fallback: Regardless of whether you provide a key right away, our implementation will include an automatic OpenStreetMap / Nominatim + Geolocation fallback in AddressSearch.tsx so that valid latitude and longitude coordinates are always returned, completely eliminating the (0, 0) Null Island matching failure!
Remediation Sequence (Step-by-Step)

Phase 1: Search Bars & Geolocation (AddressSearch, Job Feed Search, Admin Filters)
   ↓
Phase 2: Core Flow Unblocking (Work-Start OTP 6-digits, Payment Verification, Agent ID)
   ↓
Phase 3: Missing Interfaces & Relays (Worker Wallet UI & Live Socket Relay)
Proposed Changes
Phase 1: Search Bars & Address Input Restoration
[MODIFY] 
useGoogleMapsScript.ts
Replace the hardcoded return false; stub with dynamic script injection.
Check process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. If present and valid (not "your_google_maps_api_key"), inject https://maps.googleapis.com/maps/api/js?key=...&libraries=places.
Return { isLoaded: boolean, loadError: boolean }.
[MODIFY] 
AddressSearch.tsx
Connect to useGoogleMapsScript. When loaded, initialize google.maps.places.Autocomplete.
Eliminate (0, 0) Coords: Replace manual typing fallback (lat: 0, lng: 0) with debounced OpenStreetMap Nominatim geocoding (https://nominatim.openstreetmap.org/search?format=json&q=...) to resolve real coordinates.
Update "Use current location" button to reverse-geocode coordinates using Nominatim when Google Maps is unavailable.
[NEW] 
GetJobsQuery.dto.ts
Define Zod schema validating search, category, minSalary, maxSalary, sort (latest, nearest, highest_salary, highest_rated), page, and limit.
[MODIFY] 
JobController.ts
In getAllJobs: parse and validate req.query with GetJobsQuerySchema.
Forward validated query parameters to jobService.getAllJobs(user.userId, query).
[MODIFY] 
JobService.ts
 & 
JobRepository.ts
Update JobService.getAllJobs signature to accept filter?: GetJobsQueryDto.
Update JobRepository.findManyOpenBySkillIds (or add findManyOpenByFilter) to execute Prisma where with:
status: 'OPEN'
skillId: { in: skillIds }
title: { contains: filter.search, mode: 'insensitive' } (if search provided)
budget: { gte: minSalary, lte: maxSalary }
Sort by createdAt: 'desc' or budget: 'desc'.
Bypass or namespace Redis cache when search/filter parameters are active so search results reflect live queries.
[MODIFY] 
JobFilterBar.tsx
Switch input from uncontrolled defaultValue={filters.search} to controlled value={filters.search ?? ""}.
[MODIFY] 
page.tsx (Admin Users)
 & 
AdminController.ts
In admin/users/page.tsx: change <option value="worker"> to uppercase "WORKER", "PROVIDER", "AGENT".
In AdminController.ts: transform GetUsersQuerySchema.role with .transform(val => val ? val.toUpperCase() : undefined) so both uppercase and lowercase queries succeed without a 400 error.
In AdminController.ts: add search: z.string().optional() to GetBookingsQuerySchema.
In BookingRepository.ts: add search Prisma filter (OR: [{ id: { contains: filter.search, mode: 'insensitive' } }]) and resolve agentProfile ID when filter.agentId is supplied.
Phase 2: Core Flow Unblocking & Critical Fixes
[MODIFY] 
page.tsx (Worker Booking Detail)
Line 207: change maxLength={4} to maxLength={6}.
Line 203: update placeholder from "e.g. 1234" to "e.g. 123456".
Line 69: update error toast from "Please enter the 4-digit start OTP" to "Please enter the 6-digit start OTP".
[MODIFY] 
payment.routes.ts
, 
PaymentController.ts
, 
PaymentService.ts
Add route POST /api/v1/payments/verify.
Validate { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature }.
Verify HMAC SHA256 signature in PaymentService.
Transition booking to PAYMENT_CONFIRMED and trigger booking:status_changed event.
In frontend/src/app/(provider)/provider/booking/[bookingId]/page.tsx: connect Razorpay handler() to call payment verification mutation.
Phase 3: Missing Interfaces & Relays
[NEW] 
walletApi.ts
Implement RTK Query endpoints for getWalletBalance (/wallet/balance) and getTransactionHistory (/wallet/transactions).
[NEW] 
page.tsx (Worker Wallet)
Create responsive Worker Wallet dashboard displaying:
Current balance card with total earnings.
Recent transactions ledger (Job payouts, withdrawals).
Payout request dialog / form.
[MODIFY] 
nav.ts
Add "Wallet" link (/worker/wallet) to workerNavItems.
[MODIFY] 
socket.ts
Add listener for "worker:location_update" to broadcast coordinates to the active booking room (io.to(booking:${bookingId}).emit("worker:location_moved", coords)).
Verification Plan
Automated Tests
Backend Unit & Regression Tests:
powershell

cd backend; npx vitest run
All tests across auth, wallet, instant requests, and bookings must pass.
Type Checking (Frontend & Backend):
powershell

cd backend; npx tsc --noEmit
cd ../frontend; npx tsc --noEmit
Must exit with code 0 (zero errors).
Manual Verification
Address Search:
Type in the address search bar on provider/instant-hire and provider/jobs/create.
Verify real lat/lng is populated (no (0, 0)).
Click "Use current location" and verify reverse geocoding works.
Worker Job Feed:
Type search query and change category filter; verify jobs list updates.
Admin User Directory:
Filter by "Worker", "Provider", "Agent"; verify list updates without 400 error.
Worker Start OTP:
Enter full 6-digit OTP in worker booking page; verify input accepts 6 digits and submits.
