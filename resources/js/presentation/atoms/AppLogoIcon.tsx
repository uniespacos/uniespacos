import { HTMLAttributes, SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement> & HTMLAttributes<HTMLElement>) {
    return <img {...props} src="/_img/icon_logo.svg" />;
}
