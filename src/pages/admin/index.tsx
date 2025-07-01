import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { signOut } from 'next-auth/react';
import { Company, User, Role } from '@prisma/client';
import Modal from '@/components/Modal';

type CompanyWithUserCount = Company & { _count: { users: number } };
type UserWithCompany = User & { company: Company | null };

export default function AdminPage() {
    const [companies, setCompanies] = useState<CompanyWithUserCount[]>([]);
    const [users, setUsers] = useState<UserWithCompany[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Modal state'leri
    const [selectedUser, setSelectedUser] = useState<UserWithCompany | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalCompanyId, setModalCompanyId] = useState<string | null>(null);
    const [modalRole, setModalRole] = useState<Role>('USER');

    const { register, handleSubmit, reset } = useForm<{ name: string }>();

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [companiesRes, usersRes] = await Promise.all([
                fetch('/api/admin/companies'),
                fetch('/api/admin/users')
            ]);
            setCompanies(await companiesRes.json());
            setUsers(await usersRes.json());
        } catch (error) {
            toast.error("Veriler yüklenirken bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateCompany = async (data: { name: string }) => {
        await toast.promise(
            fetch('/api/admin/companies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            }).then(res => {
                if (!res.ok) throw new Error('Şirket oluşturulamadı.');
                reset();
                fetchData();
            }),
            {
                loading: 'Şirket oluşturuluyor...',
                success: 'Şirket başarıyla oluşturuldu!',
                error: 'Bir hata oluştu.',
            }
        );
    };
    
    const handleUpdateUser = async () => {
        if (!selectedUser) return;
    
        const payload = {
            userId: selectedUser.id,
            companyId: modalCompanyId,
            role: modalRole,
        };
        
        await toast.promise(
             fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
             }).then(res => {
                 if (!res.ok) return res.json().then(err => { throw new Error(err.message || 'Güncelleme başarısız oldu') });
                 fetchData();
                 setIsModalOpen(false);
             }),
            { 
                loading: 'Kullanıcı güncelleniyor...', 
                success: 'Kullanıcı güncellendi!', 
                error: (err) => `Hata: ${err.message}` 
            }
        );
    }

    if (isLoading) return <div className="p-8">Yükleniyor...</div>;

    return (
        <div className="bg-gray-100 min-h-screen p-8">
            <header className="flex justify-between items-center mb-10">
                <h1 className="text-4xl font-bold text-gray-800">Admin Paneli</h1>
                <button onClick={() => signOut({ callbackUrl: '/' })} className="bg-red-500 text-white px-4 py-2 rounded-lg shadow hover:bg-red-600">Çıkış Yap</button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Şirket Yönetimi */}
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-semibold mb-4">Şirket Yönetimi</h2>
                    <form onSubmit={handleSubmit(handleCreateCompany)} className="flex gap-2 mb-4">
                        <input {...register('name')} placeholder="Yeni Şirket Adı" className="flex-grow p-2 border rounded-lg"/>
                        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">Oluştur</button>
                    </form>
                    <ul className="space-y-2">
                        {companies.map(c => (
                            <li key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span>{c.name} ({c._count.users} kullanıcı)</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Kullanıcı Yönetimi */}
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-semibold mb-4">Kullanıcı Atama</h2>
                    <ul className="space-y-2">
                        {users.map(u => (
                            <li key={u.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-semibold">{u.name} <span className="text-xs font-mono bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">{u.role}</span></p>
                                    <p className="text-sm text-gray-600">{u.company ? u.company.name : 'Atanmamış'}</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        setSelectedUser(u);
                                        setModalCompanyId(u.companyId || null);
                                        setModalRole(u.role);
                                        setIsModalOpen(true);
                                    }} 
                                    className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600"
                                >
                                    Yönet
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Kullanıcıyı Yönet: ${selectedUser?.name}`}>
                 <div className="space-y-4">
                     <div>
                        <label htmlFor="company-select" className="block text-sm font-medium text-gray-700">Şirket Ata</label>
                         <select 
                            id="company-select"
                            value={modalCompanyId || ''}
                            onChange={(e) => setModalCompanyId(e.target.value || null)}
                            className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm"
                         >
                             <option value="">Şirketten Çıkar (Atanmamış)</option>
                             {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                     </div>
                     <div>
                         <label htmlFor="role-select" className="block text-sm font-medium text-gray-700">Rol Ata</label>
                         <select
                            id="role-select"
                            value={modalRole}
                            onChange={(e) => setModalRole(e.target.value as Role)}
                            className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm"
                         >
                             <option value="USER">Kullanıcı (User)</option>
                             <option value="MANAGER">Yönetici (Manager)</option>
                         </select>
                     </div>
                     <div className="flex justify-end pt-4 space-x-3">
                         <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                         >
                            İptal
                         </button>
                         <button
                            type="button"
                            onClick={handleUpdateUser}
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                         >
                            Değişiklikleri Kaydet
                         </button>
                     </div>
                 </div>
            </Modal>
        </div>
    );
}