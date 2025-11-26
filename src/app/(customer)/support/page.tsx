'use client';

import { withCustomerAuth } from '@/hoc/withAuth';
import React, { useState } from "react";
import { FiChevronDown, FiChevronUp, FiSearch } from "react-icons/fi";

interface FAQ {
  category: string;
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    category: "Booking",
    question: "Can I cancel a scheduled appointment?",
    answer: "Yes. You can cancel appointments with 'Pending' or 'Confirmed' status. However, if you've already paid the per-swap fee (Pay-per-swap), please review the refund policy before cancelling."
  },
  {
    category: "Booking",
    question: "What happens if I arrive late for my appointment?",
    answer: "The system will hold your spot for 60 minutes from the scheduled time. After this period, the booking will be automatically cancelled to make the battery available for other customers."
  },
  {
    category: "Pricing & Payment",
    question: "What types of subscription plans does eSwap offer?",
    answer: "We provide 3 options:\n1. Pay-per-swap: Pay for each individual swap.\n2. Monthly Plan: Fixed monthly fee with limited swaps per month.\n3. Annual Plan: More savings with long-term commitment."
  },
  {
    category: "Pricing & Payment",
    question: "What payment methods are accepted?",
    answer: "The system supports online payment through PayOS gateway. You can scan the QR code using your banking app (VietQR) or e-wallet."
  },
  {
    category: "Pricing & Payment",
    question: "What if I run out of swaps in my monthly plan?",
    answer: "If you exhaust your monthly swap quota, you can still continue swapping batteries but will need to pay the Pay-per-swap rate for additional swaps."
  },
  {
    category: "Technical & Battery",
    question: "How do I find the nearest swap station?",
    answer: "On the homepage, allow the app to access your location. The system will display a map and list of nearby stations with available battery count."
  },
  {
    category: "Technical & Battery",
    question: "Is the battery I receive guaranteed to be fully charged?",
    answer: "The eSwap system only allows booking and issuing batteries with State of Charge (SOC) above 90% and good State of Health (SOH) to ensure your journey."
  },
  {
    category: "Issues & Complaints",
    question: "I've paid successfully but my Booking still shows 'Pending Payment'?",
    answer: "Sometimes the banking system response is delayed. Please wait about 5-10 minutes. If the status doesn't change, go to 'Transaction History', copy the Order Code and contact our hotline for manual activation support."
  },
  {
    category: "Issues & Complaints",
    question: "I arrived at the station but staff says batteries are out of stock or station is closed?",
    answer: "We apologize for this issue. You can cancel your current Booking in the app (you'll be refunded to your wallet if you've paid the per-swap fee) and find the nearest alternative station through the map."
  },
  {
    category: "Issues & Complaints",
    question: "The battery I just swapped is faulty or draining unusually fast?",
    answer: "Please return to the nearest swap station immediately. Staff will inspect the battery condition. If it's a battery defect, you'll get a free replacement and it won't count toward your plan's swap quota."
  },
  {
    category: "Policy & Plans",
    question: "Can I upgrade my plan (e.g., from Basic to Premium) mid-term?",
    answer: "Yes. You can purchase a new plan at any time. The new plan will be activated immediately. Note: Remaining time and swap quota from the old plan will not be carried over to the new plan."
  },
  {
    category: "Policy & Plans",
    question: "What is the refund policy when cancelling Monthly/Annual plans?",
    answer: "eSwap does not support refunds for Monthly/Annual plans that have been activated and used. You can still use the service until the plan expires."
  },
  {
    category: "Policy & Plans",
    question: "What is the No-show fee?",
    answer: "If you book an appointment but don't arrive at the station within 30 minutes and don't cancel beforehand, the booking will be automatically cancelled. If you're using Pay-per-swap, the reservation fee may not be refunded."
  },
  {
    category: "Account & Vehicle",
    question: "Do I need to re-register my account if I get a new vehicle?",
    answer: "No. Just go to 'Vehicle Management' in the app and add your new vehicle information. Old subscription plans are tied to your account, but note that plans typically apply to a specific battery type (Small/Medium/Large)."
  },
  {
    category: "Account & Vehicle",
    question: "Can I use my account to swap batteries for someone else's vehicle?",
    answer: "In principle, yes, as long as that vehicle uses the same Battery Type as your current plan. However, we recommend each driver use their own account to ensure battery insurance benefits."
  },
  {
    category: "Safety",
    question: "Is the battery swapping process safe?",
    answer: "Absolutely safe. Battery installation and removal is performed by trained station staff or automated systems. eSwap batteries meet the highest waterproof and fire-resistant standards."
  },
  {
    category: "Contact",
    question: "I want to partner to open a swap station (Franchise), who should I contact?",
    answer: "Thank you for your interest. Please email eswapfall2025@gmail.com to discuss with our business development team."
  }
];

const SupportPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Get unique categories
  const categories = ["All", ...Array.from(new Set(faqs.map(faq => faq.category)))];

  // Filter FAQs
  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Support Center</h1>
          <p className="text-lg text-gray-600">Find answers to frequently asked questions</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
            <input
              type="text"
              placeholder="Search for questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === category
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {filteredFAQs.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <p className="text-gray-600">No results found. Try different keywords.</p>
            </div>
          ) : (
            filteredFAQs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <button
                  onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 pr-4">
                    <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full mb-2">
                      {faq.category}
                    </span>
                    <h3 className="font-semibold text-gray-900 text-lg">{faq.question}</h3>
                  </div>
                  <div className="text-gray-400">
                    {expandedIndex === index ? (
                      <FiChevronUp className="text-2xl" />
                    ) : (
                      <FiChevronDown className="text-2xl" />
                    )}
                  </div>
                </button>
                
                {expandedIndex === index && (
                  <div className="px-6 pb-4 pt-2 border-t border-gray-100">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Contact Section */}
        <div className="mt-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-center text-white shadow-xl">
          <h2 className="text-2xl font-bold mb-3">Still need help?</h2>
          <p className="mb-6 text-indigo-100">Can't find the answer you're looking for? Contact our support team.</p>
          <a
            href="mailto:eswapfall2025@gmail.com"
            className="inline-block px-8 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default withCustomerAuth(SupportPage);
