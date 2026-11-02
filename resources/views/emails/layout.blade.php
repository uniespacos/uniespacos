<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        /* Base styles */
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #334155;
            background-color: #f1f5f9;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }

        /* Container */
        .wrapper {
            width: 100%;
            background-color: #f1f5f9;
            padding: 40px 0;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        /* Header */
        .header {
            background-color: #0071bc;
            padding: 32px 20px;
            text-align: center;
        }

        .header h2 {
            color: #ffffff;
            margin: 12px 0 0 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.025em;
        }

        .logo {
            width: 80px;
            height: auto;
        }

        /* Content */
        .content {
            padding: 40px 32px;
            background-color: #ffffff;
        }

        .content p {
            margin-bottom: 20px;
            font-size: 16px;
        }

        .content ul {
            background-color: #f8fafc;
            padding: 24px;
            border-radius: 8px;
            list-style: none;
            margin: 24px 0;
            border-left: 4px solid #0071bc;
        }

        .content li {
            margin-bottom: 12px;
            font-size: 14px;
            color: #475569;
        }

        .content li strong {
            color: #1e293b;
        }

        /* Call to Action */
        .cta-container {
            text-align: center;
            margin: 32px 0;
        }

        .button {
            display: inline-block;
            padding: 14px 28px;
            background-color: #0071bc;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: background-color 0.2s ease;
        }

        /* Footer */
        .footer {
            padding: 32px;
            text-align: center;
            font-size: 13px;
            color: #64748b;
            background-color: #f8fafc;
            border-top: 1px solid #e2e8f0;
        }

        .footer p {
            margin: 4px 0;
        }

        a {
            color: #0071bc;
            text-decoration: underline;
        }

        /* Responsive */
        @media only screen and (max-width: 600px) {
            .container {
                width: 100% !important;
                border-radius: 0;
            }

            .content {
                padding: 32px 20px;
            }
        }
    </style>
</head>

<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <img src="https://uniespacos.uesb.br/_img/icon_logo.svg" alt="UniEspaços Logo" class="logo">
                <h2>UniEspaços</h2>
            </div>
            <div class="content">
                @yield('content')
            </div>
            <div class="footer">
                <p>&copy; {{ date('Y') }} <strong>UniEspaços</strong>. Todos os direitos reservados.</p>
                <p>Sistema de Gestão de Reservas de Espaços Acadêmicos.</p>
                <p>Precisa de ajuda? <a href="mailto:uniespacos@uesb.edu.br">Contate o suporte</a>.</p>
                @if (config('privacidade.pagina_habilitada'))
                <p><a href="{{ url('/privacidade') }}">{{ __('Privacy Policy') }}</a></p>
                @endif
                <p>{{ __('Questions about your personal data? Contact the UESB Legal Department (provisional channel):') }} <a href="mailto:projur@uesb.edu.br">projur@uesb.edu.br</a></p>
            </div>
        </div>
    </div>
</body>

</html>