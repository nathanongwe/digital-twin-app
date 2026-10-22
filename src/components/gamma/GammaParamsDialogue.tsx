import React, { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GammaParams } from './gammaMath';
import { GammaChart } from './GammaChart';
import { GammaControls } from './GammaControls';

export type { GammaParams };

interface GammaParamsDialogProps {
  value: GammaParams;
  onApply: (next: GammaParams) => void;
}

export default function GammaParamsDialog({
  value,
  onApply,
}: GammaParamsDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<GammaParams>(value);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraft(value);
    }
    setOpen(nextOpen);
  };

  const handleApply = () => {
    onApply(draft);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Onset to Randomisation Distribution (t_psi)</DialogTitle>
          <DialogDescription>
            Adjust the Gamma distribution shape, rate, and optional recruitment cutoff
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-5 py-1 md:grid-cols-12">
          <GammaChart
            params={draft}
            isOpen={open}
            onCutoffDrag={(nextMax) => setDraft((d) => ({ ...d, max: nextMax }))}
          />
          <GammaControls
            value={draft}
            onChange={setDraft}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApply}>
            Apply Parameters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}