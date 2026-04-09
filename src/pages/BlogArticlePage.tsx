import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { getArticleById, getArticlesByCategory } from '../data/mockArticles';

const articleBodyById: Record<string, string[]> = {
  'article-1': [
    'Most auto policies are built from several coverage types that each solve a different risk.',
    'Liability coverage protects others when you are at fault. Collision and comprehensive coverage help repair your own vehicle after crashes, weather damage, theft, and more.',
    'Understanding how deductibles and limits change your premium helps you choose balanced protection for your budget.'
  ],
  'article-2': [
    'Premiums are not fixed forever. Many drivers can lower costs by adjusting limits, deductibles, and available discounts.',
    'Bundling policies, improving credit where allowed, and maintaining a clean driving record often create meaningful long-term savings.',
    'Review your policy every renewal cycle so your coverage still matches your vehicle and driving habits.'
  ],
  'article-3': [
    'Insurers evaluate many inputs: location, vehicle type, mileage, claim history, and sometimes credit-based factors.',
    'Small differences in annual mileage or garaging address can influence your quoted premium.',
    'Providing accurate application details avoids pricing surprises and helps carriers rate your policy correctly.'
  ],
  'article-4': [
    'New drivers typically face higher rates because insurers have less driving history to evaluate.',
    'Good student discounts, safe-driving courses, and choosing a practical vehicle can help offset first-policy costs.',
    'Careful policy comparison is especially important for households adding a teen driver.'
  ],
  'article-5': [
    'Liability-only coverage usually has a lower premium, but it does not pay to repair your own car after most at-fault accidents.',
    'Full coverage often means liability plus collision and comprehensive, which can be important for newer or financed vehicles.',
    'The best choice depends on vehicle value, loan requirements, and your tolerance for out-of-pocket repairs.'
  ],
  'article-6': [
    'After an accident, prioritize safety first: move to a safe location and call emergency services when needed.',
    'Gather documentation at the scene, including photos, contact details, and insurer information from all involved parties.',
    'Prompt claim reporting and clear documentation can speed resolution and reduce disputes later in the process.'
  ]
};

const BlogArticlePage: React.FC = () => {
  const { articleId } = useParams<{ articleId: string }>();
  const article = articleId ? getArticleById(articleId) : undefined;

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow bg-gray-50 pt-28 pb-16">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            <h1 className="text-3xl font-bold text-[#1A3A63] mb-3">Article Not Found</h1>
            <p className="text-gray-600 mb-6">
              The article you requested does not exist or may have moved.
            </p>
            <Link to="/blog" className="text-[#7A0019] font-medium hover:underline inline-flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to all articles
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const articleParagraphs = articleBodyById[article.id] ?? [article.description];
  const relatedArticles = getArticlesByCategory(article.category).filter(
    (relatedArticle) => relatedArticle.id !== article.id
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow bg-gray-50 pt-28 pb-16">
        <article className="container mx-auto px-4 md:px-6 max-w-4xl">
          <Link to="/blog" className="text-[#7A0019] font-medium hover:underline inline-flex items-center mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to all articles
          </Link>

          <div className="mb-4">
            <span className="inline-block bg-[#F7B538]/10 text-[#F7B538] text-xs font-medium px-2.5 py-1 rounded">
              {article.category}
            </span>
          </div>

          <h1 className="text-4xl font-bold text-[#1A3A63] mb-4">{article.title}</h1>

          <div className="flex items-center text-gray-500 text-sm mb-8">
            <Clock className="w-4 h-4 mr-1" />
            <span>{article.readTime} min read</span>
          </div>

          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-64 md:h-96 object-cover rounded-xl mb-8"
          />

          <div className="space-y-5 text-gray-700 leading-8 text-lg">
            {articleParagraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </article>

        {relatedArticles.length > 0 && (
          <section className="container mx-auto px-4 md:px-6 max-w-4xl mt-16">
            <h2 className="text-2xl font-bold text-[#1A3A63] mb-4">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedArticles.map((relatedArticle) => (
                <Link
                  key={relatedArticle.id}
                  to={`/blog/${relatedArticle.id}`}
                  className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <p className="text-sm text-[#F7B538] font-medium mb-1">{relatedArticle.category}</p>
                  <h3 className="font-semibold text-[#1A3A63]">{relatedArticle.title}</h3>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BlogArticlePage;
