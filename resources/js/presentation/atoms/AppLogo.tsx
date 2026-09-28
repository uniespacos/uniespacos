import AppLogoIcon from '@/presentation/atoms/AppLogoIcon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center">
                <AppLogoIcon className="size-10" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-none font-semibold">UniEspaços</span>
            </div>
        </>
    );
}
