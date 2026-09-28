import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

const Drawer = ({
    shouldScaleBackground = true,
    ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
    <DrawerPrimitive.Root
        data-slot="drawer"
        shouldScaleBackground={shouldScaleBackground}
        {...props}
    />
);
Drawer.displayName = "Drawer";

const DrawerTrigger = React.forwardRef<
    React.ComponentRef<typeof DrawerPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Trigger>
>(({ ...props }, ref) => (
    <DrawerPrimitive.Trigger data-slot="drawer-trigger" ref={ref} {...props} />
));
DrawerTrigger.displayName = DrawerPrimitive.Trigger.displayName;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = React.forwardRef<
    React.ComponentRef<typeof DrawerPrimitive.Close>,
    React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Close>
>(({ ...props }, ref) => (
    <DrawerPrimitive.Close data-slot="drawer-close" ref={ref} {...props} />
));
DrawerClose.displayName = DrawerPrimitive.Close.displayName;

const DrawerOverlay = React.forwardRef<
    React.ComponentRef<typeof DrawerPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DrawerPrimitive.Overlay
        ref={ref}
        data-slot="drawer-overlay"
        className={cn("fixed inset-0 z-50 bg-black/60 backdrop-blur-xs", className)}
        {...props}
    />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
    React.ComponentRef<typeof DrawerPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <DrawerPortal data-slot="drawer-portal">
        <DrawerOverlay />
        <DrawerPrimitive.Content
            ref={ref}
            data-slot="drawer-content"
            className={cn(
                "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[90dvh] flex-col overflow-hidden rounded-t-[10px] border bg-background",
                className
            )}
            {...props}
        >
            <div className="mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full bg-muted" />
            {children}
        </DrawerPrimitive.Content>
    </DrawerPortal>
));
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        data-slot="drawer-header"
        className={cn("shrink-0 grid gap-1.5 p-4 text-center sm:text-left", className)}
        {...props}
    />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        data-slot="drawer-footer"
        className={cn("shrink-0 mt-auto flex flex-col gap-2 p-4 pb-[env(safe-area-inset-bottom)]", className)}
        {...props}
    />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
    React.ComponentRef<typeof DrawerPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
    <DrawerPrimitive.Title
        ref={ref}
        data-slot="drawer-title"
        className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)}
        {...props}
    />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
    React.ComponentRef<typeof DrawerPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DrawerPrimitive.Description
        ref={ref}
        data-slot="drawer-description"
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
    Drawer,
    DrawerPortal,
    DrawerOverlay,
    DrawerTrigger,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerFooter,
    DrawerTitle,
    DrawerDescription,
};
