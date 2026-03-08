'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Loader2 } from 'lucide-react';
import { submitReview } from '@/lib/actions/event-lifecycle';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EventReviewFormProps {
  eventId: string;
}

export function EventReviewForm({ eventId }: EventReviewFormProps) {
  const t = useTranslations('events.detail');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (rating === 0) return;
    setLoading(true);

    const result = await submitReview(eventId, rating, comment.trim() || undefined);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('reviewSubmitted'));
      setSubmitted(true);
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-muted-foreground">{t('thanksReview')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('writeReview')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
            >
              <Star
                className={cn(
                  'h-6 w-6 transition-colors',
                  (hoverRating || rating) >= star
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground',
                )}
              />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={t('reviewPlaceholder')}
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        />
        <Button onClick={handleSubmit} disabled={rating === 0 || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('writeReview')}
        </Button>
      </CardContent>
    </Card>
  );
}
