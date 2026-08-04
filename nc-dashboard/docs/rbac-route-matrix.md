# RBAC Route Matrix

Single source reference for dashboard route authorization behavior.
Referencia única para el comportamiento de autorización de rutas del dashboard.

## Allowed routes by role

Source of truth: `nc-dashboard/lib/rbac.ts` (`ROLE_ROUTE_MATRIX` + `isRouteAllowed`). The `/dashboard` home and `/auth/login` are allowed for every authenticated role; section routes are role-scoped:

| Role           | Allowed routes                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| `superadmin`   | `/dashboard`, `/dashboard/admin`, `/dashboard/tenants`, `/dashboard/agents`, `/dashboard/platforms`, `/dashboard/conversations` |
| `admin`        | `/dashboard`, `/dashboard/tenants`, `/dashboard/agents`, `/dashboard/platforms`, `/dashboard/conversations` |
| `agent`        | `/dashboard`, `/dashboard/conversations`                                                                    |
| `client`       | `/dashboard`, `/dashboard/conversations`                                                                    |

> New dashboard sections must be added to `ROLE_ROUTE_MATRIX` in `lib/rbac.ts` and mirrored here.

## Deny behavior

- Any route outside the matrix is denied for the user's role.
- The user is redirected to their role landing route (`/dashboard`) with `?reason=unauthorized`.
- Protected content is not rendered for denied routes.

## Offline / Demo mode

When `NEXT_PUBLIC_AUTH_DISABLED=true`, the RBAC guards are completely bypassed and the dashboard is freely accessible. The guards activate automatically when the flag is removed or set to `false`.
