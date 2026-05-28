import { Button } from '@/components/ui/button';
import { Pencil, Shield, Trash2 } from 'lucide-react';

type AdminRowActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  onGrantRole?: () => void;
  grantRoleLabel?: string;
};

export default function AdminRowActions({
  onEdit,
  onDelete,
  onGrantRole,
  grantRoleLabel = 'Gán quyền',
}: AdminRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onGrantRole ? (
        <Button type="button" variant="outline" size="sm" onClick={onGrantRole}>
          <Shield className="size-3.5 mr-1" />
          {grantRoleLabel}
        </Button>
      ) : null}
      {onEdit ? (
        <Button type="button" variant="ghost" size="icon" aria-label="Sửa" onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
      ) : null}
      {onDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Xóa"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
