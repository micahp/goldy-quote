import React from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-gray-50 pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <h1 className="text-4xl font-bold text-[#1A3A63] mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: April 9, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-7">

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">1. Who We Are</h2>
              <p>
                GoldyQuote ("we," "us," or "our") operates at goldyquote.com. We are an insurance
                intake service based in Elk River, Minnesota. We collect information from visitors to
                help connect them with licensed insurance agents. We are not a licensed insurance
                company or broker.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">2. Information We Collect</h2>
              <p>We collect information you provide directly, including:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Name, email address, and phone number</li>
                <li>ZIP code and state of residence</li>
                <li>Vehicle information (make, model, year)</li>
                <li>Driver history and household information relevant to your quote request</li>
                <li>Insurance coverage preferences</li>
              </ul>
              <p className="mt-3">
                We also collect limited technical data automatically, such as browser type, IP address,
                and pages visited, for site functionality and analytics purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Route your intake form to licensed insurance agents who can follow up with you</li>
                <li>Communicate with you about your quote request</li>
                <li>Improve our site and intake process</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p className="mt-3">
                We do not sell your personal information to third parties for their own marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">4. Information Sharing</h2>
              <p>
                By submitting an intake form on GoldyQuote, you consent to your information being shared
                with licensed insurance agents or agencies for the purpose of providing you with
                insurance quotes and follow-up. These agents operate independently of GoldyQuote and are
                subject to their own privacy practices.
              </p>
              <p className="mt-3">
                We may also share information with service providers who assist us in operating the
                website, subject to confidentiality obligations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">5. Data Retention</h2>
              <p>
                We retain personal information for as long as necessary to fulfill the purposes described
                in this policy, unless a longer retention period is required by law. You may request
                deletion of your information at any time by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">6. Your Rights</h2>
              <p>Depending on your state of residence, you may have the right to:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt out of certain data sharing</li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, contact us at{' '}
                <a href="mailto:quotegoldy@gmail.com" className="text-[#1A3A63] underline">
                  quotegoldy@gmail.com
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">7. Cookies</h2>
              <p>
                We use cookies and similar technologies to operate the site and understand how visitors
                use it. You can control cookie settings through your browser. Disabling cookies may
                affect certain site functionality.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">8. Children's Privacy</h2>
              <p>
                GoldyQuote is not directed to individuals under the age of 18. We do not knowingly
                collect personal information from minors. If you believe a minor has submitted
                information to us, please contact us and we will delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Changes will be posted on this
                page with an updated date. Continued use of the site after changes constitutes
                acceptance of the revised policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">10. Contact Us</h2>
              <p>If you have questions about this Privacy Policy, reach out to us at:</p>
              <address className="not-italic mt-2">
                <p>GoldyQuote</p>
                <p>1153 Main St NW, Elk River, MN 55330</p>
                <p>
                  <a href="mailto:quotegoldy@gmail.com" className="text-[#1A3A63] underline">
                    quotegoldy@gmail.com
                  </a>
                </p>
              </address>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
