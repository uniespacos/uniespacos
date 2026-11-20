import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { resolveStorageUrl } from '@/lib/storage-url';
import { type User } from '@/types';
import { useState } from 'react';

interface UserAvatarProps {
    user: User;
    className?: string;
    fallbackClassName?: string;
}

const VALID_IMAGE_EXTENSION_PATTERN = /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:[?#].*)?$/i;
const failedAvatarUrls = new Set<string>();

export function clearFailedAvatarUrls(): void {
    failedAvatarUrls.clear();
}

function isPlausibleAvatarPath(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) {
        return false;
    }
    if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) {
        return true;
    }
    return VALID_IMAGE_EXTENSION_PATTERN.test(trimmed);
}

export function UserAvatar({ user, className = 'h-8 w-8', fallbackClassName }: UserAvatarProps) {
    const getInitials = useInitials();
    const [failedSrc, setFailedSrc] = useState<string | null>(null);

    const rawProfilePic =
        typeof user.profile_pic === 'string'
            ? user.profile_pic
            : 'avatar' in user && typeof (user as { avatar: unknown }).avatar === 'string'
              ? (user as { avatar: string }).avatar
              : undefined;
    const profilePic = rawProfilePic && isPlausibleAvatarPath(rawProfilePic) ? resolveStorageUrl(rawProfilePic) : undefined;
    const shouldRenderImage = Boolean(profilePic && failedSrc !== profilePic && !failedAvatarUrls.has(profilePic));

    return (
        <Avatar className={`overflow-hidden rounded-full ${className}`}>
            {shouldRenderImage && profilePic ? (
                <AvatarImage
                    src={profilePic}
                    alt={user.name}
                    onLoadingStatusChange={(status) => {
                        if (status === 'error') {
                            failedAvatarUrls.add(profilePic);
                            setFailedSrc(profilePic);
                        }
                    }}
                    onError={() => {
                        failedAvatarUrls.add(profilePic);
                        setFailedSrc(profilePic);
                    }}
                />
            ) : null}
            <AvatarFallback className={`bg-muted text-foreground rounded-lg ${fallbackClassName}`}>{getInitials(user.name)}</AvatarFallback>
        </Avatar>
    );
}
