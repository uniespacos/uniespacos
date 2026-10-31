@extends('emails.layout')

@section('content')
    <p>Prezado(a) {{ $reserva->user?->name ?? 'Solicitante não identificado' }},</p>
    <p>Sua reserva para <strong>'{{ $reserva->titulo }}'</strong> foi atualizada com sucesso.</p>

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
        <li><strong>Status Atual:</strong> {{ $reserva->situacao_formatada }}</li>
    </ul>

    <p>Para visualizar os detalhes completos da sua reserva, clique no botão abaixo:</p>
    <div class="cta-container"><a href="{{ $url }}" class="button">Ver Detalhes da Reserva</a></div>

    <p>Atenciosamente,</p>
    <p>Equipe UniEspaços</p>
@endsection
