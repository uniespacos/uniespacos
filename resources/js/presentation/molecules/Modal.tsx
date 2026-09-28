import { ResponsiveModal, type ResponsiveModalProps } from '@/presentation/molecules/ResponsiveModal';

export type ModalProps = ResponsiveModalProps;

export function Modal(props: ModalProps) {
    return <ResponsiveModal {...props} />;
}

export { ResponsiveModal };
