export default function Heading({ title, description }: { title: string; description?: string }) {
    return (
        <div className="mb-8 space-y-0.5">
            <h1 className="text-xl font-semibold tracking-tight text-balance">{title}</h1>
            {description && <p className="text-muted-foreground text-sm text-pretty">{description}</p>}
        </div>
    );
}
