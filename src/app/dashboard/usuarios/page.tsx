"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, X, Shield, KeyRound, Trash2, Check } from "lucide-react";

interface Role {
  id: string;
  name: string;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  roleId: string;
  role: Role;
  createdAt: string;
}

export default function UsuariosPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [usersList, setUsersList] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState<UserData | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [form, setForm] = useState({ email: "", name: "", password: "", roleId: "" });
  const [error, setError] = useState("");

  const permissions = session?.user?.permissions || [];
  const isAdmin = session?.user?.role === "administrador";

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsersList(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  useEffect(() => {
    if (session) {
      if (!permissions.includes("ver_usuarios")) {
        router.push("/dashboard");
        return;
      }
      fetchUsers();
      fetch("/api/roles")
        .then((r) => r.json())
        .then((data) => setRoles(Array.isArray(data) ? data : []));
    }
  }, [session, permissions, router, fetchUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error al crear usuario");
      return;
    }

    setShowModal(false);
    setForm({ email: "", name: "", password: "", roleId: "" });
    fetchUsers();
  };

  const openPasswordModal = (user: UserData) => {
    setPasswordUser(user);
    setNewPassword("");
    setPasswordMsg("");
    setShowPasswordModal(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;
    setPasswordMsg("");

    const res = await fetch(`/api/users/${passwordUser.id}/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });

    if (res.ok) {
      setPasswordMsg("ok");
      setTimeout(() => setShowPasswordModal(false), 1500);
    } else {
      const data = await res.json();
      setPasswordMsg(data.error || "Error al cambiar contraseña");
    }
  };

  const handleDeleteUser = async (user: UserData) => {
    if (user.id === session?.user?.id) {
      alert("No puedes eliminarte a ti mismo");
      return;
    }
    if (!confirm(`¿Estás seguro de eliminar al usuario "${user.name}"? Esta acción no se puede deshacer.`)) return;

    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    if (res.ok) {
      fetchUsers();
    } else {
      const data = await res.json();
      alert(data.error || "Error al eliminar usuario");
    }
  };

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-primary text-lg">Cargando...</div>
      </div>
    );
  }

  const roleBadgeColor: Record<string, string> = {
    administrador: "bg-red-100 text-red-800 border-red-300",
    tecnico: "bg-blue-100 text-blue-800 border-blue-300",
    usuario: "bg-green-100 text-green-800 border-green-300",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <Users className="w-8 h-8" />
            Usuarios
          </h1>
          <p className="text-muted mt-1">{usersList.length} usuarios registrados</p>
        </div>
        {permissions.includes("crear_usuarios") && (
          <button
            onClick={() => { setShowModal(true); setError(""); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        )}
      </div>

      <div className="card">
        {usersList.length === 0 ? (
          <p className="text-muted text-center py-12">No hay usuarios registrados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border text-left">
                  <th className="pb-3 font-semibold">Nombre</th>
                  <th className="pb-3 font-semibold">Email</th>
                  <th className="pb-3 font-semibold">Rol</th>
                  <th className="pb-3 font-semibold hidden md:table-cell">Fecha Registro</th>
                  <th className="pb-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {usersList.map((user) => (
                  <tr key={user.id} className="hover:bg-amber-50/50">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-muted">{user.email}</td>
                    <td className="py-3">
                      <span className={`badge ${roleBadgeColor[user.role.name] || "bg-gray-100 text-gray-700 border-gray-300"}`}>
                        <Shield className="w-3 h-3 mr-1" />
                        {user.role.name}
                      </span>
                    </td>
                    <td className="py-3 hidden md:table-cell text-muted">
                      {new Date(user.createdAt).toLocaleDateString("es-MX")}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(permissions.includes("cambiar_contraseñas") || isAdmin) && (
                          <button
                            onClick={() => openPasswordModal(user)}
                            className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors text-primary"
                            title="Cambiar contraseña"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}
                        {(permissions.includes("eliminar_usuarios") || isAdmin) && user.id !== session?.user?.id && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nuevo Usuario */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-card-bg rounded-xl border-2 border-border shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b-2 border-border">
              <h2 className="text-xl font-bold text-primary">Nuevo Usuario</h2>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Contraseña</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Rol</label>
                <select
                  value={form.roleId}
                  onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Seleccionar rol</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">Crear Usuario</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cambiar Contraseña */}
      {showPasswordModal && passwordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPasswordModal(false)} />
          <div className="relative bg-card-bg rounded-xl border-2 border-border shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b-2 border-border">
              <h2 className="text-lg font-bold text-primary">Cambiar Contraseña</h2>
              <button onClick={() => setShowPasswordModal(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            {passwordMsg === "ok" ? (
              <div className="p-8 text-center space-y-3">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full">
                  <Check className="w-7 h-7 text-green-600" />
                </div>
                <p className="font-semibold text-green-700">Contraseña actualizada</p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                <p className="text-sm text-muted">
                  Usuario: <strong>{passwordUser.name}</strong> ({passwordUser.email})
                </p>
                {passwordMsg && (
                  <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg text-red-700 text-sm">
                    {passwordMsg}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Nueva Contraseña</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-primary flex-1">Cambiar</button>
                  <button type="button" onClick={() => setShowPasswordModal(false)} className="btn-secondary">
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
