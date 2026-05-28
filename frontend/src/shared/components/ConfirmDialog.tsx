import type { ReactNode } from 'react';
import { AlertDialog, Button } from '@heroui/react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  onConfirm: () => void;
  confirmLabel: string;
  cancelLabel: string;
  isPending?: boolean;
  variant?: 'primary' | 'danger';
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel,
  cancelLabel,
  isPending = false,
  variant = 'primary',
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialog.Backdrop
        isOpen={isOpen}
        isDismissable={!isPending}
        onOpenChange={onOpenChange}
      >
        <AlertDialog.Container size="sm">
          <AlertDialog.Dialog>
            {({ close }) => (
              <>
                <AlertDialog.Header>
                  <AlertDialog.Heading className="text-lg font-semibold text-foreground">
                    {title}
                  </AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body className="py-2">
                  <div className="text-sm text-default-600 leading-relaxed">
                    {description}
                  </div>
                </AlertDialog.Body>
                <AlertDialog.Footer className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    isDisabled={isPending}
                    onPress={close}
                  >
                    {cancelLabel}
                  </Button>
                  <Button
                    type="button"
                    variant={variant === 'danger' ? 'danger' : 'primary'}
                    size="sm"
                    isDisabled={isPending}
                    isPending={isPending}
                    onPress={() => {
                      onConfirm();
                      // Handled by caller's pending state, but let's trigger close if instant
                      if (!isPending) close();
                    }}
                  >
                    {confirmLabel}
                  </Button>
                </AlertDialog.Footer>
              </>
            )}
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
