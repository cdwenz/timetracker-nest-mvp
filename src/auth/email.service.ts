import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  constructor(private config: ConfigService) {}

  async sendPasswordReset(email: string, link: string) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      // Modo DEV: mostrar en logs
      console.log('[DEV] Reset link for', email, link);
      return;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TimeTracker <no-reply@your-domain>',
        to: email,
        subject: 'Restablecer contraseña',
        html: `<p>Para restablecer tu contraseña hacé clic <a href="${link}">aquí</a>. Este enlace vence en 15 minutos.</p>`,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('Error enviando email (Resend):', txt);
    }
  }
}
