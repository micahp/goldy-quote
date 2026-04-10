import React from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const DisclaimerPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-gray-50 pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <h1 className="text-4xl font-bold text-[#1A3A63] mb-2">Disclaimer</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: April 9, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-7">

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">Not an Insurance Company</h2>
              <p>
                GoldyQuote is not a licensed insurance company, insurance broker, or insurance agent.
                We do not sell, issue, bind, or underwrite insurance policies of any kind. The
                information submitted through our intake forms is forwarded to independently licensed
                insurance professionals who will contact you with coverage options.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">No Coverage Guarantee</h2>
              <p>
                Submitting a form on GoldyQuote does not guarantee that you will receive an insurance
                quote, be offered coverage, or that any quoted premium will reflect a final binding
                offer. All coverage decisions, underwriting, and final pricing are determined solely by
                the licensed insurance carriers and agents you are connected with.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">Informational Content Only</h2>
              <p>
                Blog articles, guides, and other educational content published on this Site are for
                general informational purposes only. They do not constitute legal, financial, or
                insurance advice. Insurance laws, minimum coverage requirements, and premium factors
                vary by state and individual circumstance. Always consult a licensed professional before
                making insurance decisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">Coverage Calculator</h2>
              <p>
                Any coverage estimates or recommendations produced by tools on this Site are
                illustrative only. They are not quotes, and they do not reflect actual rates from any
                insurer. Results are based on general guidelines and should not be relied upon as a
                substitute for advice from a licensed agent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">Third-Party Agents</h2>
              <p>
                Licensed agents who receive your information through GoldyQuote operate independently.
                GoldyQuote does not control, endorse, or guarantee the services, products, or advice
                provided by these agents. GoldyQuote is not responsible for any errors, omissions, or
                outcomes resulting from interactions with third-party agents.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">External Links</h2>
              <p>
                This Site may link to third-party websites for informational purposes. GoldyQuote does
                not endorse and is not responsible for the content, accuracy, or privacy practices of
                any external site.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-3">Questions</h2>
              <p>If you have questions about this Disclaimer, contact us at:</p>
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

export default DisclaimerPage;
