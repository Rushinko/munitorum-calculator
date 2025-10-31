import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { ArrowDownNarrowWide } from "lucide-react"

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  )
}

function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  )
}

function CollapsibleArrow({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsibleTrigger {...props}>
      <ArrowDownNarrowWide className={`size-4 transition-transform duration-200 ${props.value ? "rotate-180" : "rotate-0"}`} />
    </CollapsibleTrigger>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent, CollapsibleArrow }
