import React from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { useContext } from 'react';
import CourseCard from './CourseCard';

const CoursesSection = () => {
  const { allCourses } = useContext(AppContext);

  if (!allCourses || allCourses.length === 0) {
    return <p>Loading courses...</p>; // Handle loading state
  }

  return (
    <div className='py-16 md:px-40 px-8'>
      <h2 className='text-3xl font-medium text-gray-800'>Learn from the best</h2>
      <p className='text-sm md:text-base text-gray-500 mt-3'>
        Master the art of programming with hands-on coding courses. Learn popular languages like HTML, CSS, JavaScript, Python, and more—through real projects and expert guidance.
      </p>

      <div className='grid grid-cols-auto px-4 md:px-0 md:my-16 my-10 gap-4'>
        {allCourses.slice(0, 4).map((course, index) => (
          <CourseCard key={index} course={course} />
        ))}
      </div>
      <Link to={'/course-list'} onClick={() => scrollTo(0, 0)}>Show all courses</Link>
    </div>
  );
};

export default CoursesSection;