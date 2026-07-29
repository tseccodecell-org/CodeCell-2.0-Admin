// all api calls go through next.config.ts rewrites to the go backend (:8000) —
// nothing in this app talks to the judge engine directly.
// auth is an HttpOnly admin_jwt_token cookie set by POST /admin/login, so there
// is no token for this app to hold. see lib/auth.ts
export {}
