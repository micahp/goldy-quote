import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import StarRating from '../common/StarRating';

interface Testimonial {
  id: number;
  name: string;
  location: string;
  image: string;
  rating: number;
  text: string;
  saved: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Sarah Johnson',
    location: 'Austin, TX',
    image: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=100',
    rating: 5,
    text: 'GoldyQuote helped me find an insurance policy that saved me over $300 a year while providing better coverage than my previous insurer. The comparison tool was so easy to use!',
    saved: '$320/year',
  },
  {
    id: 2,
    name: 'Michael Chen',
    location: 'Seattle, WA',
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100',
    rating: 4.5,
    text: 'As a first-time car owner, I was overwhelmed by all the insurance options. GoldyQuote made it simple to understand what coverage I needed and found me a great rate.',
    saved: '$280/year',
  },
  {
    id: 3,
    name: 'Jessica Miller',
    location: 'Chicago, IL',
    image: 'https://images.pexels.com/photos/3768911/pexels-photo-3768911.jpeg?auto=compress&cs=tinysrgb&w=100',
    rating: 5,
    text: 'After an accident raised my premiums, I thought I was stuck paying high rates. GoldyQuote helped me find a new policy that was even cheaper than what I had before!',
    saved: '$450/year',
  },
  {
    id: 4,
    name: 'David Williams',
    location: 'Atlanta, GA',
    image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100',
    rating: 4,
    text: 'The quote process was quick and painless. I had multiple offers within minutes and was able to easily compare them side by side to find the best deal.',
    saved: '$215/year',
  },
];

const TestimonialsSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (autoplay) {
      interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoplay]);
  
  const handlePrev = () => {
    setAutoplay(false);
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1
    );
  };
  
  const handleNext = () => {
    setAutoplay(false);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };
  
  return (
    <section className="py-16 bg-[#1A3A63]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">What Our Customers Say</h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Join thousands of satisfied customers who have found better insurance at lower rates.
          </p>
        </div>
        
        <div className="relative max-w-4xl mx-auto">
          <div className="overflow-hidden rounded-lg bg-white shadow-xl">
            <div 
              className="flex transition-transform duration-500 ease-in-out" 
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className="min-w-full p-8 md:p-10">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="md:w-1/4 flex flex-col items-center text-center">
                      <img 
                        src={testimonial.image} 
                        alt={testimonial.name} 
                        className="w-20 h-20 rounded-full object-cover mb-4"
                      />
                      <h3 className="font-semibold text-[#1A3A63]">{testimonial.name}</h3>
                      <p className="text-gray-600 text-sm">{testimonial.location}</p>
                      <div className="mt-2">
                        <StarRating rating={testimonial.rating} size="sm" />
                      </div>
                      <div className="mt-4 bg-[#F7B538]/10 text-[#F7B538] font-bold py-1 px-3 rounded-full text-sm">
                        Saved {testimonial.saved}
                      </div>
                    </div>
                    
                    <div className="md:w-3/4">
                      <svg 
                        className="w-10 h-10 text-[#F7B538]/30 mb-4" 
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                      </svg>
                      <p className="text-gray-700 text-lg italic mb-4">{testimonial.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Navigation Controls */}
          <div className="flex justify-center mt-6 space-x-2">
            <button 
              onClick={handlePrev}
              className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors duration-200"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-6 h-6 text-[#1A3A63]" />
            </button>
            <div className="flex items-center space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setAutoplay(false);
                    setCurrentIndex(index);
                  }}
                  className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 ${
                    index === currentIndex ? 'bg-[#F7B538]' : 'bg-white'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
            <button 
              onClick={handleNext}
              className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors duration-200"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-6 h-6 text-[#1A3A63]" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;