@extends('emails.layout')

@section('content')
    <p>{{ __('Dear :name,', ['name' => $user->name]) }}</p>

    @if($espacoNome && $turno)
        <p>{{ __('You were removed as manager of the space ":espaco" for the :turno shift.', ['espaco' => $espacoNome, 'turno' => $turno]) }}</p>
        <p>{{ __('You are no longer responsible for reviewing reservation requests for this space in this shift.') }}</p>
        <p>{{ __('To view your spaces, click the button below:') }}</p>
        <div class="cta-container"><a href="{{ $url }}" class="button">{{ __('View My Spaces') }}</a></div>
    @else
        <p>{{ __('You were removed as schedule manager in our system.') }}</p>
        <p>{{ __('You no longer have any schedule or space management permissions.') }}</p>
        <p>{{ __('To access the home page, click the button below:') }}</p>
        <div class="cta-container"><a href="{{ $url }}" class="button">{{ __('Go to Home Page') }}</a></div>
    @endif

    <p>{{ __('Regards,') }}</p>
    <p>{{ __('UniEspaços Team') }}</p>
@endsection
