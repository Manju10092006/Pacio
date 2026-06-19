import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Tabs from "@radix-ui/react-tabs";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { X, Search } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// 1. Button
export const Button = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-[8px] px-5 py-3 text-xs font-mono tracking-wider uppercase border border-ink bg-ink text-bone shadow-[0_10px_24px_rgba(7,16,21,0.14)] hover:bg-accent hover:border-accent transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        variant === "ghost" && "bg-transparent text-ink border-line-strong shadow-none hover:bg-ink hover:text-bone hover:border-ink",
        variant === "accent" && "bg-accent border-accent text-bone hover:bg-ink hover:border-ink",
        variant === "outline" && "bg-paper border-line-strong text-ink shadow-none hover:border-ink hover:bg-bone-200",
        className
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";

// 2. Input
export const Input = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "focus-ring w-full rounded-[8px] bg-paper border border-line-strong px-4 py-3 text-sm font-sans placeholder-ink/40 focus:outline-none focus:border-ink transition-all disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

// 3. Textarea
export const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "focus-ring w-full rounded-[8px] bg-paper border border-line-strong px-4 py-3 text-sm font-sans placeholder-ink/40 focus:outline-none focus:border-ink transition-all min-h-[100px] disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

// 4. Select
export const Select = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div className="relative inline-block w-full">
      <select
        ref={ref}
        className={cn(
          "focus-ring w-full rounded-[8px] bg-paper border border-line-strong px-4 py-3 text-sm font-sans focus:outline-none focus:border-ink transition-all appearance-none pr-10 cursor-pointer disabled:cursor-not-allowed disabled:bg-bone-200 disabled:text-ink/45",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-ink/60">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
        </svg>
      </div>
    </div>
  );
});
Select.displayName = "Select";

// 5. Badge
export function Badge({ className, variant = "default", children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono tracking-wider uppercase border border-line-strong bg-bone-200 text-ink",
        variant === "solid" && "bg-ink text-bone border-ink",
        variant === "accent" && "bg-accent text-bone border-accent",
        variant === "signal" && "bg-[var(--signal-soft)] text-[var(--signal)] border-[rgba(0,167,167,0.32)]",
        variant === "violet" && "bg-[var(--violet-soft)] text-[var(--violet)] border-[rgba(92,92,255,0.32)]",
        variant === "success" && "bg-moss/10 text-moss border-moss/30",
        variant === "warning" && "bg-ochre/10 text-ochre border-ochre/30",
        variant === "danger" && "bg-rust/10 text-rust border-rust/30",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// 6. Avatar
export function Avatar({ className, name = "U", src, ...props }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className={cn(
        "relative flex h-9 w-9 shrink-0 overflow-hidden border border-line-strong bg-bone-200 font-mono text-xs font-semibold items-center justify-center text-ink select-none",
        className
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

// 7. Progress
export function Progress({ className, value = 0, ...props }) {
  return (
    <ProgressPrimitive.Root
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-bone-200 border border-line", className)}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-gradient-to-r from-accent via-[var(--signal)] to-[var(--violet)] transition-all duration-500"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

// 8. Tooltip
export function TooltipProvider({ children }) {
  return <Tooltip.Provider>{children}</Tooltip.Provider>;
}

export function TooltipComponent({ content, children }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="z-50 overflow-hidden bg-ink text-bone px-3 py-1.5 text-xs font-mono border border-ink shadow-md"
          sideOffset={5}
        >
          {content}
          <Tooltip.Arrow className="fill-ink" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

// 9. Dialog (Modal)
export function DialogRoot({ children, open, onOpenChange }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>{children}</Dialog.Root>;
}

export function DialogContent({ children, title, className, ...props }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" />
      <Dialog.Content
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border border-line-strong bg-bone p-8 shadow-lg",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between border-b border-line pb-4 mb-6">
          {title && <Dialog.Title className="font-display text-xl tracking-tight uppercase">{title}</Dialog.Title>}
          <Dialog.Close className="hover:opacity-70 transition-opacity">
            <X size={18} />
          </Dialog.Close>
        </div>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

// 10. Sheet (Sliding sidebar from right)
export function SheetRoot({ children, open, onOpenChange }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>{children}</Dialog.Root>;
}

export function SheetContent({ children, title, className, ...props }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" />
      <Dialog.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 h-full w-full max-w-md border-l border-line-strong bg-bone p-8 shadow-lg",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between border-b border-line pb-4 mb-6">
          {title && <Dialog.Title className="font-display text-xl tracking-tight uppercase">{title}</Dialog.Title>}
          <Dialog.Close className="hover:opacity-70 transition-opacity">
            <X size={18} />
          </Dialog.Close>
        </div>
        <div className="overflow-y-auto h-[calc(100%-60px)] pr-2">
          {children}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

// 11. Drawer (Sliding up from bottom)
export function DrawerRoot({ children, open, onOpenChange }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>{children}</Dialog.Root>;
}

export function DrawerContent({ children, title, className, ...props }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" />
      <Dialog.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[90vh] border-t border-line-strong bg-bone p-8 shadow-lg",
          className
        )}
        {...props}
      >
        <div className="mx-auto h-1.5 w-[40px] rounded-full bg-line-strong mb-6" />
        <div className="flex items-center justify-between border-b border-line pb-4 mb-6">
          {title && <Dialog.Title className="font-display text-xl tracking-tight uppercase">{title}</Dialog.Title>}
          <Dialog.Close className="hover:opacity-70 transition-opacity">
            <X size={18} />
          </Dialog.Close>
        </div>
        <div className="overflow-y-auto max-h-[60vh] pr-2">
          {children}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

// 12. Command Palette (Search/Actions box)
export function CommandPalette({ open, onOpenChange, items = [], onSelect }) {
  const [query, setQuery] = useState("");
  const filtered = items.filter(
    item =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-[50%] top-[40%] z-50 w-full max-w-xl translate-x-[-50%] translate-y-[-50%] border border-line-strong bg-bone shadow-2xl overflow-hidden">
          <div className="flex items-center border-b border-line px-4 py-3 gap-3">
            <Search size={18} className="text-ink/50" />
            <input
              type="text"
              placeholder="Search workspaces, actions, resources..."
              className="w-full bg-transparent text-sm focus:outline-none placeholder-ink/40 font-sans"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            <Dialog.Close className="text-xs font-mono uppercase text-ink/40 hover:text-ink">ESC</Dialog.Close>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-ink/40">NO RESULTS FOUND</div>
            ) : (
              filtered.map((item, i) => (
                <button
                  key={i}
                  className="w-full text-left px-3 py-2 hover:bg-ink hover:text-bone text-sm flex items-center justify-between font-mono transition-colors"
                  onClick={() => {
                    onSelect(item);
                    onOpenChange(false);
                    setQuery("");
                  }}
                >
                  <span>{item.label}</span>
                  {item.category && <span className="text-[10px] opacity-60 uppercase">{item.category}</span>}
                </button>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </DialogRoot>
  );
}

// 13. Empty State
export function EmptyState({ title = "No records found", description = "Try adjusting your filters or search terms.", action }) {
  return (
    <div className="border border-dashed border-line-strong p-12 text-center flex flex-col items-center justify-center bg-bone-50">
      <div className="font-mono text-xs text-ink-400 tracking-widest uppercase">§ STATIC STATE</div>
      <h4 className="font-display text-xl tracking-tight mt-3">{title}</h4>
      <p className="font-serif text-sm text-ink-500 mt-2 max-w-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// 14. Skeleton Loader
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse bg-bone-300/80 border border-line", className)}
      {...props}
    />
  );
}

// 15. Tabs
export function TabsRoot({ defaultValue, children, className, ...props }) {
  return <Tabs.Root defaultValue={defaultValue} className={cn("space-y-6", className)} {...props}>{children}</Tabs.Root>;
}

export function TabsList({ children, className }) {
  return (
    <Tabs.List className={cn("flex border-b border-line gap-2 overflow-x-auto", className)}>
      {children}
    </Tabs.List>
  );
}

export function TabsTrigger({ value, children, className }) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        "px-4 py-2.5 text-xs font-mono uppercase tracking-wider border-b-2 border-transparent text-ink/60 hover:text-ink transition-all data-[state=active]:border-accent data-[state=active]:text-ink",
        className
      )}
    >
      {children}
    </Tabs.Trigger>
  );
}

export function TabsContent({ value, children, className }) {
  return (
    <Tabs.Content value={value} className={cn("focus:outline-none", className)}>
      {children}
    </Tabs.Content>
  );
}
