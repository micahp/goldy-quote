import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Users, PhoneCall } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Button from '../components/common/Button';
import micahPhoto from '../assets/micah-peoples.jpeg';
import meganPhoto from '../assets/megan-skinner.jpeg';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow bg-gray-50 pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          <section className="max-w-3xl">
            <h1 className="text-4xl font-bold text-[#1A3A63] mb-4">About GoldyQuote</h1>
            <p className="text-lg text-gray-700 mb-6">
              GoldyQuote helps drivers start insurance intake quickly and confidently. Our goal is to
              make the first step simple so licensed agents can follow up with personalized options.
            </p>
            <p className="text-gray-600">
              We focus on clear questions, fast routing, and human support when it matters most.
              That means less confusion and more confidence when comparing coverage choices.
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <article className="bg-white rounded-lg shadow-sm p-6">
              <ShieldCheck className="w-8 h-8 text-[#7A0019] mb-3" />
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-2">Trusted Guidance</h2>
              <p className="text-gray-600">
                Our workflow is designed to surface important details early so you get better
                follow-up conversations.
              </p>
            </article>

            <article className="bg-white rounded-lg shadow-sm p-6">
              <Users className="w-8 h-8 text-[#7A0019] mb-3" />
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-2">Real People, Real Help</h2>
              <p className="text-gray-600">
                GoldyQuote supports a licensed team that can walk you through options and answer
                questions clearly.
              </p>
            </article>

            <article className="bg-white rounded-lg shadow-sm p-6">
              <PhoneCall className="w-8 h-8 text-[#7A0019] mb-3" />
              <h2 className="text-xl font-semibold text-[#1A3A63] mb-2">Fast Follow-Up</h2>
              <p className="text-gray-600">
                Once you submit intake details, we prioritize timely contact so you can keep moving.
              </p>
            </article>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold text-[#1A3A63] mb-8">Meet the Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg shadow-sm p-6 flex gap-5 items-start">
                <img src={micahPhoto} alt="Micah Peoples" className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-[#1A3A63]">Micah Peoples</h3>
                  <p className="text-sm text-[#7A0019] mb-2">Co-Founder</p>
                  <p className="text-gray-600 text-sm">10+ years in tech, helping artists, creators, and small businesses navigate tools that actually work for them.</p>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6 flex gap-5 items-start">
                <img src={meganPhoto} alt="Megan Skinner" className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-[#1A3A63]">Megan Skinner</h3>
                  <p className="text-sm text-[#7A0019] mb-2">Co-Founder</p>
                  <p className="text-gray-600 text-sm">10+ years in customer success, leading with emotional intelligence. Brought her expertise to insurance a few years ago and hasn't looked back.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-12 bg-[#1A3A63] text-white rounded-xl p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Ready to get started?</h2>
              <p className="text-gray-200">
                Start your intake from the homepage and we will take it from there.
              </p>
            </div>
            <Link to="/">
              <Button variant="primary" size="lg">Go to Home</Button>
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;
