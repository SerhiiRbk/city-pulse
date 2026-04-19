'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Check, Download, Link2, QrCode, Share2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ShareButtonProps {
  url?: string;
  title?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
  className?: string;
}

const QR_DOM_ID = 'share-qr-svg';

export function ShareButton({
  url,
  title,
  variant = 'outline',
  size = 'sm',
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const t = useTranslations('common');

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = title || '';

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard permissions denied */
    }
  }

  async function handleNativeShare() {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
      } catch {
        /* user dismissed the share sheet */
      }
    } else {
      await handleCopyLink();
    }
  }

  function downloadQrPng() {
    const svg = document.getElementById(QR_DOM_ID);
    if (!svg) return;

    const serialized = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(svgUrl);
      const a = document.createElement('a');
      const safeName = shareTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'qr-code';
      a.download = `${safeName}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = svgUrl;
  }

  const hasNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} className={className}>
            {copied ? (
              <Check className="mr-1.5 h-4 w-4" />
            ) : (
              <Share2 className="mr-1.5 h-4 w-4" />
            )}
            {copied ? t('copied') : t('share')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {hasNativeShare && (
            <>
              <DropdownMenuItem onClick={handleNativeShare}>
                <Share2 className="mr-2 h-4 w-4" />
                {t('share')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={handleCopyLink}>
            <Link2 className="mr-2 h-4 w-4" />
            {t('copyLink')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setQrOpen(true)}>
            <QrCode className="mr-2 h-4 w-4" />
            {t('showQrCode')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('qrDialogTitle')}</DialogTitle>
            <DialogDescription>{t('qrDialogHelp')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="rounded-2xl border bg-white p-4">
              <QRCodeSVG
                id={QR_DOM_ID}
                value={shareUrl || ' '}
                size={220}
                level="M"
                marginSize={2}
              />
            </div>
            <p className="break-all text-center text-xs text-muted-foreground">{shareUrl}</p>
            <Button variant="outline" size="sm" onClick={downloadQrPng} className="gap-2">
              <Download className="h-4 w-4" />
              {t('downloadQr')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
