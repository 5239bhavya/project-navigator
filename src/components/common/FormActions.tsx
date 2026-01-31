import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Save, Check, RefreshCcw, Archive, X } from 'lucide-react';

interface FormActionsProps {
  mode: 'create' | 'edit' | 'view';
  status?: 'draft' | 'confirmed' | 'revised' | 'archived';
  onSave?: () => void;
  onConfirm?: () => void;
  onRevise?: () => void;
  onArchive?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  canConfirm?: boolean;
  canRevise?: boolean;
  canArchive?: boolean;
}

export function FormActions({
  mode,
  status = 'draft',
  onSave,
  onConfirm,
  onRevise,
  onArchive,
  onCancel,
  isLoading = false,
  canConfirm = true,
  canRevise = true,
  canArchive = true,
}: FormActionsProps) {
  const navigate = useNavigate();

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1);
    }
  };

  const isArchived = status === 'archived';

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
      {/* Save Button - shown in create/edit mode for draft status */}
      {(mode === 'create' || (mode === 'edit' && status === 'draft')) && (
        <Button onClick={onSave} disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      )}

      {/* Confirm Button - shown for draft status */}
      {status === 'draft' && canConfirm && onConfirm && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="secondary" disabled={isLoading}>
              <Check className="mr-2 h-4 w-4" />
              Confirm
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm this record?</AlertDialogTitle>
              <AlertDialogDescription>
                This will change the status to Confirmed. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Revise Button - shown for confirmed status */}
      {status === 'confirmed' && canRevise && onRevise && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={isLoading}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Revise
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create a revision?</AlertDialogTitle>
              <AlertDialogDescription>
                This will create a new revision of this record. The current version will
                be marked as revised.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onRevise}>Create Revision</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Archive Button - not shown for archived records */}
      {!isArchived && canArchive && onArchive && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={isLoading}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive this record?</AlertDialogTitle>
              <AlertDialogDescription>
                Archived records are read-only and cannot be edited or restored.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onArchive}>Archive</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Cancel Button */}
      <Button variant="ghost" onClick={handleCancel} disabled={isLoading}>
        <X className="mr-2 h-4 w-4" />
        Cancel
      </Button>
    </div>
  );
}
