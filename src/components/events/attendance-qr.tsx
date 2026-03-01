'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface AttendanceQRProps {
  eventId: string;
  privateToken?: string | null;
}

export function AttendanceQR({ eventId, privateToken }: AttendanceQRProps) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL;
  const confirmUrl = `${baseUrl}/confirm-attendance/${eventId}${privateToken ? `?token=${privateToken}` : ''}`;

  function downloadQR() {
    const svg = document.getElementById('attendance-qr');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 512, 512);
      const a = document.createElement('a');
      a.download = `event-${eventId}-qr.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Attendance QR Code</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <QRCodeSVG
          id="attendance-qr"
          value={confirmUrl}
          size={200}
          level="H"
          includeMargin
        />
        <p className="text-muted-foreground text-center text-xs">
          Participants scan this code at the event to confirm attendance.
        </p>
        <Button variant="outline" size="sm" onClick={downloadQR} className="gap-2">
          <Download className="h-4 w-4" />
          Download QR
        </Button>
      </CardContent>
    </Card>
  );
}
