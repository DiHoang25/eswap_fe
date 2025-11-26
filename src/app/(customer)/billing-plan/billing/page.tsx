import React from "react";
import TabsNav from "@/presentation/layouts/TabsNav";

const tabs = [
  { id: "plan", label: "Plan", href: "/billing-plan/plan" },
  { id: "billing", label: "Billing", href: "/billing-plan/billing" },
];

const BillingPage = () => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <TabsNav tabs={tabs}>
          {/* Nội dung tab Billing */}
          <h2 className="text-xl text-gray-800 font-semibold mb-4">Billing</h2>
          <p className="text-gray-600">
            Billing tab content will be added later.
          </p>
        </TabsNav>
      </div>
    </div>
  );
};

export default BillingPage;
