@extends('emails.layout')

@section('content')
    <p>Prezado(a) {{ $reserva->user?->name ?? 'Solicitante não identificado' }},</p>
    <p>Sua solicitação de reserva para <strong>'{{ $reserva->titulo }}'</strong> foi criada com sucesso e está aguardando avaliação.</p>

    <ul>
        <li><strong>Título da Reserva:</strong> {{ $reserva->titulo }}</li>
        <li><strong>Solicitante:</strong> {{ $reserva->user?->name ?? 'Solicitante não identificado' }}</li>
        @php
            $primeiroHorario = $reserva->horarios->first();
            $espaco = $primeiroHorario ? $primeiroHorario->agenda->espaco : null;
            $modulo = $espaco ? $espaco->andar->modulo : null;
            $unidade = $modulo ? $modulo->unidade : null;
        @endphp
        @if($espaco)
            <li><strong>Espaço:</strong> {{ $espaco->nome }}</li>
            @if($modulo)
                <li><strong>Módulo:</strong> {{ $modulo->nome }}</li>
            @endif
            @if($unidade)
                <li><strong>Campus:</strong> {{ $unidade->nome }}</li>
            @endif
        @endif
        <li><strong>Data/Horário:</strong>
            @foreach($reserva->resumo_horarios as $item)
                <p>{{ $item->texto }}</p>
            @endforeach
        </li>
        <li><strong>Status Inicial:</strong> {{ $reserva->situacao_formatada }}</li>
    </ul>

    <p>Você será notificado assim que sua reserva for avaliada pelos gestores responsáveis.</p>

    <p>Para acompanhar o status da sua reserva, clique no botão abaixo:</p>
    <div class="cta-container"><a href="{{ $url }}" class="button">Acompanhar Reserva</a></div>

    <p>Atenciosamente,</p>
    <p>Equipe UniEspaços</p>
@endsection
