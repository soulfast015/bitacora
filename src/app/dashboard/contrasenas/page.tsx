"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Search, Check, Eye, EyeOff } from "lucide-react";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: { name: string };
}

export default function ContraseñasPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const permissions = session?.user?.permissions || [];

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authStatus === "unauthenticated") router.push("/login");
  }, [authStatus, router]);

  useEffect(() => {
    if (session) {
      if (!permissions.includes("cambiar_contraseñas")) {
        router.push("/dashboard");
        return;
      }
      fetchUsers();
    }
  }, [session, permissions, router, fetchUsers]);

  const handleChangePassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: "error", text: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }

    setSubmitting(true);
    const res = await fetch(`/api/users/${userId}/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });

    if (res.ok) {
      setMessage({ type: "success", text: "Contraseña actualizada exitosamente" });
      setNewPassword("");
      setSelectedUser(null);
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Error al cambiar la contraseña" });
    }
    setSubmitting(false);

    setTimeout(() => setMessage(null), 3000);
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-primary text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
          <KeyRound className="w-8 h-8" />
          Gestión de Contraseñas
        </h1>
        <p className="text-muted mt-1">Cambiar contraseñas de usuarios del sistema</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg border-2 text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="card">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar usuario por nombre o email..."
            className="input-field pl-10"
          />
        </div>

        <div className="space-y-3">
          {filtered.map((user) => (
            <div
              key={user.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedUser === user.id
                  ? "border-primary bg-amber-50"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-white font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-muted">{user.email}</p>
                  </div>
                  <span className="badge bg-gray-100 text-gray-700 border-gray-300 ml-2">
                    {user.role.name}
                  </span>
                </div>

                {selectedUser === user.id ? (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nueva contraseña"
                        className="input-field pr-10 w-48"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      onClick={() => handleChangePassword(user.id)}
                      disabled={submitting}
                      className="btn-primary flex items-center gap-1 text-sm"
                    >
                      <Check className="w-4 h-4" />
                      {submitting ? "..." : "Guardar"}
                    </button>
                    <button
                      onClick={() => { setSelectedUser(null); setNewPassword(""); }}
                      className="btn-secondary text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setSelectedUser(user.id); setNewPassword(""); }}
                    className="btn-secondary text-sm flex items-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    Cambiar Contraseña
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
