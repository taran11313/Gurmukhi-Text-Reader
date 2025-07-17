import React, { useState } from 'react';
import { ResponsiveLayout } from './ResponsiveLayout';
import './ResponsiveDemo.css';

export const ResponsiveDemo: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 100;

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <ResponsiveLayout
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      className="responsive-demo"
    >
      <div className="responsive-demo__header">
        <h1>Responsive Layout Demo</h1>
        <p>Test the responsive behavior across different screen sizes</p>
      </div>

      <div className="responsive-demo__content">
        <div className="responsive-demo__info">
          <h2>Current Page: {currentPage}</h2>
          <p>Total Pages: {totalPages}</p>
        </div>

        <div className="responsive-demo__controls">
          <button 
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="responsive-demo__button"
          >
            Previous
          </button>
          <span className="responsive-demo__page-info">
            {currentPage} / {totalPages}
          </span>
          <button 
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="responsive-demo__button"
          >
            Next
          </button>
        </div>

        <div className="responsive-demo__instructions">
          <h3>Instructions:</h3>
          <ul>
            <li><strong>Mobile:</strong> Swipe left/right to navigate pages</li>
            <li><strong>Tablet/Desktop:</strong> Use the buttons above</li>
            <li><strong>Keyboard:</strong> Use arrow keys for navigation</li>
          </ul>
        </div>

        <div className="responsive-demo__mockup">
          <div className="responsive-demo__page">
            <h3>Page {currentPage}</h3>
            <p>This is a mock page content that demonstrates how the responsive layout adapts to different screen sizes.</p>
            <div className="responsive-demo__placeholder">
              [Page Content Placeholder]
            </div>
          </div>
        </div>
      </div>
    </ResponsiveLayout>
  );
};