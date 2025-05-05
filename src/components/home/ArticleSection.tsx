import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ChevronRight } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { mockArticles } from '../../data/mockArticles';

const ArticleSection: React.FC = () => {
  // Select only the first 3 articles to display
  const displayedArticles = mockArticles.slice(0, 3);
  
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
          <div>
            <h2 className="text-3xl font-bold text-[#1A3A63] mb-2">Insurance Education Center</h2>
            <p className="text-lg text-gray-600 max-w-2xl">
              Learn more about insurance coverage, tips for saving, and insights to make informed decisions.
            </p>
          </div>
          <Link to="/education" className="mt-4 md:mt-0">
            <Button variant="outline" className="flex items-center">
              View All Articles <ChevronRight className="ml-1 w-4 h-4" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayedArticles.map((article) => (
            <Card 
              key={article.id} 
              className="h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              elevation="sm"
            >
              <div className="h-48 overflow-hidden">
                <img 
                  src={article.imageUrl} 
                  alt={article.title} 
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="inline-block bg-[#F7B538]/10 text-[#F7B538] text-xs font-medium px-2.5 py-1 rounded">
                    {article.category}
                  </span>
                  <div className="flex items-center text-gray-500 text-sm">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{article.readTime} min read</span>
                  </div>
                </div>
                <h3 className="font-bold text-lg text-[#1A3A63] mb-2 line-clamp-2">{article.title}</h3>
                <p className="text-gray-600 mb-4 line-clamp-3">{article.description}</p>
                <Link to={`/education/${article.id}`} className="text-[#00A6A6] font-medium hover:text-[#008080] inline-flex items-center">
                  Read More <ChevronRight className="ml-1 w-4 h-4" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ArticleSection;