import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getRoleLabel } from '@/constants/role-labels';
import { useTranslation } from '@/i18n';
import HeadingSmall from '@/presentation/atoms/HeadingSmall';
import InputError from '@/presentation/atoms/InputError';
import { UserAvatar } from '@/presentation/atoms/UserAvatar';
import DeleteItem from '@/presentation/molecules/DeleteItem';
import { SeletorInstituicao } from '@/presentation/molecules/SeletorInstituicao';
import AppLayout from '@/presentation/templates/AppLayout';
import SettingsLayout from '@/presentation/templates/settings/Layout';
import { type BreadcrumbItem, type Instituicao, type SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Camera, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import type React from 'react';
import { type SyntheticEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Configurações de perfil',
        href: '/settings/profile',
    },
];

interface ProfileForm {
    name: string;
    email: string;
    phone: string;
    instituicao_id: string;
    setor_id: string;
    photo: File | null;
    remove_photo: boolean;
    _method: 'patch';
}

export default function Profile({
    mustVerifyEmail,
    status,
    instituicaos,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    instituicaos: Instituicao[];
}) {
    const { t } = useTranslation();
    const { auth } = usePage<SharedData>().props;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const { data, setData, post, errors, processing, recentlySuccessful } = useForm<Required<ProfileForm>>({
        name: auth.user.name,
        email: auth.user.email,
        phone: auth.user.telefone || '',
        instituicao_id: '',
        setor_id: auth.user.setor_id?.toString() || '',
        photo: null,
        remove_photo: false,
        _method: 'patch',
    });

    const previewUser = photoPreview
        ? { ...auth.user, profile_pic: photoPreview }
        : { ...auth.user, profile_pic: data.remove_photo ? undefined : auth.user.profile_pic };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }

        setData((prevData) => ({ ...prevData, photo: file, remove_photo: false }));
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleRemovePhoto = () => {
        setData((prevData) => ({ ...prevData, photo: null, remove_photo: true }));
        setPhotoPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const formatPhoneNumber = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        const limited = cleaned.slice(0, 11);

        if (limited.length <= 2) {
            return `(${limited}`;
        } else if (limited.length <= 7) {
            return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
        } else {
            return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7, 11)}`;
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setData('phone', formatted);
    };

    const handleInstituicaoChange = (instituicaoId: string) => {
        setData('instituicao_id', instituicaoId);
    };

    const handleSetorChange = (setorId: string) => {
        setData('setor_id', setorId);
    };

    const submit = (e: SyntheticEvent) => {
        e.preventDefault();

        post(route('settings.profile.update'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setPhotoPreview(null);
                setData((prevData) => ({ ...prevData, photo: null, remove_photo: false }));
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('auth.profile.head_title')} />

            <SettingsLayout>
                <div className="flex items-center gap-4 border-b pb-6">
                    <div className="relative">
                        <UserAvatar user={previewUser} className="h-16 w-16 text-lg" />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-primary text-primary-foreground border-background absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full border-2"
                            aria-label={t('auth.profile.change_photo')}
                        >
                            <Camera className="h-3 w-3" />
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{auth.user.name}</p>
                        <p className="text-muted-foreground truncate text-sm">{auth.user.email}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                            {auth.user.roles.map((role) => (
                                <Badge key={role} variant="secondary">
                                    {getRoleLabel(role)}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {(previewUser.profile_pic || auth.user.profile_pic) && !data.remove_photo && (
                        <Button type="button" variant="ghost" size="sm" onClick={handleRemovePhoto}>
                            <Trash2 className="mr-1.5 h-4 w-4" />
                            {t('auth.profile.remove_photo')}
                        </Button>
                    )}
                </div>

                <div className="space-y-6">
                    <HeadingSmall title={t('auth.profile.info_title')} description={t('auth.profile.info_desc')} />

                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">{t('auth.profile.name_label')}</Label>

                            <Input
                                id="name"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) => {
                                    setData('name', e.target.value);
                                }}
                                required
                                autoComplete="name"
                                placeholder={t('auth.profile.fullname_placeholder')}
                            />

                            <InputError className="mt-2" message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">{t('auth.profile.email_label')}</Label>

                            <Input
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={data.email}
                                onChange={(e) => {
                                    setData('email', e.target.value);
                                }}
                                required
                                autoComplete="username"
                                placeholder={t('auth.profile.email_placeholder')}
                            />

                            <InputError className="mt-2" message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="phone">{t('auth.profile.phone_label')}</Label>

                            <Input
                                id="phone"
                                className="mt-1 block w-full"
                                value={data.phone}
                                onChange={handlePhoneChange}
                                required
                                placeholder="(73) 99999-9999"
                                maxLength={15}
                            />

                            <InputError className="mt-2" message={errors.phone} />
                        </div>

                        <div className="border-t pt-6">
                            <h3 className="text-foreground mb-4 text-lg font-medium">{t('auth.profile.institutional_info')}</h3>
                            <SeletorInstituicao
                                instituicaos={instituicaos}
                                processing={processing}
                                onInstituicaoChange={handleInstituicaoChange}
                                onSetorChange={handleSetorChange}
                                errors={errors}
                                initialSetorId={data.setor_id}
                            />
                        </div>

                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <div>
                                <p className="text-muted-foreground -mt-4 text-sm">
                                    Seu endereço de e-mail não está verificado.{' '}
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="text-foreground decoration-border underline underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current!"
                                    >
                                        Clique aqui para reenviar o e-mail de verificação.
                                    </Link>
                                </p>

                                {status === 'verification-link-sent' && (
                                    <div className="text-success-accent mt-2 text-sm font-medium">
                                        Um novo link de verificação foi enviado para seu e-mail.
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>{t('auth.profile.save_button')}</Button>

                            {recentlySuccessful && <p className="text-muted-foreground text-sm">{t('auth.profile.saved_text')}</p>}
                        </div>
                    </form>
                </div>

                <DeleteItem itemName="conta" route={route('settings.profile.destroy')} showHeading={true} variant="card" />
            </SettingsLayout>
        </AppLayout>
    );
}
