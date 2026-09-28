import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';
import { useState } from 'react';

interface UserAvatarProps {
    user: User;
    className?: string;
    fallbackClassName?: string;
}

export function UserAvatar({ user, className = 'h-8 w-8', fallbackClassName }: UserAvatarProps) {
    const getInitials = useInitials();
    const [hasImageError, setHasImageError] = useState(false);

    const rawProfilePic =
        typeof user.profile_pic === 'string'
            ? user.profile_pic
            : 'avatar' in user && typeof (user as { avatar: unknown }).avatar === 'string'
              ? (user as { avatar: string }).avatar
              : undefined;
    const profilePic = rawProfilePic && rawProfilePic.trim() !== '' ? rawProfilePic : undefined;

    return (
        <Avatar className={`overflow-hidden rounded-full ${className}`}>
            {profilePic && !hasImageError ? (
                <AvatarImage
                    src={profilePic}
                    alt={user.name}
                    onError={() => {
                        setHasImageError(true);
                    }}
                />
            ) : null}
            <AvatarFallback className={`bg-muted text-foreground rounded-lg ${fallbackClassName}`}>{getInitials(user.name)}</AvatarFallback>
        </Avatar>
    );
}
