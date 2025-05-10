import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const Loading = () => {
  const navigate = useNavigate(); // Correctly initialize navigate
  const { path } = useParams(); // Extract the 'path' parameter from the route

  useEffect(() => {
    if (path) {
      const timer = setTimeout(() => {
        navigate(`/${path}`); // Navigate to the specified path after 5 seconds
      }, 5000);

      return () => clearTimeout(timer); // Cleanup the timer on component unmount
    }
  }, [path, navigate]); // Add dependencies to the useEffect hook

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-16 sm:w-20 aspect-square border-4 border-gray-300 border-t-4 border-t-blue-400 rounded-full animate-spin">
        {/* Loading spinner */}
      </div>
    </div>
  );
};

export default Loading;