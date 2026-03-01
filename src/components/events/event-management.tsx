'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
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
import { Ban, CheckCircle, Copy, Loader2, Send } from 'lucide-react';
import { cancelEvent, completeEvent, duplicateEvent, publishDraft } from '@/lib/actions/event-lifecycle';
import { toast } from 'sonner';

interface EventManagementProps {
  eventId: string;
  status: string;
}

export function EventManagement({ eventId, status }: EventManagementProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(action: 'cancel' | 'complete' | 'duplicate' | 'publish') {
    setLoading(action);
    let result;

    switch (action) {
      case 'cancel':
        result = await cancelEvent(eventId);
        break;
      case 'complete':
        result = await completeEvent(eventId);
        break;
      case 'duplicate':
        result = await duplicateEvent(eventId);
        if (result.event) {
          toast.success('Event duplicated as draft');
          router.push(`/events/${result.event.id}`);
          setLoading(null);
          return;
        }
        break;
      case 'publish':
        result = await publishDraft(eventId);
        break;
    }

    if (result?.error) {
      toast.error(result.error);
    } else if (result?.success) {
      toast.success('Done');
      router.refresh();
    }
    setLoading(null);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === 'draft' && (
        <Button
          size="sm"
          onClick={() => handleAction('publish')}
          disabled={!!loading}
        >
          {loading === 'publish' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
          Publish
        </Button>
      )}

      {status === 'published' && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleAction('complete')}
          disabled={!!loading}
        >
          {loading === 'complete' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1 h-4 w-4" />}
          Mark completed
        </Button>
      )}

      {status === 'published' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive" disabled={!!loading}>
              <Ban className="mr-1 h-4 w-4" />
              Cancel event
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this event?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. All attendees will be notified.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep event</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleAction('cancel')}>
                Yes, cancel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {(status === 'completed' || status === 'published') && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction('duplicate')}
          disabled={!!loading}
        >
          {loading === 'duplicate' ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Copy className="mr-1 h-4 w-4" />}
          Duplicate
        </Button>
      )}
    </div>
  );
}
