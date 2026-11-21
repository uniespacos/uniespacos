@extends('emails.layout')

@section('content')
    <p>{{ __('Dear :name,', ['name' => $manager->name]) }}</p>

    @if($espacoNome && $turno)
        <p>{{ __('You were designated as manager of the space ":espaco" for the :turno shift.', ['espaco' => $espacoNome, 'turno' => $turno]) }}</p>
        <p>{{ __('From now on, you are responsible for reviewing reservation requests for this space in this shift.') }}</p>
        <p>{{ __('To manage this space, click the button below:') }}</p>
        <div class="cta-container"><a href="{{ $url }}" class="button">{{ __('Manage Space') }}</a></div>
    @else
        <p>{{ __('You were designated as schedule manager in our system.') }}</p>
        <p>{{ __('From now on, you can manage the schedules and spaces assigned to you.') }}</p>
        <p>{{ __('To access the space management panel, click the button below:') }}</p>
        <div class="cta-container"><a href="{{ $url }}" class="button">{{ __('Access Management Panel') }}</a></div>
    @endif

    <p>{{ __('Regards,') }}</p>
    <p>{{ __('UniEspaços Team') }}</p>
@endsection
