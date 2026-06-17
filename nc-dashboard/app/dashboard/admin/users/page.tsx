"use client";

import { useState } from "react";
import { useUsers } from "@/hooks/use-users";
import { useTenants } from "@/hooks/use-tenants";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserCheck, X, Trash2, UserPlus } from "lucide-react";
import type { AdminUser, Tenant } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function AdminUsersPage() {
  const { users, isLoading, error, createUser, assignTenant, deleteUser } =
    useUsers();
  const { tenants } = useTenants();
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  /* ── Create user state ── */
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("client");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!newEmail || !newPassword || !newName) {
      toast.error("Completá todos los campos");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setIsCreating(true);
    try {
      await createUser(newEmail, newPassword, newName, newRole);
      toast.success("Usuario creado");
      setShowCreateDialog(false);
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewRole("client");
    } catch {
      toast.error("Error al crear el usuario");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await deleteUser(userId);
      toast.success("Usuario eliminado");
    } catch {
      toast.error("Error al eliminar el usuario");
    }
  };

  const handleAssign = async (userId: string, tenantId: string, role: string) => {
    try {
      await assignTenant(userId, tenantId, role);
      toast.success("Usuario asignado al negocio correctamente");
      setAssigningUserId(null);
    } catch {
      toast.error("Error al asignar el usuario");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gestiona los usuarios registrados y asígnalos a negocios.
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <UserPlus className="size-4" />
              Crear Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear nuevo usuario</DialogTitle>
              <DialogDescription>
                El usuario podrá iniciar sesión con su email y contraseña.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  placeholder="Ej: Juan Pérez"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="juan@ejemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contraseña</label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rol</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="client">Cliente</option>
                  <option value="agent">Agente</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? "Creando..." : "Crear usuario"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <UsersSkeleton />}
      {error && <ErrorState message={error} />}
      {!isLoading && !error && users.length === 0 && <EmptyState />}
      {!isLoading && !error && users.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                <th className="px-4 py-3 text-left font-medium">Rol</th>
                <th className="px-4 py-3 text-left font-medium">Negocios</th>
                <th className="px-4 py-3 text-left font-medium">Registro</th>
                <th className="px-4 py-3 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  tenants={tenants}
                  isAssigning={assigningUserId === user.id}
                  onStartAssign={() => setAssigningUserId(user.id)}
                  onCancelAssign={() => setAssigningUserId(null)}
                  onAssign={(tenantId, role) =>
                    handleAssign(user.id, tenantId, role)
                  }
                  onDelete={() => handleDelete(user.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  UserRow                                                           */
/* ------------------------------------------------------------------ */

interface UserRowProps {
  user: AdminUser;
  tenants: Tenant[];
  isAssigning: boolean;
  onStartAssign: () => void;
  onCancelAssign: () => void;
  onAssign: (tenantId: string, role: string) => void;
  onDelete: () => void;
}

function UserRow({
  user,
  tenants,
  isAssigning,
  onStartAssign,
  onCancelAssign,
  onAssign,
  onDelete,
}: UserRowProps) {
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [selectedRole, setSelectedRole] = useState("client");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = () => {
    if (!selectedTenantId) {
      toast.error("Seleccioná un negocio");
      return;
    }
    onAssign(selectedTenantId, selectedRole);
  };

  const roleBadgeVariant =
    user.role === "superadmin"
      ? "default"
      : user.role === "admin"
        ? "secondary"
        : "outline";

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-muted/30">
        <td className="px-4 py-3 font-medium">{user.email}</td>
        <td className="px-4 py-3 text-muted-foreground">{user.name}</td>
        <td className="px-4 py-3">
          <Badge variant={roleBadgeVariant}>{user.role}</Badge>
        </td>
        <td className="px-4 py-3">
          {user.tenants.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {user.tenants.map((t) => (
                <Badge key={t.tenant_id} variant="outline" className="text-xs">
                  {t.tenant_name}
                  {t.is_primary && (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      ★
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Sin negocio</span>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {new Date(user.created_at).toLocaleDateString("es-AR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {user.role !== "superadmin" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onStartAssign}
                className="gap-1"
              >
                <UserCheck className="size-3.5" />
                Asignar
              </Button>
            )}

            {/* Delete — with confirmation */}
            {!confirmDelete ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConfirmDelete(true)}
                className="size-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onDelete();
                    setConfirmDelete(false);
                  }}
                  className="h-8 text-xs"
                >
                  Confirmar
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfirmDelete(false)}
                  className="size-8"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* Inline assign form */}
      {isAssigning && (
        <tr className="bg-muted/20">
          <td colSpan={6} className="px-4 py-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Negocio
                </label>
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Rol</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="client">Cliente</option>
                  <option value="agent">Agente</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSubmit}>
                  Guardar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCancelAssign}
                  className="gap-1"
                >
                  <X className="size-3.5" />
                  Cancelar
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  States                                                             */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12">
        <p className="text-muted-foreground text-sm">
          No hay usuarios registrados aún.
        </p>
      </CardContent>
    </Card>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <p className="text-sm text-destructive">{message}</p>
      </CardContent>
    </Card>
  );
}

function UsersSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="py-4">
            <div className="mb-2 h-5 w-64 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
