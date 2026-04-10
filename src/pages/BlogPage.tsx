import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ChevronRight } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Card from '../components/common/Card';
import { mockArticles } from '../data/mockArticles';

const BlogPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow bg-gray-50 pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          <section className="max-w-3xl mb-10">
            <h1 className="text-4xl font-bold text-[#1A3A63] mb-3">Insurance Education Center</h1>
            <p className="text-lg text-gray-600">
              Browse practical guides to understand auto insurance coverage, pricing, and claims.
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mockArticles.map((article) => (
              <Card
                key={article.id}
                className="h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                elevation="sm"
              >
                <div className="h-48 overflow-hidden -m-4 mb-0">
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <div className="pt-5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="inline-block bg-[#F7B538]/10 text-[#F7B538] text-xs font-medium px-2.5 py-1 rounded">
                      {article.category}
                    </span>
                    <div className="flex items-center text-gray-500 text-sm">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{article.readTime} min read</span>
                    </div>
                  </div>
                  <h2 className="font-bold text-lg text-[#1A3A63] mb-2 line-clamp-2">{article.title}</h2>
                  <p className="text-gray-600 mb-4 line-clamp-3">{article.description}</p>
                  <Link
                    to={`/blog/${article.id}`}
                    className="text-[#800000] font-medium hover:text-[#600000] inline-flex items-center"
                  >
                    Read Article <ChevronRight className="ml-1 w-4 h-4" />
                  </Link>
                </div>
              </Card>
            ))}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPage;
