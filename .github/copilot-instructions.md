# Balkan TV Panel - AI Coding Instructions

## Project Overview
This is a Firebase-hosted single-page application (SPA) for managing IPTV customer accounts and subscriptions. The app serves as a customer portal where users can view their subscription details, request account renewals, and access service information. Administrators can manage user accounts, approve requests, set pricing, and communicate with users.

## Architecture
- **Frontend**: Single HTML file (`public/index.html`) with embedded JavaScript, styled with Tailwind CSS
- **Backend**: Firebase services (Authentication, Firestore, Hosting, Cloud Functions)
- **Data Storage**: Firestore with a nested structure under `artifacts/{appId}/public/data/`
- **Authentication**: Firebase Auth with anonymous sign-in and custom token support
- **Deployment**: Firebase Hosting for static assets, Firebase Functions for server-side logic

## Key Components
- **User Panel**: Customer-facing interface for viewing subscription status, connection URLs, and QR codes
- **Admin Dashboard**: Management interface for user administration, request approval, pricing, and messaging
- **Cloud Functions**: Scheduled tasks for account expiration notifications (`functions/index.js`)

## Data Model
Primary Firestore collections (under `artifacts/{appId}/public/data/`):
- `iptv_users`: User account data (username, expiration dates, connection details)
- `new_account_requests`: Pending new account creation requests
- `renewal_requests`: Subscription renewal requests
- `messages`: Admin-to-user communications
- `settings`: Configuration documents (`global`, `admin`, `price_list`)

## Developer Workflows
- **Local Development**: Open `public/index.html` in browser (no build required)
- **Deployment**: Use `firebase deploy` to deploy hosting and functions
- **Firebase Config**: Project ID `balkantvpanel`, configured in `.firebaserc` and `firebase.json`
- **Authentication**: Supports anonymous login for users, custom token for admins

## Code Patterns & Conventions
- **Language**: Primarily Turkish (UI text, comments, variable names)
- **Styling**: Orange color scheme (`#f97316`), Tailwind CSS classes
- **JavaScript**: ES6 modules imported from Firebase CDN (v11.6.1)
- **Data Access**: Direct Firestore operations with `doc()`, `collection()`, `getDoc()`, `setDoc()`
- **UI Structure**: Conditional display of admin/user views using CSS classes (`.admin-view`, `.user-view`)
- **Modals**: Custom modal implementation for forms and confirmations
- **QR Codes**: Generated client-side for connection URLs using qrcode.js library
- **Date Handling**: Uses Flatpickr for date inputs, Firestore Timestamps for storage

## Integration Points
- **Email Notifications**: Cloud Function triggers emails via Firestore `mail` collection (using Firebase Extensions)
- **Scheduled Tasks**: Daily function runs at 9:00 AM Istanbul time to check expiring accounts
- **External Libraries**: Tailwind CSS (CDN), QRCode.js, Flatpickr (CDN imports)

## Common Tasks
- **Adding New Features**: Modify `public/index.html` - add HTML structure, CSS styles, and JavaScript functions
- **Data Schema Changes**: Update Firestore document structures in relevant functions (e.g., user creation, settings)
- **Admin Permissions**: Check for admin role in user document (`role: "Admin"`)
- **User Authentication**: Use `signInAnonymously()` for users, custom token flow for admins
- **Error Handling**: Display messages using `showMessage()` function with 'success'/'error' types

## Key Files
- `public/index.html`: Entire application (HTML, CSS, JS)
- `functions/index.js`: Cloud Functions for notifications
- `firebase.json`: Hosting configuration
- `.firebaserc`: Project configuration

## Security Notes
- Firebase rules should restrict access to user-specific data
- Admin functions check user roles before allowing modifications
- Sensitive config (API keys) handled via Firebase config or environment variables</content>
<parameter name="filePath">c:\Users\MersinAkpinar\Documents\balkantvpanel\.github\copilot-instructions.md