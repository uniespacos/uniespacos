<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Fuso horário da grade e do "agora"
    |--------------------------------------------------------------------------
    |
    | A grade de horários é de horário local. O app.timezone é UTC, então a
    | disponibilidade do dia (e o que já passou) é calculada neste fuso.
    |
    */
    'fuso_horario' => 'America/Bahia',

    /*
    |--------------------------------------------------------------------------
    | Grade de horários por turno
    |--------------------------------------------------------------------------
    |
    | Espelho do HORARIOS_PADRAO em resources/js/constants/turnos.ts. Se a grade
    | mudar em um lado, mude no outro: o calendário do frontend e o filtro de
    | disponibilidade da listagem de espaços precisam mostrar os mesmos slots.
    |
    */
    'horarios_por_turno' => [
        'manha' => ['07:30 - 08:20', '08:20 - 09:10', '09:10 - 10:00', '10:10 - 11:00', '11:00 - 11:50', '11:50 - 12:40'],
        'tarde' => ['13:10 - 14:00', '14:00 - 14:50', '14:50 - 15:40', '15:50 - 16:40', '16:40 - 17:30', '17:30 - 18:20'],
        'noite' => ['18:20 - 19:10', '19:10 - 20:00', '20:00 - 20:50', '20:50 - 21:40', '21:40 - 22:30'],
    ],

];
