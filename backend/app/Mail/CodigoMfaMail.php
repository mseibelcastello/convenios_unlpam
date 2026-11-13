<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

// Mail con el código de 6 dígitos del segundo paso del login
class CodigoMfaMail extends Mailable
{
    public function __construct(
        public string $nombre,
        public string $codigo,
        public int $minutos,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Tu código de acceso - Convenios UNLPam');
    }

    public function content(): Content
    {
        // Versión con diseño y versión en texto plano (para programas de correo que no muestran HTML)
        return new Content(
            view: 'emails.codigo-mfa',
            text: 'emails.codigo-mfa-texto',
        );
    }
}
