export default function HeadingSmall({ title, description }: { title: string; description?: string }) {
    return (
        <header>
            <h2 className="mb-0.5 text-base font-medium text-balance">{title}</h2>
            {description && <p className="text-muted-foreground text-sm text-pretty">{description}</p>}
        </header>
    );
}
