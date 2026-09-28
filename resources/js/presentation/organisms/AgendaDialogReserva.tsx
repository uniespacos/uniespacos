import { ReservaStepperModal, ReservaStepperModalProps } from '@/presentation/organisms/ReservaStepperModal';

/**
 * @deprecated Utilize diretamente `ReservaStepperModal`. Mantido como proxy para compatibilidade retroativa.
 */
export default function AgendaDialogReserva(props: ReservaStepperModalProps) {
    return <ReservaStepperModal {...props} />;
}
