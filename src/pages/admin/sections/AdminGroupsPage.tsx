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
import { searchService } from '@/services/search.service';
import type { AdminGroupListItem, GroupAdminStatus } from '@/types/adminCrud.types';
import {
  useCreateAdminGroupMutation,
  useDeleteAdminGroupMutation,
  useListAdminGroupsQuery,
  useUpdateAdminGroupMutation,
} from '@/store/api/adminApi';
import { Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

type GroupStatusFilter = 'all' | GroupAdminStatus;

export default function AdminGroupsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<GroupStatusFilter>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<AdminGroupListItem | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<AdminGroupListItem | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerQuery, setOwnerQuery] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [ownerLabel, setOwnerLabel] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<GroupAdminStatus>('active');

  const listQuery = {
    query: search.trim() || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 50,
  };

  const { data, isLoading, isError, refetch } = useListAdminGroupsQuery(listQuery);
  const [createGroup, { isLoading: creating }] = useCreateAdminGroupMutation();
  const [updateGroup, { isLoading: updating }] = useUpdateAdminGroupMutation();
  const [removeGroup, { isLoading: deleting }] = useDeleteAdminGroupMutation();

  const groups = data?.data.items ?? [];
  const activeCount = useMemo(() => groups.filter((g) => g.status === 'active').length, [groups]);

  useEffect(() => {
    const q = ownerQuery.trim();
    if (q.length < 2) return;
    const t = window.setTimeout(() => {
      void searchService.searchUsers({ q, pageSize: 8 }).then((res) => {
        const first = res?.items?.[0];
        if (first) {
          setOwnerId(first.userId);
          setOwnerLabel(first.displayName);
        }
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [ownerQuery]);

  const openEdit = (group: AdminGroupListItem) => {
    setEditGroup(group);
    setEditName(group.name);
    setEditDescription(group.description ?? '');
    setEditStatus(group.status);
  };

  const handleCreate = async () => {
    if (!ownerId) {
      toast.error('Chọn chủ nhóm (gõ tên rồi chọn từ kết quả tìm kiếm)');
      return;
    }
    try {
      await createGroup({ name, description: description || undefined, ownerId }).unwrap();
      toast.success('Đã tạo nhóm');
      setCreateOpen(false);
      setName('');
      setDescription('');
      setOwnerQuery('');
      setOwnerId('');
      setOwnerLabel('');
    } catch {
      toast.error('Không thể tạo nhóm');
    }
  };

  const handleUpdate = async () => {
    if (!editGroup) return;
    try {
      await updateGroup({
        groupId: editGroup.groupId,
        body: { name: editName, description: editDescription, status: editStatus },
      }).unwrap();
      toast.success('Đã cập nhật nhóm');
      setEditGroup(null);
    } catch {
      toast.error('Không thể cập nhật');
    }
  };

  const handleDelete = async () => {
    if (!deleteGroup) return;
    try {
      await removeGroup(deleteGroup.groupId).unwrap();
      toast.success('Đã giải tán nhóm');
      setDeleteGroup(null);
    } catch {
      toast.error('Không thể xóa nhóm');
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight">Quản lý nhóm</h1>
          <p className="text-sm text-muted-foreground mt-1">CRUD nhóm chat</p>
        </div>
        <Button className="rounded-xl" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-2" />
          Tạo nhóm
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tổng (trang)
          </p>
          <p className="mt-2 text-2xl font-display font-bold tabular-nums">{groups.length}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Đang hoạt động
          </p>
          <p className="mt-2 text-2xl font-display font-bold tabular-nums">{activeCount}</p>
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên nhóm, groupId…"
            className="w-full rounded-xl pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as GroupStatusFilter)}>
          <SelectTrigger className="w-full rounded-xl sm:w-[200px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            <SelectItem value="active">active</SelectItem>
            <SelectItem value="locked">locked</SelectItem>
            <SelectItem value="archived">archived</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="rounded-xl" onClick={() => refetch()}>
          Tải lại
        </Button>
      </div>

      <Card className="glass-card border-none shadow-lg">
        <CardHeader>
          <CardTitle>Danh sách nhóm</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải…</p>
          ) : isError ? (
            <p className="text-sm text-destructive">Không tải được dữ liệu.</p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-4">Tên</th>
                  <th className="py-2 pr-4">Chủ nhóm</th>
                  <th className="py-2 pr-4">Thành viên</th>
                  <th className="py-2 pr-4">Trạng thái</th>
                  <th className="py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((row) => (
                  <tr key={row.groupId} className="border-b border-border/40">
                    <td className="py-3 pr-4 font-medium">{row.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {row.ownerDisplayName ?? row.ownerId}
                    </td>
                    <td className="py-3 pr-4">{row.memberCount}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline">{row.status}</Badge>
                    </td>
                    <td className="py-3">
                      <AdminRowActions
                        onEdit={() => openEdit(row)}
                        onDelete={() => setDeleteGroup(row)}
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
        title="Tạo nhóm"
        submitLabel="Tạo"
        loading={creating}
        onSubmit={handleCreate}
      >
        <div className="space-y-2">
          <Label>Tên nhóm</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Mô tả</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Chủ nhóm (tìm kiếm)</Label>
          <Input
            value={ownerQuery}
            onChange={(e) => setOwnerQuery(e.target.value)}
            placeholder="Gõ tên hoặc email…"
          />
          {ownerId ? (
            <p className="text-xs text-muted-foreground">
              Đã chọn: {ownerLabel || ownerId} ({ownerId})
            </p>
          ) : null}
        </div>
      </AdminFormDialog>

      <AdminFormDialog
        open={!!editGroup}
        onOpenChange={(o) => !o && setEditGroup(null)}
        title="Sửa nhóm"
        loading={updating}
        onSubmit={handleUpdate}
      >
        <div className="space-y-2">
          <Label>Tên</Label>
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Mô tả</Label>
          <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Trạng thái</Label>
          <Select value={editStatus} onValueChange={(v) => setEditStatus(v as GroupAdminStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">active</SelectItem>
              <SelectItem value="locked">locked</SelectItem>
              <SelectItem value="archived">archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminFormDialog>

      <AdminConfirmDialog
        open={!!deleteGroup}
        onOpenChange={(o) => !o && setDeleteGroup(null)}
        title="Giải tán nhóm?"
        description={`Nhóm "${deleteGroup?.name}" sẽ bị giải tán và thành viên nhận sự kiện realtime.`}
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
