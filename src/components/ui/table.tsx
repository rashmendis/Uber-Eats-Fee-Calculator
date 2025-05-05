
import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, children, ...props }, ref) => ( // Explicitly destructure children
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props} // Spread remaining props
    >{children}</table> {/* Remove whitespace */}
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => ( // Explicitly destructure children
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props}>{/* Render children directly inside the thead without extra whitespace */}
    {children}
  </thead>
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => ( // Explicitly destructure children
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  >{children}</tbody> // Remove whitespace
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => ( // Explicitly destructure children
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  >{children}</tfoot> // Remove whitespace
))
TableFooter.displayName = "TableFooter"

// Refactored to single line to prevent whitespace hydration errors
const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, children, ...props }, ref) => <tr ref={ref} className={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)} {...props}>{children}</tr>);
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, children, ...props }, ref) => ( // Explicitly destructure children
  <th
    ref={ref}
    className={cn(
      // Reduced padding from px-4 py-3 to px-3 py-2
      "h-12 px-3 py-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 whitespace-nowrap border-r last:border-r-0",
      className
    )}
    {...props}
  >{children}</th> // Remove whitespace
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, children, ...props }, ref) => ( // Explicitly destructure children
  <td
    ref={ref}
    // Reduced padding from px-4 py-3 to px-3 py-2
    className={cn("px-3 py-2 align-middle [&:has([role=checkbox])]:pr-0 border-r last:border-r-0", className)}
    {...props}
  >{children}</td> // Remove whitespace
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, children, ...props }, ref) => ( // Explicitly destructure children
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  >{children}</caption> // Remove whitespace
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}

