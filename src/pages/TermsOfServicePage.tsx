import React from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-gray-50 pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <h1 className="text-4xl font-bold text-[#1A3A63] mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: April 9, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-7">

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using GoldyQuote ("the Site"), you agree to be bound by these Terms of
                Service. If you do not agree, please do not use the Site. These terms apply to all
                visitors and users who submit information through our intake forms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">2. What GoldyQuote Does</h2>
              <p>
                GoldyQuote is an insurance intake service. We collect information from users and route
                it to licensed insurance agents for follow-up. We are not a licensed insurance company,
                broker, or agent. We do not sell, bind, or underwrite insurance policies. Any insurance
                quotes or coverage decisions are made by licensed third-party agents independently of
                GoldyQuote.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">3. Use of the Site</h2>
              <p>You agree to use this Site only for lawful purposes. You may not:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Submit false or misleading information</li>
                <li>Attempt to access areas of the Site not intended for public use</li>
                <li>Use automated tools to scrape or extract data from the Site</li>
                <li>Interfere with the operation of the Site or its servers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">4. Consent to Contact</h2>
              <p>
                By submitting an intake form, you expressly consent to being contacted by GoldyQuote and
                affiliated licensed agents by phone, email, or text message regarding your insurance
                inquiry. Message and data rates may apply for text messages. You may opt out of
                communications at any time by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">5. Accuracy of Information</h2>
              <p>
                The content on this Site is provided for general informational purposes only. Insurance
                laws, requirements, and rates vary by state and change over time. We make no
                representations that the information on this Site is current, complete, or applicable to
                your specific situation. Always consult a licensed agent before making coverage
                decisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">6. Intellectual Property</h2>
              <p>
                All content on this Site, including text, graphics, logos, and design, is the property
                of GoldyQuote and protected by applicable copyright and trademark laws. You may not
                reproduce or distribute any content without our written permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">7. Disclaimer of Warranties</h2>
              <p>
                The Site is provided "as is" without warranties of any kind, express or implied. We do
                not warrant that the Site will be uninterrupted, error-free, or free of viruses or other
                harmful components.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">8. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, GoldyQuote shall not be liable for any
                indirect, incidental, special, consequential, or punitive damages arising from your use
                of the Site or any insurance decisions made based on information provided here.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">9. Third-Party Links</h2>
              <p>
                This Site may contain links to third-party websites. We are not responsible for the
                content or privacy practices of those sites and encourage you to review their terms
                before providing any information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">10. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the State of Minnesota, without regard to
                conflict of law principles. Any disputes arising from these Terms shall be subject to
                the exclusive jurisdiction of courts located in Sherburne County, Minnesota.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">11. Changes to Terms</h2>
              <p>
                We reserve the right to update these Terms at any time. Changes will be posted on this
                page with an updated date. Continued use of the Site after changes are posted
                constitutes your acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">12. Contact</h2>
              <p>Questions about these Terms? Contact us at:</p>
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

export default TermsOfServicePage;
