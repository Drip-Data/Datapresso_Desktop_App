"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", // Default shadcn list style
      // Original HTML: .config-tabs { display: flex; border-bottom: 1px solid #E5E7EB; margin-bottom: 1.5rem; }
      // We'll apply border and margin on the usage site or a wrapper. This is just the tab buttons container.
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm", // Default shadcn trigger
      // Original HTML: .config-tab-button { padding: 0.75rem 1.25rem; cursor: pointer; font-weight: 500; color: var(--text-secondary); border-bottom: 2px solid transparent; }
      // Original Active: .config-tab-button.active { color: var(--primary-dark); border-bottom-color: var(--primary-dark); }
      // The shadcn default is quite different. We'll use its active state for now and customize if needed.
      // For closer match to original: "px-5 py-3 font-medium text-text-secondary-html border-b-2 border-transparent data-[state=active]:text-primary-dark data-[state=active]:border-primary-dark data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-primary-dark"
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-background", // Default shadcn content, Added bg-background
      // Original HTML: .config-tab-content { display: none; } .config-tab-content.active { display: block; animation: fadeIn 0.3s ease; }
      // Radix handles display:none/block automatically. Animation can be added.
      "data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-300 ease-in-out", // Added duration and easing
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }