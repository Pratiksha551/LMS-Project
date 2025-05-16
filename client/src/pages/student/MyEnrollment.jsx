import React, { useContext, useEffect, useState, useCallback } from 'react';
import { AppContext } from '../../context/AppContext';
import { Line } from 'rc-progress';
import Footer from '../../components/student/Footer';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MyEnrollment = () => {
  const {
    enrolledCourses,
    calculateCourseDuration,
    navigate,
    userData,
    fetchUserEnrolledCourses,
    backendUrl,
    getToken,
    calculateNoOfLectures,
  } = useContext(AppContext);

  const [progressArray, setProgressArray] = useState([]);
  const [isPolling, setIsPolling] = useState(false);

  const getCourseProgress = useCallback(async () => {
    try {
      const token = await getToken();
      const tempProgressArray = await Promise.all(
        enrolledCourses.map(async (course) => {
          const { data } = await axios.post(
            `${backendUrl}/api/user/get-course-progress`,
            { courseId: course._id },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          let totalLectures = calculateNoOfLectures(course);
          const lectureCompleted = data.progressData ? data.progressData.lectureCompleted.length : 0;
          return { totalLectures, lectureCompleted };
        })
      );
      setProgressArray(tempProgressArray);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch course progress');
    }
  }, [enrolledCourses, backendUrl, getToken, calculateNoOfLectures]);

  const pollEnrolledCourses = useCallback(() => {
    if (!isPolling) return;
    fetchUserEnrolledCourses().then(() => {
      setTimeout(pollEnrolledCourses, 5000); // Poll every 5 seconds
    });
  }, [fetchUserEnrolledCourses, isPolling]);

  useEffect(() => {
    if (userData) {
      fetchUserEnrolledCourses();
      setIsPolling(true); // Start polling on mount
    }
    return () => setIsPolling(false); // Stop polling on unmount
  }, [userData, fetchUserEnrolledCourses]);

  useEffect(() => {
    if (enrolledCourses && enrolledCourses.length > 0) {
      getCourseProgress();
    }
  }, [enrolledCourses, getCourseProgress]);

  useEffect(() => {
    if (isPolling) {
      pollEnrolledCourses();
    }
  }, [isPolling, pollEnrolledCourses]);

  return (
    <>
      <div className="md:px-36 px-8 pt-10">
        <h1 className="text-2xl font-semibold">My Enrollments</h1>
        <table className="md:table-auto table-fixed w-full overflow-hidden border mt-10">
          <thead className="text-gray-900 border-b border-gray-500/20 text-sm text-left max-sm:hidden">
            <tr>
              <th className="px-4 py-3 font-semibold truncate">Course</th>
              <th className="px-4 py-3 font-semibold truncate">Duration</th>
              <th className="px-4 py-3 font-semibold truncate">Completed</th>
              <th className="px-4 py-3 font-semibold truncate">Status</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {enrolledCourses && enrolledCourses.length > 0 ? (
              enrolledCourses.map((course, index) => {
                return (
                  <tr key={index} className="border-b border-gray-500/20">
                    <td className="md:px-4 pl-2 md:pl-4 py-3 flex items-center space-x-3">
                      <img src={course.courseThumbnail} alt="thumbnail" className="w-14 sm:w-24 md:w-28" />
                      <div className="flex-1 ">
                        <p className="mb-1 max-sm:text-sm">{course.courseTitle}</p>
                        <Line
                          strokeWidth={2}
                          percent={
                            progressArray[index] && progressArray[index].totalLectures > 0
                              ? (progressArray[index].lectureCompleted * 100) /
                                progressArray[index].totalLectures
                              : 0
                          }
                          className="bg-gray-300 rounded-full"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 max-sm:hidden">{calculateCourseDuration(course)}</td>
                    <td className="px-4 py-3 max-sm:hidden">
                      {progressArray[index]
                        ? `${progressArray[index].lectureCompleted} / ${progressArray[index].totalLectures}`
                        : '0 / 0'}
                      <span> Lectures</span>
                    </td>
                    <td className="px-4 py-3 max-sm:text-right">
                      <button
                        className="px-3 sm:px-5 py-1.5 sm:py-2 bg-blue-600 max-sm:text-xs text-white"
                        onClick={() => navigate('/player/' + course._id)}
                      >
                        {progressArray[index] &&
                        progressArray[index].lectureCompleted /
                          progressArray[index].totalLectures === 1
                          ? 'Completed'
                          : 'On Going'}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-4">
                  No enrolled courses found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Footer />
    </>
  );
};

export default MyEnrollment;