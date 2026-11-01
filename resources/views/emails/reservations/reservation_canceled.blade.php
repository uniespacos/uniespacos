@extends('emails.layout')

@section('content')
    <p>Prezado(a) gestor(a),</p>
    <p>Uma reserva foi cancelada pelo solicitante:</p>

    <ul>
        <li><strong>Título da Reserva:</strong> {{ $reserva->titulo }}</li>
        <li><strong>Solicitante:</strong> {{ $reserva->user?->name ?? __('Unidentified requester') }}</li>
        <li><strong>Cancelado por:</strong> {{ $canceler->name }}</li>
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
    </ul>

    <p>Para visualizar a lista de reservas, clique no botão abaixo:</p>
    <div class="cta-container"><a href="{{ $url }}" class="button">Ver Reservas</a></div>

    <p>Atenciosamente,</p>
    <p>Equipe UniEspaços</p>
@endsection
