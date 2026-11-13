<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Tu código de acceso</title>
</head>
<body style="margin:0; padding:0; background-color:#faede8; font-family:Arial, Helvetica, sans-serif; color:#2e1519;">
    <!-- Texto que se ve en la vista previa de la bandeja de entrada -->
    <div style="display:none; max-height:0; overflow:hidden; color:#faede8;">
        Tu código de acceso es {{ $codigo }}. Vale {{ $minutos }} minutos.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faede8;">
        <tr>
            <td align="center" style="padding:24px 12px;">

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#fff8f5; border:1px solid #e3cfc8; border-radius:8px;">

                    <!-- Encabezado -->
                    <tr>
                        <td style="background-color:#2e1519; padding:20px 28px; border-radius:8px 8px 0 0; border-bottom:4px solid #c8181c;">
                            <div style="font-size:20px; font-weight:bold; color:#fbede8;">Convenios UNLPam</div>
                            <div style="font-size:13px; color:#cdb4b0; margin-top:2px;">Universidad Nacional de La Pampa</div>
                        </td>
                    </tr>

                    <!-- Contenido -->
                    <tr>
                        <td style="padding:28px;">
                            <p style="margin:0 0 12px; font-size:16px;">Hola, {{ $nombre }}.</p>
                            <p style="margin:0 0 20px; font-size:15px; line-height:1.5;">
                                Para terminar de iniciar sesión, ingresá este código en la pantalla de verificación:
                            </p>

                            <!-- Código -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="background-color:#f1ddd6; border:1px solid #e3cfc8; border-radius:8px; padding:18px 8px;">
                                        <span style="font-family:'Courier New', Courier, monospace; font-size:34px; font-weight:bold; letter-spacing:10px; color:#2e1519;">{{ $codigo }}</span>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:20px 0 0; font-size:14px; line-height:1.5; color:#6b4a4e;">
                                El código vale <strong>{{ $minutos }} minutos</strong> y se puede usar una sola vez.
                            </p>

                            <!-- Aviso de seguridad -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                                <tr>
                                    <td style="background-color:#fce3cb; border-left:4px solid #8a4300; padding:12px 14px; font-size:13px; line-height:1.5; color:#5c2d00;">
                                        <strong>¿No fuiste vos?</strong> Ignorá este mensaje y no compartas el código con nadie.
                                        Nadie de la universidad te lo va a pedir.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Pie -->
                    <tr>
                        <td style="padding:16px 28px; border-top:1px solid #e3cfc8; font-size:12px; color:#6b4a4e; line-height:1.5;">
                            Este es un mensaje automático del sistema de convenios. Por favor, no lo respondas.
                        </td>
                    </tr>
                </table>

            </td>
        </tr>
    </table>
</body>
</html>
