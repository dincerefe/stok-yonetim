// Dosya Yolu: src/components/ManagerUserTable.tsx
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { User, UserPermission, Role } from "@prisma/client";
import toast from "react-hot-toast";

type UserWithPermissions = User & { permission: UserPermission | null };

export default function ManagerUserTable() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);

  // Veri çekme ve güncelleme fonksiyonları
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/manager/users");
      if (!response.ok) {
        throw new Error("Kullanıcılar getirilemedi.");
      }
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === "MANAGER") {
      fetchUsers();
    }
  }, [session]);

  const handleUpdate = async (userId: string, data: Partial<{ role: Role } & UserPermission>) => {
    const originalUsers = [...users];
    
    const updatedUsers = users.map(u => 
        u.id === userId ? { ...u, ...data, permission: { ...u.permission, ...data } as UserPermission } : u
    );
    setUsers(updatedUsers);

    try {
      const response = await fetch(`/api/manager/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error("Kullanıcı güncellenemedi.");
      }
      toast.success('Kullanıcı güncellendi!');
    } catch (error) {
      setUsers(originalUsers);
      toast.error((error as Error).message);
    }
  };

  // Yetkileri ve etiketlerini dinamik olarak yönetmek için
  const permissionKeys: (keyof Omit<UserPermission, 'id' | 'userId'>)[] = [
    'canAccessDashboard',
    'canAddStock',
    'canRemoveStock',
    'canDeleteStock',
    'canSeeCost',
    'canSeeProfit',
    'canSeeLogs',
    'canSeeMovementsPage'
  ];

  const permissionLabels: Record<typeof permissionKeys[number], string> = {
    canAccessDashboard: 'Dashboard',
    canAddStock: 'Stok Ekle',
    canRemoveStock: 'Stok Çıkar',
    canDeleteStock: 'Stok Sil',
    canSeeCost: 'Maliyet Gör',
    canSeeProfit: 'Kâr Gör',
    canSeeLogs: 'Logları Gör',
    canSeeMovementsPage: 'Hrk. Sayfası'
  };

  if (loading) return <div>Kullanıcılar yükleniyor...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg shadow text-sm">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-3 text-left font-semibold text-gray-700">Kullanıcı</th>
            <th className="p-3 text-left font-semibold text-gray-700">Rol</th>
            {/* DÜZELTME: Başlıklar artık dikey değil, yatay ve daha okunaklı */}
            {permissionKeys.map(key => (
              <th key={key} className="p-2 text-center font-semibold text-gray-600 whitespace-nowrap">
                {permissionLabels[key]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b hover:bg-gray-50">
              <td className="p-3">{user.name} ({user.email})</td>
              <td className="p-3">
                <select 
                  value={user.role}
                  onChange={(e) => handleUpdate(user.id, { role: e.target.value as Role })}
                  disabled={user.id === session?.user.id}
                  className="p-1 border rounded"
                >
                  <option value="USER">User</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </td>
              {/* Checkbox'ları dinamik olarak oluştur */}
              {permissionKeys.map((permKey) => (
                 <td key={permKey} className="p-3 text-center">
                   <input
                     type="checkbox"
                     checked={!!user.permission?.[permKey]}
                     onChange={(e) => handleUpdate(user.id, { [permKey]: e.target.checked })}
                     className="w-5 h-5 accent-blue-600"
                   />
                 </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
