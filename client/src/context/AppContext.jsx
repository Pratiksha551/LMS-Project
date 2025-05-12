import { useState, useEffect, createContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import humanizeDuration from "humanize-duration";
import { useAuth, useUser } from "@clerk/clerk-react";
import axios from "axios";
import { toast } from "react-toastify";

export const AppContext = createContext();

export const AppContextProvider = (props) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const currency = import.meta.env.VITE_CURRENCY;
    const navigate = useNavigate();

    const { getToken } = useAuth();
    const { user } = useUser();

    const [allCourses, setAllCourses] = useState([]);
    const [isEducator, setIsEducator] = useState(false);
    const [enrolledCourses, setEnrolledcourses] = useState([]);
    const [userData, setUserData] = useState(null);

    const fetchAllCourses = useCallback(async () => {
        try {
            const { data } = await axios.get(backendUrl + "/api/course/all");
            if (data.success) {
                setAllCourses(data.courses);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message || "An unexpected error occurred");
        }
    }, [backendUrl]);

    const fetchUserData = useCallback(async () => {
        if (user && user.publicMetadata && user.publicMetadata.role === "educator") {
            setIsEducator(true);
        }
        try {
            const token = await getToken();
            const { data } = await axios.get(backendUrl + "/api/user/data", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.success) {
                setUserData(data.user);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message || "An unexpected error occurred");
        }
    }, [backendUrl, getToken, user]);

    const calculateRatings = (course) => {
        if (!course.courseRatings || course.courseRatings.length === 0) {
            return 0;
        }
        let totalRating = 0;
        course.courseRatings.forEach((rating) => {
            totalRating += rating.rating;
        });
        return Math.floor(totalRating / course.courseRatings.length);
    };

    const calculateChapterTime = (chapter) => {
        let time = 0;
        chapter.chapterContent.forEach((lecture) => {
            time += lecture.lectureDuration;
        });
        return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] });
    };

    const calculateCourseDuration = (course) => {
        let time = 0;
        course.courseContent.forEach((chapter) => {
            chapter.chapterContent.forEach((lecture) => {
                time += lecture.lectureDuration;
            });
        });
        return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] });
    };

    const calculateNumberOfLectures = (course) => {
        let totalLectures = 0;
        course.courseContent.forEach((chapter) => {
            if (Array.isArray(chapter.chapterContent)) {
                totalLectures += chapter.chapterContent.length;
            }
        });
        return totalLectures;
    };

    const fetchUserEnrolledCourses = useCallback(async () => {
        try {
            const token = await getToken();
            const { data } = await axios.get(backendUrl + "/api/user/enrolled-courses", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.success) {
                if (Array.isArray(data.enrolledCourses)) {
                    setEnrolledcourses(data.enrolledCourses.reverse());
                } else {
                    setEnrolledcourses([]);
                }
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message || "An unexpected error occurred");
        }
    }, [backendUrl, getToken]);

    useEffect(() => {
        fetchAllCourses();
    }, [fetchAllCourses]);

    useEffect(() => {
        if (user) {
            fetchUserData();
            fetchUserEnrolledCourses();
        }
    }, [user, fetchUserData, fetchUserEnrolledCourses]);

    const value = {
        currency,
        allCourses,
        navigate,
        calculateRatings,
        isEducator,
        setIsEducator,
        calculateNumberOfLectures,
        calculateCourseDuration,
        calculateChapterTime,
        enrolledCourses,
        fetchUserEnrolledCourses,
        backendUrl,
        userData,
        setUserData,
        getToken,
        fetchAllCourses,
    };

    return <AppContext.Provider value={value}>{props.children}</AppContext.Provider>;
};
