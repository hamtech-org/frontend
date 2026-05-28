import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import AdminFormDialog from '@/components/admin/AdminFormDialog';
import AdminRowActions from '@/components/admin/AdminRowActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AdminUserListItem, UserRole } from '@/types/adminCrud.types';
import {
  useCreateAdminUserMutation,
  useDeleteAdminUserMutation,
  useListAdminUsersQuery,
  useUpdateAdminUserMutation,
  useUpdateAdminUserRoleMutation,
} from '@/store/api/adminApi';
import { Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserListItem | null>(null);
  const [roleUser, setRoleUser] = useState<AdminUserListItem | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUserListItem | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [grantRole, setGrantRole] = useState<UserRole>('user');

  const listQuery = {
    query: search.trim() || undefined,
    role: roleFilter === 'all' ? undefined : roleFilter,
    limit: 50,
  };

  const { data, isLoading, isError, refetch } = useListAdminUsersQuery(listQuery);
  const [createUser, { isLoading: creating }] = useCreateAdminUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateAdminUserMutation();
  const [updateRole, { isLoading: updatingRole }] = useUpdateAdminUserRoleMutation();
  const [removeUser, { isLoading: deleting }] = useDeleteAdminUserMutation();

  const users = data?.data.items ?? [];
  const adminCount = useMemo(() => users.filter((u) => u.role === 'admin').length, [users]);

  const resetCreateForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setRole('user');
  };

  const openEdit = (user: AdminUserListItem) => {
    setEditUser(user);
    setEditDisplayName(user.displayName);
    setEditEmail(user.email);
    setEditAvatar(user.avatar ?? '');
  };

  const openRole = (user: AdminUserListItem) => {
    setRoleUser(user);
    setGrantRole(user.role);
  };

  const handleCreate = async () => {
    try {
      await createUser({ email, password, displayName, role }).unwrap();
      toast.success('Đã tạo người dùng');
      setCreateOpen(false);
      resetCreateForm();
    } catch {
      toast.error('Không thể tạo người dùng');
    }
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    try {
      await updateUser({
        userId: editUser.userId,
        body: {
          displayName: editDisplayName,
          email: editEmail,
          avatar: editAvatar.trim() ? editAvatar.trim() : null,
        },
      }).unwrap();
      toast.success('Đã cập nhật');
      setEditUser(null);
    } catch {
      toast.error('Không thể cập nhật');
    }
  };

  const handleRole = async () => {
    if (!roleUser) return;
    try {
      await updateRole({ userId: roleUser.userId, role: grantRole }).unwrap();
      toast.success('Đã cập nhật quyền');
      setRoleUser(null);
    } catch {
      toast.error('Không thể gán quyền (có thể là tài khoản đang đăng nhập)');
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      await removeUser(deleteUser.userId).unwrap();
      toast.success('Đã xóa người dùng');
      setDeleteUser(null);
    } catch {
      toast.error('Không thể xóa (có thể là tài khoản đang đăng nhập)');
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight">
            Quản lý người dùng
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            CRUD người dùng · đăng nhập admin: <code>admin@hamtech.local</code> /{' '}
            <code>Test@1234</code>
          </p>
        </div>
        <Button className="rounded-xl" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-2" />
          Tạo người dùng
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tổng (trang)
          </p>
          <p className="mt-2 text-2xl font-display font-bold tabular-nums">{users.length}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin</p>
          <p className="mt-2 text-2xl font-display font-bold tabular-nums">{adminCount}</p>
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm email, tên, userId…"
            className="w-full rounded-xl pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as 'all' | UserRole)}>
          <SelectTrigger className="w-full rounded-xl sm:w-[180px]">
            <SelectValue placeholder="Vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi vai trò</SelectItem>
            <SelectItem value="admin">admin</SelectItem>
            <SelectItem value="user">user</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="rounded-xl" onClick={() => refetch()}>
          Tải lại
        </Button>
      </div>

      <Card className="glass-card border-none shadow-lg">
        <CardHeader>
          <CardTitle>Danh sách người dùng</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải…</p>
          ) : isError ? (
            <p className="text-sm text-destructive">Không tải được dữ liệu.</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-4">Tên</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Vai trò</th>
                  <th className="py-2 pr-4">Trạng thái</th>
                  <th className="py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr key={row.userId} className="border-b border-border/40">
                    <td className="py-3 pr-4 font-medium">{row.displayName}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{row.email}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={row.role === 'admin' ? 'default' : 'secondary'}>
                        {row.role}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">{row.status}</td>
                    <td className="py-3">
                      <AdminRowActions
                        onEdit={() => openEdit(row)}
                        onGrantRole={() => openRole(row)}
                        grantRoleLabel="Gán quyền admin"
                        onDelete={() => setDeleteUser(row)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <AdminFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Tạo người dùng"
        submitLabel="Tạo"
        loading={creating}
        onSubmit={handleCreate}
      >
        <div className="space-y-2">
          <Label htmlFor="cu-email">Email</Label>
          <Input id="cu-email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cu-pass">Mật khẩu</Label>
          <Input
            id="cu-pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cu-name">Tên hiển thị</Label>
          <Input
            id="cu-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Vai trò</Label>
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">user</SelectItem>
              <SelectItem value="admin">admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminFormDialog>

      <AdminFormDialog
        open={!!editUser}
        onOpenChange={(o) => !o && setEditUser(null)}
        title="Sửa người dùng"
        loading={updating}
        onSubmit={handleUpdate}
      >
        <div className="space-y-2">
          <Label>Tên hiển thị</Label>
          <Input value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Avatar URL</Label>
          <Input value={editAvatar} onChange={(e) => setEditAvatar(e.target.value)} />
        </div>
      </AdminFormDialog>

      <AdminFormDialog
        open={!!roleUser}
        onOpenChange={(o) => !o && setRoleUser(null)}
        title="Gán quyền"
        submitLabel="Lưu quyền"
        loading={updatingRole}
        onSubmit={handleRole}
      >
        <p className="text-sm text-muted-foreground">
          {roleUser?.displayName} ({roleUser?.email})
        </p>
        <Select value={grantRole} onValueChange={(v) => setGrantRole(v as UserRole)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">user</SelectItem>
            <SelectItem value="admin">admin</SelectItem>
          </SelectContent>
        </Select>
      </AdminFormDialog>

      <AdminConfirmDialog
        open={!!deleteUser}
        onOpenChange={(o) => !o && setDeleteUser(null)}
        title="Xóa người dùng?"
        description={`Xóa mềm ${deleteUser?.displayName}. Phiên đăng nhập sẽ bị thu hồi.`}
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
