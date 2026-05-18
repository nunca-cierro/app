# RBAC Route Matrix

Single source reference for dashboard route authorization behavior.
Referencia única para el comportamiento de autorización de rutas del dashboard.

## Allowed routes by role

| Role           | Allowed routes              |
| -------------- | --------------------------- |
| `admin`        | `/dashboard`, `/auth/login` |
| `basic`        | `/dashboard`, `/auth/login` |
| `professional` | `/dashboard`, `/auth/login` |
| `enterprise`   | `/dashboard`, `/auth/login` |

> The matrix will grow as new dashboard sections are added (e.g. `/dashboard/businesses`, `/dashboard/leads`, `/dashboard/settings`).

## Deny behavior

- Any route outside the matrix is denied for the user's role.
- The user is redirected to their role landing route (`/dashboard`) with `?reason=unauthorized`.
- Protected content is not rendered for denied routes.

## Offline / Demo mode

When `NEXT_PUBLIC_AUTH_DISABLED=true`, the RBAC guards are completely bypassed and the dashboard is freely accessible. The guards activate automatically when the flag is removed or set to `false`.
