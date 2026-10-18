import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/help")({ component: HelpPage });

function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Cannify guide" title="Help" description="A quick guide to keeping an accurate food inventory." />
      <div className="space-y-4">
        <HelpCard title="Add items and batches">Create an item once, then add each delivery, jar, or preparation as its own batch. Batches keep their own quantities and best-before dates.</HelpCard>
        <HelpCard title="Consume with FIFO">Open an item or use Consume, enter the amount, and review Cannify’s oldest-batch-first recommendation before confirming. Only good quantity can be consumed.</HelpCard>
        <HelpCard title="Discard food">Discard moves quantity from Good to Bad and records the reason when you add one. Use Recently Deleted only for records you entered by mistake.</HelpCard>
        <HelpCard title="Use an item QR">An item QR always points to the item—not a specific batch. Scan it to quickly view the item, add a batch, or consume food. You can download or share the code from the item page.</HelpCard>
        <HelpCard title="Best-before alerts">Choose your notification timing in <Link to="/settings" className="font-medium text-primary">Settings</Link>. Browser and device permission is required for local alerts.</HelpCard>
      </div>
    </div>
  );
}

function HelpCard({ title, children }: { title: string; children: ReactNode }) {
  return <Card className="p-5"><h2 className="font-display text-xl font-medium">{title}</h2><p className="mt-2 text-muted-foreground">{children}</p></Card>;
}
