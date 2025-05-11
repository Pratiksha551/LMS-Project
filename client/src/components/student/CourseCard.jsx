import React from 'react';
import { assets } from '../../assets/assets';
import { AppContext } from '../../context/AppContext';
import { useContext } from 'react';
import { Link } from 'react-router-dom';

const CourseCard = ({ course }) => {
  const { currency, calculateRatings } = useContext(AppContext);

  if (!course) {
    return null; // Handle missing course prop
  }

  return (
    <Link
      to={'/course/' + course._id}
      onClick={() => window.scrollTo(0, 0)}
      className="border border-gray-500/30 pb-6 overflow-hidden rounded-lg"
    >
      <img
        className="w-full"
        src={course.courseThumbnail || assets.defaultThumbnail}
        alt={course.courseTitle || 'Course Thumbnail'}
      />
      <div className="p-3 text-left">
        <h3 className="text-base font-semibold">{course.courseTitle}</h3>
        <p className="text-gray-500">{course.educator?.name || 'Unknown Educator'}</p>
        <div className="flex items-center space-x-2">
          <p>{calculateRatings(course) || 0}</p>
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <img
                key={i}
                src={i < Math.floor(calculateRatings(course)) ? assets.star : assets.star_blank}
                alt="Star"
                className="w-3.5 h-3.5"
              />
            ))}
          </div>
          <p className="text-gray-500">{course.courseRatings?.length || 0}</p>
        </div>
        <p className="text-base font-semibold text-gray-800">
          {currency}
          {(course.coursePrice - (course.discount * course.coursePrice) / 100).toFixed(2)}
        </p>
      </div>
    </Link>
  );
};

export default CourseCard;