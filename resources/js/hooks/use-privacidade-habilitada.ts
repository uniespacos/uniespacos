import type { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

export function usePrivacidadeHabilitada(): boolean {
    const { privacidadeHabilitada } = usePage<SharedData>().props;

    return privacidadeHabilitada === true;
}
