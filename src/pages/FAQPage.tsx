import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { Link } from 'react-router-dom';

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

const faqs: FAQItem[] = [
  {
    question: 'What is GoldyQuote?',
    answer: (
      <p>
        GoldyQuote is an insurance intake service based in Elk River, Minnesota. We make it easy for
        you to share your insurance information in one place so that a licensed agent can follow up
        with personalized quotes. We are not an insurance company or broker; we are the first step
        that connects you with the right people.
      </p>
    ),
  },
  {
    question: 'Is it free to use GoldyQuote?',
    answer: (
      <p>
        Yes, completely free. There is no cost to submit a form or receive a follow-up from an agent.
        You are never obligated to purchase anything.
      </p>
    ),
  },
  {
    question: 'Will getting a quote affect my credit score?',
    answer: (
      <p>
        Submitting your information through GoldyQuote does not trigger a credit inquiry and will not
        affect your credit score. Insurers use a separate credit-based insurance score for underwriting
        purposes, and even that is typically a soft pull that does not impact your credit.
      </p>
    ),
  },
  {
    question: 'How soon will an agent contact me?',
    answer: (
      <p>
        In most cases, you can expect to hear from a licensed agent within one business day of
        submitting your form. Response times may vary. If you have not heard back within two business
        days, feel free to reach out to us directly at{' '}
        <a href="mailto:quotegoldy@gmail.com" className="text-[#1A3A63] underline">
          quotegoldy@gmail.com
        </a>.
      </p>
    ),
  },
  {
    question: 'What information do I need to get started?',
    answer: (
      <>
        <p>For auto insurance, you will generally need:</p>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>Your name, address, and date of birth</li>
          <li>Driver's license number</li>
          <li>Vehicle make, model, and year</li>
          <li>Current insurance carrier (if applicable)</li>
          <li>Basic driving history (accidents, tickets in the past 3-5 years)</li>
        </ul>
        <p className="mt-3">
          You do not need to have everything memorized. Agents can help fill in details during the
          follow-up call.
        </p>
      </>
    ),
  },
  {
    question: 'Is my information kept private?',
    answer: (
      <p>
        We take your privacy seriously. Your information is shared only with licensed agents for the
        purpose of providing insurance quotes. We do not sell your data to marketers or unrelated
        third parties. See our{' '}
        <Link to="/privacy" className="text-[#1A3A63] underline">
          Privacy Policy
        </Link>{' '}
        for full details.
      </p>
    ),
  },
  {
    question: 'What states do you serve?',
    answer: (
      <p>
        GoldyQuote primarily serves drivers in Minnesota and Wisconsin, though we are expanding.
        If you are outside those states, you are still welcome to submit a form and we will do our
        best to connect you with the right resources.
      </p>
    ),
  },
  {
    question: 'What types of insurance do you handle?',
    answer: (
      <p>
        Right now we focus on auto insurance. Home, renters, and life insurance options are coming
        soon. If you have questions about other coverage types, reach out directly and we can point
        you in the right direction.
      </p>
    ),
  },
  {
    question: 'What if I already have insurance?',
    answer: (
      <p>
        That is perfectly fine. Many people use GoldyQuote to compare rates at renewal time or after
        a life change like buying a new car, moving, or adding a driver. There is no obligation to
        switch, and comparing never hurts.
      </p>
    ),
  },
  {
    question: 'How do I update or delete my information?',
    answer: (
      <p>
        Email us at{' '}
        <a href="mailto:quotegoldy@gmail.com" className="text-[#1A3A63] underline">
          quotegoldy@gmail.com
        </a>{' '}
        and we will handle your request promptly, typically within two business days.
      </p>
    ),
  },
];

const FAQPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-gray-50 pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <h1 className="text-4xl font-bold text-[#1A3A63] mb-3">Frequently Asked Questions</h1>
          <p className="text-lg text-gray-600 mb-10">
            Answers to the most common questions about how GoldyQuote works.
          </p>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-100">
                <button
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-semibold text-[#1A3A63]">{faq.question}</span>
                  {openIndex === idx ? (
                    <ChevronUp size={18} className="text-[#F7B538] flex-shrink-0 ml-4" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-400 flex-shrink-0 ml-4" />
                  )}
                </button>
                {openIndex === idx && (
                  <div className="px-6 pb-5 text-gray-700 leading-7 border-t border-gray-100 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 bg-[#1A3A63] rounded-lg p-6 text-white">
            <h2 className="text-xl font-semibold mb-2">Still have questions?</h2>
            <p className="text-gray-300 mb-4">
              We are happy to help. Send us an email and we will get back to you within one business day.
            </p>
            <a
              href="mailto:quotegoldy@gmail.com"
              className="inline-block bg-[#F7B538] text-[#1A3A63] font-semibold px-5 py-2 rounded-md hover:bg-yellow-400 transition-colors"
            >
              quotegoldy@gmail.com
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQPage;
